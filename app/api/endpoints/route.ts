import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { sql } from '@/lib/db';
import { initDatabase } from '@/lib/db';

// Initialize database on first request
let dbInitialized = false;

async function ensureDbInitialized() {
  if (!dbInitialized) {
    await initDatabase();
    dbInitialized = true;
  }
}

export async function GET() {
  try {
    await ensureDbInitialized();
    const { rows } = await sql`SELECT * FROM endpoints ORDER BY createdat DESC`;
    const endpoints = rows.map((row: any) => ({
      ...row,
      responseHeaders: JSON.parse(row.responseheaders || '{}')
    }));
    return NextResponse.json(endpoints);
  } catch (error) {
    console.error('Error fetching endpoints:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await ensureDbInitialized();
    const { name, status, body, headers } = await request.json();

    const id = uuidv4().split('-')[0];
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    const newEndpoint = {
      id,
      name: name || 'Unnamed Endpoint',
      responseStatus: status || 200,
      responseBody: body || 'OK',
      responseHeaders: JSON.stringify(headers || {}),
      createdAt: new Date().toISOString(),
      expiresAt: expiresAt.toISOString()
    };

    await sql`INSERT INTO endpoints (id, name, responsestatus, responsebody, responseheaders, createdat, expiresat) VALUES (${newEndpoint.id}, ${newEndpoint.name}, ${newEndpoint.responseStatus}, ${newEndpoint.responseBody}, ${newEndpoint.responseHeaders}, ${newEndpoint.createdAt}, ${newEndpoint.expiresAt})`;

    return NextResponse.json({
      ...newEndpoint,
      responseHeaders: JSON.parse(newEndpoint.responseHeaders)
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating endpoint:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}