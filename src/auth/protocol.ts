import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export class LoginError extends Error {
  constructor(message: string, readonly status = 400) { super(message); }
}

export function required(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

export function appOrigin() {
  return new URL(required("APP_URL")).origin;
}

export function requireSameOrigin(request: Request) {
  if (request.headers.get("origin") !== appOrigin()) {
    throw new LoginError("Origem inválida.", 403);
  }
}

export function browserCookie() {
  const secure = appOrigin().startsWith("https:");
  return {
    name: secure ? "__Host-az-login" : "az-login",
    options: { httpOnly: true, secure, sameSite: "lax" as const, path: "/", maxAge: 300 },
  };
}

export const newBrowserToken = () => randomBytes(32).toString("base64url");
export const digest = (value: string) => createHash("sha256").update(value, "utf8").digest("hex");
export const browserHash = (token: string | undefined) =>
  token && /^[A-Za-z0-9_-]{43}$/.test(token) ? digest(token) : null;

export type AuthEvent = {
  id: string;
  event: "auth.completed";
  created_at: string;
  session_id: string;
  phone: string;
  phone_verified: true;
};

export function verifyEvent(raw: string, signature: string | null, eventId: string | null,
  secrets: string[], now = Date.now()): AuthEvent {
  if (!secrets.length || secrets.some((secret) => !secret)) throw new Error("Missing webhook secret");
  const match = /^t=(\d{10}),v1=([a-f0-9]{64})$/.exec(signature ?? "");
  if (!match || Math.abs(now / 1000 - Number(match[1])) > 300) {
    throw new LoginError("Assinatura inválida ou expirada.", 401);
  }
  const received = Buffer.from(match[2], "hex");
  const valid = secrets.some((secret) => timingSafeEqual(received,
    createHmac("sha256", secret).update(`${match[1]}.${raw}`, "utf8").digest()));
  if (!valid) throw new LoginError("Assinatura inválida.", 401);
  let event;
  try { event = JSON.parse(raw); } catch { throw new LoginError("JSON inválido."); }
  if (!event || typeof event.id !== "string" || !event.id || event.id.length > 512 ||
    event.id !== eventId || event.event !== "auth.completed" ||
    typeof event.session_id !== "string" || !event.session_id || event.session_id.length > 512 ||
    typeof event.phone !== "string" || !/^\+[1-9]\d{6,14}$/.test(event.phone) ||
    event.phone_verified !== true || typeof event.created_at !== "string" ||
    !Number.isFinite(Date.parse(event.created_at)) || Date.parse(event.created_at) > now + 300_000) {
    throw new LoginError("Evento inválido.");
  }
  return event;
}

export async function createRemoteSession(send: typeof fetch = fetch, now = Date.now()) {
  const origin = new URL(process.env.AZ_BASE_URL || "https://authzapp.com");
  if (origin.protocol !== "https:" && !(origin.protocol === "http:" &&
    ["localhost", "127.0.0.1"].includes(origin.hostname))) throw new Error("Invalid AZ_BASE_URL");
  const response = await send(new URL("/api/v2/auth/sessions", origin), {
    method: "POST", redirect: "error", cache: "no-store", signal: AbortSignal.timeout(10_000),
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ app_key: required("AZ_APP_KEY"), app_secret: required("AZ_APP_SECRET") }),
  });
  if (!response.ok) throw new LoginError(response.status === 429
    ? "Muitas tentativas. Aguarde um minuto." : "Não foi possível iniciar o login. Verifique a configuração do aplicativo.",
    response.status === 429 ? 429 : 502);
  const data = await response.json();
  let authURL: URL;
  try { authURL = new URL(data.auth_url); } catch { throw new LoginError("Resposta inválida do AuthZapp.", 502); }
  const expires = Date.parse(data.expires_at);
  if (typeof data.session_id !== "string" || !data.session_id || data.session_id.length > 512 ||
    authURL.origin !== origin.origin || authURL.username || authURL.password ||
    !Number.isFinite(expires) || expires <= now || expires > now + 330_000) {
    throw new LoginError("Resposta inválida do AuthZapp.", 502);
  }
  let whatsappURL: URL;
  try { whatsappURL = new URL(data.whatsapp_url); } catch { throw new LoginError("AuthZapp não retornou o link do WhatsApp.", 502); }
  if (whatsappURL.origin !== "https://wa.me" || !/^\/[1-9]\d{6,14}$/.test(whatsappURL.pathname) ||
    whatsappURL.username || whatsappURL.password || !whatsappURL.searchParams.get("text")) {
    throw new LoginError("Link do WhatsApp inválido.", 502);
  }
  return { sessionId: data.session_id as string, whatsappURL: whatsappURL.toString(), expiresAt: Math.min(expires, now + 300_000) };
}
