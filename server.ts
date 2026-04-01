import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import cors from "cors";
import bodyParser from "body-parser";
import { v4 as uuidv4 } from "uuid";
import { neon } from "@neondatabase/serverless";

// Database Setup
const sql = neon(process.env.DATABASE_URL!);

await sql`
  CREATE TABLE IF NOT EXISTS endpoints (
    id TEXT PRIMARY KEY,
    name TEXT,
    responseStatus INTEGER,
    responseBody TEXT,
    responseHeaders TEXT,
    createdAt TEXT,
    expiresAt TEXT
  );
`;

await sql`
  CREATE TABLE IF NOT EXISTS requests (
    id TEXT PRIMARY KEY,
    endpointId TEXT,
    method TEXT,
    headers TEXT,
    body TEXT,
    query TEXT,
    timestamp TEXT,
    ip TEXT,
    FOREIGN KEY(endpointId) REFERENCES endpoints(id) ON DELETE CASCADE
  );
`;

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json()); // For regular API calls
  app.use(bodyParser.text({ type: "text/*" })); 
  app.use(bodyParser.urlencoded({ extended: true }));

  // API Endpoints for Frontend
  app.get("/api/endpoints", async (req, res) => {
    const { rows } = await sql`SELECT * FROM endpoints ORDER BY createdAt DESC`;
    const endpoints = rows.map((row: any) => ({
      ...row,
      responseHeaders: JSON.parse(row.responseheaders || '{}')
    }));
    res.json(endpoints);
  });

  app.post("/api/endpoints", async (req, res) => {
    const { name, status, body, headers } = req.body;
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

    await sql`
      INSERT INTO endpoints (id, name, responsestatus, responsebody, responseheaders, createdat, expiresat)
      VALUES (${newEndpoint.id}, ${newEndpoint.name}, ${newEndpoint.responseStatus}, ${newEndpoint.responseBody}, ${newEndpoint.responseHeaders}, ${newEndpoint.createdAt}, ${newEndpoint.expiresAt})
    `;

    res.status(201).json({
      ...newEndpoint,
      responseHeaders: JSON.parse(newEndpoint.responseHeaders)
    });
  });

  app.patch("/api/endpoints/:id", async (req, res) => {
    const { id } = req.params;
    
    const { rows } = await sql`SELECT * FROM endpoints WHERE id = ${id}`;
    if (rows.length === 0) return res.status(404).send("Not found");

    const endpoint = rows[0];

    const { status, body, headers } = req.body;
    
    if (status !== undefined) endpoint.responsestatus = status;
    if (body !== undefined) endpoint.responsebody = body;
    if (headers !== undefined) endpoint.responseheaders = JSON.stringify(headers);

    await sql`
      UPDATE endpoints 
      SET responsestatus = ${endpoint.responsestatus}, responsebody = ${endpoint.responsebody}, responseheaders = ${endpoint.responseheaders}
      WHERE id = ${id}
    `;

    res.json({
      ...endpoint,
      responseHeaders: JSON.parse(endpoint.responseheaders)
    });
  });

  app.delete("/api/endpoints/:id", async (req, res) => {
    const { id } = req.params;
    await sql`DELETE FROM endpoints WHERE id = ${id}`;
    await sql`DELETE FROM requests WHERE endpointid = ${id}`;
    res.status(204).send();
  });

  app.get("/api/endpoints/:id/requests", async (req, res) => {
    const { id } = req.params;
    const { rows } = await sql`SELECT * FROM requests WHERE endpointid = ${id} ORDER BY timestamp DESC LIMIT 100`;
    const requests = rows.map((row: any) => ({
      ...row,
      headers: JSON.parse(row.headers || '{}'),
      query: JSON.parse(row.query || '{}')
    }));
    res.json(requests);
  });

  // Webhook capture endpoint (must use custom text parser to be safe)
  app.all("/webhook/:id", bodyParser.text({ type: "*/*" }), async (req, res) => {
    const { id } = req.params;
    const { rows } = await sql`SELECT * FROM endpoints WHERE id = ${id}`;

    if (rows.length === 0) {
      return res.status(404).send("Webhook endpoint not found.");
    }

    const endpoint = rows[0];

    const now = new Date();
    if (now > new Date(endpoint.expiresat)) {
      return res.status(410).send("Webhook endpoint has expired.");
    }

    const requestId = uuidv4();
    const capturedRequest = {
      id: requestId,
      endpointId: id,
      method: req.method,
      headers: JSON.stringify(req.headers),
      body: typeof req.body === 'string' ? req.body : JSON.stringify(req.body),
      query: JSON.stringify(req.query),
      timestamp: new Date().toISOString(),
      ip: req.ip || (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '',
    };
    
    await sql`
      INSERT INTO requests (id, endpointid, method, headers, body, query, timestamp, ip)
      VALUES (${capturedRequest.id}, ${capturedRequest.endpointId}, ${capturedRequest.method}, ${capturedRequest.headers}, ${capturedRequest.body}, ${capturedRequest.query}, ${capturedRequest.timestamp}, ${capturedRequest.ip})
    `;

    // Keep requests limit to 100 per endpoint
    await sql`
      DELETE FROM requests WHERE id IN (
        SELECT id FROM requests WHERE endpointid = ${id} ORDER BY timestamp DESC OFFSET 100
      )
    `;

    // Send custom response
    const headers = JSON.parse(endpoint.responseheaders || '{}');
    Object.entries(headers).forEach(([key, value]) => {
      res.setHeader(key, value as string);
    });

    res.status(endpoint.responsestatus).send(endpoint.responsebody);
  });

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;

  app.use(cors());
  app.use(express.json()); // For regular API calls
  app.use(bodyParser.text({ type: "text/*" })); 
  app.use(bodyParser.urlencoded({ extended: true }));

  // ... existing code ...

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  return app;
}

if (process.env.VERCEL) {
  // For Vercel, export the app
  export default startServer();
} else {
  // For local development
  startServer().then(app => {
    const PORT = 3000;
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  });
}
