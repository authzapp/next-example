import { cookies } from "next/headers";
import QRCode from "qrcode";
import { loginStore } from "@/auth/database";
import { browserCookie, browserHash, createRemoteSession, digest, newBrowserToken, requireSameOrigin } from "@/auth/protocol";
import { json, loginError } from "@/auth/http";
export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    const remote = await createRemoteSession();
    const token = newBrowserToken();
    await loginStore().create(remote.sessionId, digest(token), remote.expiresAt);
    const cookie = browserCookie();
    (await cookies()).set(cookie.name, token, cookie.options);
    return json({ whatsapp_url: remote.whatsappURL, expires_at: remote.expiresAt,
      qr: await QRCode.toDataURL(remote.whatsappURL, { width: 480, margin: 2, errorCorrectionLevel: "M" }) });
  } catch (error) { return loginError(error); }
}
export async function GET() {
  try {
    const hash = browserHash((await cookies()).get(browserCookie().name)?.value);
    return json({ state: hash ? await loginStore().status(hash) : "expired" });
  } catch (error) { return loginError(error); }
}
