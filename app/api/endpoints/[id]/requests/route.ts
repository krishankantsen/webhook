import { NextRequest, NextResponse } from 'next/server';
import { getSql } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sql = getSql();
    const { id } = params;
    const userId = request.headers.get('x-user-id') || 'anonymous';

    const endpointRows = await sql`SELECT owner FROM endpoints WHERE id = ${id}`;
    if (endpointRows.length === 0) {
      return NextResponse.json({ error: 'Endpoint not found' }, { status: 404 });
    }

    if (endpointRows[0].owner !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const rows = await sql`SELECT * FROM requests WHERE endpointid = ${id} ORDER BY timestamp DESC LIMIT 100`;
    const requests = rows.map((row: any) => {
      let headers = {};
      let query = {};
      try {
        headers = JSON.parse(row.headers || '{}');
      } catch {
        headers = {};
      }
      try {
        query = JSON.parse(row.query || '{}');
      } catch {
        query = {};
      }

      return {
        id: row.id,
        endpointId: row.endpointid,
        method: row.method,
        headers,
        body: row.body,
        query,
        timestamp: row.timestamp,
        ip: row.ip
      };
    });

    return NextResponse.json(requests);
  } catch (error) {
    console.error('Error fetching requests:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}