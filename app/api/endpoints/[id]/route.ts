import { NextRequest, NextResponse } from 'next/server';
import { getSql } from '@/lib/db';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sql = getSql();
    const { id } = params;

    const rows = await sql`SELECT * FROM endpoints WHERE id = ${id}`;
    if (rows.length === 0) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const endpoint = rows[0];
    const { status, body, headers } = await request.json();

    if (status !== undefined) endpoint.responsestatus = status;
    if (body !== undefined) endpoint.responsebody = body;
    if (headers !== undefined) endpoint.responseheaders = JSON.stringify(headers);

    await sql`UPDATE endpoints SET responsestatus = ${endpoint.responsestatus}, responsebody = ${endpoint.responsebody}, responseheaders = ${endpoint.responseheaders} WHERE id = ${id}`;

    return NextResponse.json({
      ...endpoint,
      responseHeaders: JSON.parse(endpoint.responseheaders)
    });
  } catch (error) {
    console.error('Error updating endpoint:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sql = getSql();
    const { id } = params;

    await sql`DELETE FROM endpoints WHERE id = ${id}`;
    await sql`DELETE FROM requests WHERE endpointid = ${id}`;

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Error deleting endpoint:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}