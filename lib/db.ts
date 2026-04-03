import { neon } from "@neondatabase/serverless";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is required. Please set it to your Neon database connection string.");
}

export const sql = neon(process.env.DATABASE_URL);

// Initialize database tables
export async function initDatabase() {
  await sql(`
    CREATE TABLE IF NOT EXISTS endpoints (
      id TEXT PRIMARY KEY,
      name TEXT,
      responsestatus INTEGER,
      responsebody TEXT,
      responseheaders TEXT,
      createdat TEXT,
      expiresat TEXT
    );
  `);

  await sql(`
    CREATE TABLE IF NOT EXISTS requests (
      id TEXT PRIMARY KEY,
      endpointid TEXT,
      method TEXT,
      headers TEXT,
      body TEXT,
      query TEXT,
      timestamp TEXT,
      ip TEXT,
      FOREIGN KEY(endpointid) REFERENCES endpoints(id) ON DELETE CASCADE
    );
  `);
}