"use client";
import { useEffect, useRef, useState } from "react";
type Challenge = { whatsapp_url: string; qr: string; expires_at: number; created_at: number };
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
  const [now, setNow] = useState(Date.now());
  const started = useRef(false);
  async function start() {
    setBusy(true); setError(""); setExpired(false); setChallenge(null);
    try {
      const data = await api("/api/login", "POST");
      const created_at = Date.now();
      setNow(created_at); setChallenge({ ...data, created_at });
    }
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
    const tick = setInterval(() => setNow(Date.now()), 1000);
    timer = setTimeout(poll, 1500);
    return () => { stopped = true; clearTimeout(timer); clearTimeout(expiry); clearInterval(tick); };
  }, [challenge, phone, expired]);
  async function logout() {
    setBusy(true); setError("");
    try { await api("/api/session", "DELETE"); setPhone(null); await start(); }
    catch { setError("Não foi possível sair. Tente novamente."); setBusy(false); }
  }
  const progress = challenge ? Math.max(0, Math.min(100,
    100 * (now - challenge.created_at) / Math.max(1, challenge.expires_at - challenge.created_at))) : 0;
  return <section>
    <header>
      <span className="badge">exemplo</span>
      <svg className="logo" viewBox="0 0 32 32" fill="none" aria-hidden="true">
        <path d="M0 16C0 7.16344 7.16344 0 16 0C24.8366 0 32 7.16344 32 16C32 24.8366 24.8366 32 16 32H4.0315C1.80496 32 0 30.195 0 27.9685V16Z" fill="#58A316" />
        <path d="M9.5 24V22.0296L16.6098 12.558H9.80183V10H20.2988V11.9704L13.2058 21.442H20.5V24H9.5Z" fill="white" />
      </svg>
      <h1>AuthZapp</h1>
    </header>
    {phone ? <>
      <p role="status">Você entrou com WhatsApp.</p>
      <p className="phone">{phone}</p>
      <button onClick={logout} disabled={busy}>Sair</button>
    </> : <>
      <p className="instructions">Use <span>sua câmera</span> para escanear o QR Code ou<br /><span>clique no botão</span> de login.</p>
      {busy ? <p className="status" role="status">Preparando seu login…</p> :
        expired ? <><p role="status">Este QR Code expirou.</p><button onClick={start}>Gerar novo QR Code</button></> :
        challenge ? <>
          {/* QR generated locally, without sending login tokens to an image service. */}
          <div className="qr-block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="qr" src={challenge.qr} width="480" height="480" alt="QR Code para entrar com WhatsApp" />
            <div className="progress" role="progressbar" aria-label="Tempo de validade do QR Code" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress)}>
              <div style={{ width: `${progress}%` }} />
            </div>
          </div>
          <a className="button" href={challenge.whatsapp_url} target="_blank" rel="noopener noreferrer">
            <svg width="28" height="28" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M19.05 4.91A9.82 9.82 0 0 0 12.04 2c-5.46 0-9.91 4.45-9.91 9.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21c5.46 0 9.91-4.45 9.91-9.91c0-2.65-1.03-5.14-2.9-7.01m-7.01 15.24c-1.48 0-2.93-.4-4.2-1.15l-.3-.18l-3.12.82l.83-3.04l-.2-.31a8.26 8.26 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.24-8.24c2.2 0 4.27.86 5.82 2.42a8.18 8.18 0 0 1 2.41 5.83c.02 4.54-3.68 8.23-8.22 8.23m4.52-6.16c-.25-.12-1.47-.72-1.69-.81c-.23-.08-.39-.12-.56.12c-.17.25-.64.81-.78.97c-.14.17-.29.19-.54.06c-.25-.12-1.05-.39-1.99-1.23c-.74-.66-1.23-1.47-1.38-1.72c-.14-.25-.02-.38.11-.51c.11-.11.25-.29.37-.43s.17-.25.25-.41c.08-.17.04-.31-.02-.43s-.56-1.34-.76-1.84c-.2-.48-.41-.42-.56-.43h-.48c-.17 0-.43.06-.66.31c-.22.25-.86.85-.86 2.07s.89 2.4 1.01 2.56c.12.17 1.75 2.67 4.23 3.74c.59.26 1.05.41 1.41.52c.59.19 1.13.16 1.56.1c.48-.07 1.47-.6 1.67-1.18c.21-.58.21-1.07.14-1.18s-.22-.16-.47-.28" /></svg>
            Login com WhatsApp
          </a>
          <p className="note">Após confirmar seu login no WhatsApp, esta tela será atualizada automaticamente.</p>
        </> : <button onClick={start}>Tentar novamente</button>}
    </>}
    {error && <p role="alert">{error}</p>}
  </section>;
}
