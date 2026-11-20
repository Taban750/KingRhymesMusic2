import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required");
}

const globalForDb = globalThis as typeof globalThis & {
  __kingRhymesPostgresqlPool?: Pool;
};

export const pool =
  globalForDb.__kingRhymesPostgresqlPool ??
  new Pool({
    connectionString: databaseUrl,
    // Vercel can create many short-lived serverless instances. Keep each
    // instance to one connection and use Supabase's transaction pooler URL.
    max: process.env.NODE_ENV === "production" ? 1 : 5,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
    keepAlive: true,
    ssl: { rejectUnauthorized: true },
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.__kingRhymesPostgresqlPool = pool;
}

export const db = drizzle(pool);
