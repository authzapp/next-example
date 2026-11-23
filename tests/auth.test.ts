import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { PGlite } from "@electric-sql/pglite";
import type { Pool } from "pg";
import { browserHash, createRemoteSession, digest, requireSameOrigin, verifyEvent, type AuthEvent } from "../src/auth/protocol";
import { createSession, readSession } from "../src/auth/session";
import { LoginStore } from "../src/auth/store";
import { readWebhookBody } from "../src/auth/http";

process.env.APP_URL = "https://example.authzapp.com";
process.env.AUTH_SECRET = "test-session-secret-with-more-than-32-characters";
const secret = "test-webhook-secret";
function event(session = "request-1", id = "event-1"): AuthEvent {
  return { id, event: "auth.completed", created_at: new Date().toISOString(), session_id: session,
    phone: "+5511999990000", phone_verified: true };
}
function signature(raw: string, time = Math.floor(Date.now() / 1000)) {
  return `t=${time},v1=${createHmac("sha256", secret).update(`${time}.${raw}`).digest("hex")}`;
}
test("webhook requires authentic raw bytes, matching event ID and a fresh signature", () => {
  const e = event(); const raw = JSON.stringify(e);
  assert.deepEqual(verifyEvent(raw, signature(raw), e.id, [secret]), e);
  assert.throws(() => verifyEvent(raw + " ", signature(raw), e.id, [secret]));
  assert.throws(() => verifyEvent(raw, signature(raw), "other", [secret]));
  assert.throws(() => verifyEvent(raw, signature(raw, Math.floor(Date.now()/1000)-301), e.id, [secret]));
  assert.throws(() => verifyEvent(raw, signature(raw, Math.floor(Date.now()/1000)+301), e.id, [secret]));
  for (const change of [{ phone_verified: false }, { phone: "unverified" }, { event: "other" }]) {
    const invalid = JSON.stringify({ ...e, ...change });
    assert.throws(() => verifyEvent(invalid, signature(invalid), e.id, [secret]));
  }
});
test("session cookies reject tampering and expire", () => {
  const now = Date.now(); const token = createSession("+5511999990000", now);
  assert.equal(readSession(token, now), "+5511999990000");
  assert.equal(readSession(token, now + 8*60*60*1000), null);
  assert.equal(readSession("x" + token, now), null);
  assert.equal(readSession(token + ".extra", now), null);
  assert.equal(browserHash("attacker"), null);
});
test("browser mutations require the configured same origin", () => {
  assert.doesNotThrow(() => requireSameOrigin(new Request("https://example.authzapp.com", {headers:{origin:process.env.APP_URL!}})));
  assert.throws(() => requireSameOrigin(new Request("https://example.authzapp.com")));
  assert.throws(() => requireSameOrigin(new Request("https://example.authzapp.com", {headers:{origin:"https://attacker.example"}})));
});
test("webhook body size is bounded before parsing", async () => {
  await assert.rejects(readWebhookBody(new Request("https://example.test", {method:"POST",body:"x".repeat(16_385)})));
});
test("remote creation uses the external API and validates the WhatsApp destination", async () => {
  process.env.AZ_APP_KEY = "test.example"; process.env.AZ_APP_SECRET = "test-only";
  const data = {session_id:"remote",auth_url:"https://authzapp.com/authenticate/view",expires_at:new Date(Date.now()+300_000).toISOString(),whatsapp_url:"https://wa.me/5511999990000?text=test"};
  const send: typeof fetch = async (url, init) => {
    assert.equal(String(url), "https://authzapp.com/api/v2/auth/sessions");
    assert.equal(init?.method, "POST"); assert.equal(init?.redirect, "error");
    return Response.json(data, {status:201});
  };
  assert.equal((await createRemoteSession(send)).sessionId,"remote");
  data.whatsapp_url = "https://attacker.example/?text=test";
  await assert.rejects(createRemoteSession(send));
});
test("PostgreSQL bridge: binding, duplicates, conflicts, concurrency and expiry", async () => {
  const db = new PGlite();
  await db.exec(readFileSync(new URL("../migrations/001_login.sql", import.meta.url), "utf8"));
  const store = new LoginStore(db as unknown as Pick<Pool,"query">);
  try {
    const hash = digest("correct-browser");
    await store.create("request-1", hash, Date.now()+300_000);
    assert.equal(await store.status(hash),"pending");
    assert.equal(await store.consume(hash),undefined);
    const e = event(); const raw = JSON.stringify(e);
    await store.complete(e,raw);
    await store.complete(e,raw);
    assert.equal(await store.status(hash),"completed");
    assert.equal(await store.consume(digest("wrong-browser")),undefined);
    await assert.rejects(store.complete({...e,phone:"+5511888880000"}, JSON.stringify({...e,phone:"+5511888880000"})));
    const claims = await Promise.all([store.consume(hash),store.consume(hash)]);
    assert.equal(claims.filter(Boolean).length,1);
    await store.complete(e,raw);
    assert.equal(await store.consume(hash),undefined);
    assert.equal(await store.status(hash),"expired");
    await assert.rejects(store.complete(event("unknown","unknown-event"),JSON.stringify(event("unknown","unknown-event"))));
    await store.create("expired",digest("expired"),Date.now()-1000);
    const late = event("expired","late"); await store.complete(late,JSON.stringify(late));
    assert.equal(await store.consume(digest("expired")),undefined);
    await store.create("future",digest("future"),Date.now()+300_000);
    const future = {...event("future","future-event"),created_at:new Date(Date.now()+400_000).toISOString()};
    await assert.rejects(store.complete(future,JSON.stringify(future)));
    await store.create("same-event",digest("same-event"),Date.now()+300_000);
    await assert.rejects(store.complete({...e,session_id:"same-event"},JSON.stringify({...e,session_id:"same-event"})));
    // Replaying after automatic cleanup cannot recreate a browser login.
    await db.query("DELETE FROM officeup_logins WHERE session_id=$1",[e.session_id]);
    await assert.rejects(store.complete(e,raw));
  } finally { await db.close(); }
});
