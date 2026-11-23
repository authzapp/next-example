import { cookies } from "next/headers";
import { loginStore } from "@/auth/database";
import { browserCookie, browserHash, LoginError, requireSameOrigin } from "@/auth/protocol";
import { createSession, sessionCookie } from "@/auth/session";
import { json, loginError } from "@/auth/http";
export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    const jar = await cookies();
    const login = browserCookie();
    const hash = browserHash(jar.get(login.name)?.value);
    if (!hash) throw new LoginError("Inicie um novo login.", 401);
    // Validate signing configuration before the one-time database write.
    createSession("+10000000000");
    const phone = await loginStore().consume(hash);
    if (!phone) throw new LoginError("Login ainda não confirmado ou expirado.", 409);
    const session = sessionCookie();
    jar.set(session.name, createSession(phone), session.options);
    jar.set(login.name, "", { ...login.options, maxAge: 0 });
    return json({ phone });
  } catch (error) { return loginError(error); }
}
export async function DELETE(request: Request) {
  try {
    requireSameOrigin(request);
    const jar = await cookies();
    for (const cookie of [sessionCookie(), browserCookie()]) jar.set(cookie.name, "", { ...cookie.options, maxAge: 0 });
    return json({ ok: true });
  } catch (error) { return loginError(error); }
}
