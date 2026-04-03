import { NextResponse } from 'next/server';
import { getSql } from '@/lib/db';

export async function GET() {
  try {
    // Try to initialize database tables if they don't exist
    const sql = getSql();
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

    return NextResponse.json({ status: "ok", database: "initialized" });
  } catch (error) {
    console.error('Database initialization error:', error);
    return NextResponse.json({ status: "error", message: "Database initialization failed" }, { status: 500 });
  }
}