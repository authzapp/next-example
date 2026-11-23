import { Pool } from "pg";
import { attachDatabasePool } from "@vercel/functions";
import { required } from "./protocol";
import { LoginStore } from "./store";

let pool: Pool | undefined;
export function loginStore() {
  if (!pool) {
    pool = new Pool({ connectionString: required("DATABASE_URL"), max: 3,
      idleTimeoutMillis: 5_000, connectionTimeoutMillis: 5_000 });
    // Keep idle connections from surviving suspended Vercel function instances.
    attachDatabasePool(pool);
    pool.on("error", () => console.error("AuthZapp database connection failed"));
  }
  return new LoginStore(pool);
}
