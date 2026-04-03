import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { getSql } from '@/lib/db';

async function handler(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const sql = getSql();
    const { id } = params;

    const rows = await sql`SELECT * FROM endpoints WHERE id = ${id}`;

    if (rows.length === 0) {
      return new NextResponse("Webhook endpoint not found.", { status: 404 });
    }

    const endpoint = rows[0];

    const now = new Date();
    if (now > new Date(endpoint.expiresat)) {
      return new NextResponse("Webhook endpoint has expired.", { status: 410 });
    }

    // Get request body as text
    const body = await request.text();

    const requestId = uuidv4();
    const capturedRequest = {
      id: requestId,
      endpointId: id,
      method: request.method,
      headers: JSON.stringify(Object.fromEntries(request.headers.entries())),
      body: body,
      query: JSON.stringify(Object.fromEntries(new URL(request.url).searchParams.entries())),
      timestamp: new Date().toISOString(),
      ip: request.headers.get('x-forwarded-for') ||
          request.headers.get('x-real-ip') ||
          'unknown',
    };

    await sql`INSERT INTO requests (id, endpointid, method, headers, body, query, timestamp, ip) VALUES (${capturedRequest.id}, ${capturedRequest.endpointId}, ${capturedRequest.method}, ${capturedRequest.headers}, ${capturedRequest.body}, ${capturedRequest.query}, ${capturedRequest.timestamp}, ${capturedRequest.ip})`;

    // Keep requests limit to 100 per endpoint
    await sql`DELETE FROM requests WHERE id IN (SELECT id FROM requests WHERE endpointid = ${id} ORDER BY timestamp DESC OFFSET 100)`;

    // Send custom response
    const headers = JSON.parse(endpoint.responseheaders || '{}');
    const response = new NextResponse(endpoint.responsebody, {
      status: endpoint.responsestatus
    });

    // Set custom headers
    Object.entries(headers).forEach(([key, value]) => {
      response.headers.set(key, value as string);
    });

    return response;
  } catch (error) {
    console.error('Error handling webhook:', error);
    return new NextResponse("Internal server error", { status: 500 });
  }
}

export async function GET(request: NextRequest, context: { params: { id: string } }) {
  return handler(request, context);
}

export async function POST(request: NextRequest, context: { params: { id: string } }) {
  return handler(request, context);
}

export async function PUT(request: NextRequest, context: { params: { id: string } }) {
  return handler(request, context);
}

export async function DELETE(request: NextRequest, context: { params: { id: string } }) {
  return handler(request, context);
}

export async function PATCH(request: NextRequest, context: { params: { id: string } }) {
  return handler(request, context);
}

export async function HEAD(request: NextRequest, context: { params: { id: string } }) {
  return handler(request, context);
}

export async function OPTIONS(request: NextRequest, context: { params: { id: string } }) {
  return handler(request, context);
}