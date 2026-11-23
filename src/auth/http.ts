import { LoginError } from "./protocol";

export const json = (body: unknown, status = 200) => Response.json(body, {
  status, headers: { "Cache-Control": "no-store" },
});

export function loginError(error: unknown) {
  // Never return upstream responses, connection strings or signing secrets.
  if (error instanceof LoginError) return json({ error: error.message }, error.status);
  console.error("AuthZapp login operation failed; check server configuration and database availability");
  return json({ error: "Login indisponível. Tente novamente em instantes." }, 503);
}

export async function readWebhookBody(request: Request) {
  const reader = request.body?.getReader();
  if (!reader) throw new LoginError("Corpo vazio.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 16_384) {
        await reader.cancel();
        throw new LoginError("Corpo muito grande.", 413);
      }
      chunks.push(value);
    }
    return new TextDecoder("utf-8", { fatal: true }).decode(Buffer.concat(chunks));
  } finally { reader.releaseLock(); }
}
