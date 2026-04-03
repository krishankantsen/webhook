import { neon } from "@neondatabase/serverless";

// Lazy initialization of database connection
let sqlInstance: any = null;

export function getSql() {
  if (!sqlInstance) {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL environment variable is required. Please set it to your Neon database connection string.");
    }
    sqlInstance = neon(process.env.DATABASE_URL);
  }
  return sqlInstance;
}

// Initialize database tables - only call this when needed
export async function initDatabase() {
  const db = getSql();
  await db(`
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

  await db(`
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