import type { Pool } from "pg";
import { digest, LoginError, type AuthEvent } from "./protocol";
export class LoginStore {
  constructor(private readonly pool: Pick<Pool, "query">) {}
  async create(sessionId: string, browserHash: string, expiresAt: number) {
    // Temporary bridge only: no users table, profile or persistent phone history.
    await this.pool.query("DELETE FROM officeup_logins WHERE expires_at < clock_timestamp() - interval '1 day'");
    await this.pool.query(`INSERT INTO officeup_logins(session_id,browser_hash,expires_at)
      VALUES ($1,$2,$3)`, [sessionId, browserHash, new Date(expiresAt)]);
  }
  async status(browserHash: string) {
    const { rows } = await this.pool.query(`SELECT
      CASE WHEN expires_at <= clock_timestamp() OR consumed_at IS NOT NULL THEN 'expired'
      WHEN event_id IS NOT NULL THEN 'completed' ELSE 'pending' END AS state
      FROM officeup_logins WHERE browser_hash=$1`, [browserHash]);
    return rows[0]?.state ?? "expired";
  }
  async complete(event: AuthEvent, raw: string) {
    const hash = digest(raw);
    await this.pool.query(`UPDATE officeup_logins SET event_id=$2,payload_hash=$3,phone=$4
      WHERE session_id=$1 AND event_id IS NULL AND consumed_at IS NULL
      AND expires_at > clock_timestamp() AND $5::timestamptz < expires_at
      AND $5::timestamptz >= created_at - interval '30 seconds'`,
    [event.session_id, event.id, hash, event.phone, event.created_at]);
    const { rows } = await this.pool.query(`SELECT event_id,payload_hash,
      expires_at <= clock_timestamp() AS expired FROM officeup_logins WHERE session_id=$1`, [event.session_id]);
    const row = rows[0];
    if (!row) throw new LoginError("Sessão desconhecida.", 409);
    if (row.event_id === event.id && row.payload_hash === hash) return;
    if (!row.event_id && row.expired) return;
    throw new LoginError("Evento conflitante ou fora do prazo.", 409);
  }
  async consume(browserHash: string) {
    // The database arbitrates concurrent polls: exactly one can consume the login.
    const { rows } = await this.pool.query(`UPDATE officeup_logins SET consumed_at=clock_timestamp()
      WHERE browser_hash=$1 AND event_id IS NOT NULL AND consumed_at IS NULL
      AND expires_at > clock_timestamp() RETURNING phone`, [browserHash]);
    return rows[0]?.phone as string | undefined;
  }
}
