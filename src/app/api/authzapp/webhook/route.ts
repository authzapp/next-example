import { loginStore } from "@/auth/database";
import { required, verifyEvent } from "@/auth/protocol";
import { json, loginError, readWebhookBody } from "@/auth/http";
export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    const raw = await readWebhookBody(request);
    const event = verifyEvent(raw, request.headers.get("x-authzapp-signature"),
      request.headers.get("x-authzapp-event-id"), [required("AZ_WEBHOOK_SECRET")]);
    await loginStore().complete(event, raw);
    return json({ received: true });
  } catch (error) { return loginError(error); }
}
