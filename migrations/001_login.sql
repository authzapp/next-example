CREATE TABLE IF NOT EXISTS officeup_logins (
  session_id text PRIMARY KEY,
  browser_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  event_id text UNIQUE,
  payload_hash text,
  phone text,
  consumed_at timestamptz,
  CHECK ((event_id IS NULL) = (payload_hash IS NULL)),
  CHECK (phone IS NULL OR phone ~ '^\+[1-9][0-9]{6,14}$')
);
CREATE INDEX IF NOT EXISTS officeup_logins_expiry ON officeup_logins(expires_at);
