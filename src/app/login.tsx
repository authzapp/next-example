"use client";
import { useEffect, useRef, useState } from "react";
type Challenge = { whatsapp_url: string; qr: string; expires_at: number };
async function api(url: string, method = "GET") {
  const response = await fetch(url, { method, cache: "no-store" });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error || "Não foi possível conectar. Tente novamente.");
  return body;
}
export function Login({ initialPhone }: { initialPhone: string | null }) {
  const [phone, setPhone] = useState(initialPhone);
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [busy, setBusy] = useState(!initialPhone);
  const [error, setError] = useState("");
  const [expired, setExpired] = useState(false);
  const started = useRef(false);
  async function start() {
    setBusy(true); setError(""); setExpired(false); setChallenge(null);
    try { setChallenge(await api("/api/login", "POST")); }
    catch (e) { setError(e instanceof Error ? e.message : "Não foi possível iniciar o login."); }
    finally { setBusy(false); }
  }
  useEffect(() => {
    if (!initialPhone && !started.current) { started.current = true; void start(); }
  }, [initialPhone]);
  useEffect(() => {
    if (!challenge || phone || expired) return;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    let failures = 0;
    async function poll() {
      if (stopped) return;
      if (Date.now() >= challenge!.expires_at) { setExpired(true); return; }
      try {
        const result = await api("/api/login");
        if (stopped) return;
        if (result.state === "completed") {
          const session = await api("/api/session", "POST");
          if (!stopped) { setPhone(session.phone); setChallenge(null); setError(""); }
          return;
        }
        if (result.state === "expired") { setExpired(true); return; }
        failures = 0; setError("");
      } catch {
        if (stopped) return;
        if (++failures >= 3) setError("Conexão interrompida. Tentando novamente…");
      }
      timer = setTimeout(poll, 2000);
    }
    const expiry = setTimeout(() => setExpired(true), Math.max(0, challenge.expires_at - Date.now()));
    timer = setTimeout(poll, 1500);
    return () => { stopped = true; clearTimeout(timer); clearTimeout(expiry); };
  }, [challenge, phone, expired]);
  async function logout() {
    setBusy(true); setError("");
    try { await api("/api/session", "DELETE"); setPhone(null); await start(); }
    catch { setError("Não foi possível sair. Tente novamente."); setBusy(false); }
  }
  return <section>
    <h1>Exemplo AuthZapp</h1>
    {phone ? <>
      <p role="status">Você entrou com WhatsApp.</p>
      <p className="phone">{phone}</p>
      <button onClick={logout} disabled={busy}>Sair</button>
    </> : <>
      <p>Escaneie o QR Code ou abra o WhatsApp para entrar.</p>
      {busy ? <p className="status" role="status">Preparando seu login…</p> :
        expired ? <><p role="status">Este QR Code expirou.</p><button onClick={start}>Gerar novo QR Code</button></> :
        challenge ? <>
          {/* QR generated locally, without sending login tokens to an image service. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="qr" src={challenge.qr} width="240" height="240" alt="QR Code para entrar com WhatsApp" />
          <a className="button" href={challenge.whatsapp_url} target="_blank" rel="noopener noreferrer">Entrar com WhatsApp</a>
          <p className="note">Envie a mensagem e, se solicitado, compartilhe seu telefone. Esta tela entra automaticamente.</p>
        </> : <button onClick={start}>Tentar novamente</button>}
    </>}
    {error && <p role="alert">{error}</p>}
    <footer>Login com <a href="https://authzapp.com" target="_blank" rel="noreferrer">AuthZapp</a></footer>
  </section>;
}
