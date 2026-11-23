import { createHmac, timingSafeEqual } from "node:crypto";
import { browserCookie, required } from "./protocol";
const duration = 60 * 60 * 8;
export function sessionCookie() {
  const { options } = browserCookie();
  return { name: options.secure ? "__Host-officeup" : "officeup", options: { ...options, maxAge: duration } };
}
function sign(payload: string) {
  const secret = required("AUTH_SECRET");
  if (secret.length < 32) throw new Error("AUTH_SECRET must have at least 32 characters");
  return createHmac("sha256", secret).update(payload).digest();
}
export function createSession(phone: string, now = Date.now()) {
  const payload = Buffer.from(JSON.stringify({ phone, exp: Math.floor(now / 1000) + duration })).toString("base64url");
  return `${payload}.${sign(payload).toString("base64url")}`;
}
export function readSession(token: string | undefined, now = Date.now()): string | null {
  if (!token || token.length > 1024) return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const expected = sign(parts[0]);
  const actual = Buffer.from(parts[1], "base64url");
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;
  try {
    const data = JSON.parse(Buffer.from(parts[0], "base64url").toString("utf8"));
    return typeof data.phone === "string" && /^\+[1-9]\d{6,14}$/.test(data.phone) &&
      Number.isSafeInteger(data.exp) && data.exp > now / 1000 && data.exp <= now / 1000 + duration ? data.phone : null;
  } catch { return null; }
}
