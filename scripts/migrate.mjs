import { readFileSync } from "node:fs";
import pg from "pg";
if (!process.env.DATABASE_URL) throw new Error("Configure DATABASE_URL antes da migração.");
const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
try {
  await client.connect();
  await client.query(readFileSync(new URL("../migrations/001_login.sql", import.meta.url), "utf8"));
  console.log("Schema mínimo do OfficeUp aplicado.");
} finally { await client.end(); }
