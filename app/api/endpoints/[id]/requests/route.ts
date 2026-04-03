import { NextRequest, NextResponse } from 'next/server';
import { getSql } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sql = getSql();
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