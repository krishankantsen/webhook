import { NextRequest, NextResponse } from 'next/server';
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

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await ensureDbInitialized();
    const { id } = params;

    const rows = await sql`SELECT * FROM requests WHERE endpointid = ${id} ORDER BY timestamp DESC LIMIT 100`;
    const requests = rows.map((row: any) => ({
      ...row,
      headers: JSON.parse(row.headers || '{}'),
      query: JSON.parse(row.query || '{}')
    }));

    return NextResponse.json(requests);
  } catch (error) {
    console.error('Error fetching requests:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}