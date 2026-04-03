import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { getSql } from '@/lib/db';

const normalizeEndpoint = (row: any) => ({
  id: row.id,
  name: row.name,
  responseStatus: row.responsestatus,
  responseBody: row.responsebody,
  responseHeaders: JSON.parse(row.responseheaders || '{}'),
  createdAt: row.createdat,
  expiresAt: row.expiresat,
  owner: row.owner
});

export async function GET(request: NextRequest) {
  try {
    const sql = getSql();
    const userId = request.headers.get('x-user-id') || 'anonymous';
    const rows = await sql`SELECT * FROM endpoints WHERE owner = ${userId} ORDER BY createdat DESC`;
    const endpoints = rows.map((row: any) => normalizeEndpoint(row));
    return NextResponse.json(endpoints || []);
  } catch (error) {
    console.error('Error fetching endpoints:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const sql = getSql();
    const userId = request.headers.get('x-user-id') || 'anonymous';
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
      expiresAt: expiresAt.toISOString(),
      owner: userId
    };

    await sql`INSERT INTO endpoints (id, name, responsestatus, responsebody, responseheaders, createdat, expiresat, owner) VALUES (${newEndpoint.id}, ${newEndpoint.name}, ${newEndpoint.responseStatus}, ${newEndpoint.responseBody}, ${newEndpoint.responseHeaders}, ${newEndpoint.createdAt}, ${newEndpoint.expiresAt}, ${newEndpoint.owner})`;

    return NextResponse.json(normalizeEndpoint({
      ...newEndpoint,
      responseheaders: newEndpoint.responseHeaders,
      responsestatus: newEndpoint.responseStatus,
      responsebody: newEndpoint.responseBody,
      createdat: newEndpoint.createdAt,
      expiresat: newEndpoint.expiresAt
    }), { status: 201 });
  } catch (error) {
    console.error('Error creating endpoint:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}