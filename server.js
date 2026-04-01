import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import cors from "cors";
import bodyParser from "body-parser";
import { v4 as uuidv4 } from "uuid";
import Database from "better-sqlite3";
const DB_FILE = path.join(process.cwd(), "webhook-tester.db");
const db = new Database(DB_FILE);
db.pragma("journal_mode = WAL");
db.exec(`
  CREATE TABLE IF NOT EXISTS endpoints (
    id TEXT PRIMARY KEY,
    name TEXT,
    responseStatus INTEGER,
    responseBody TEXT,
    responseHeaders TEXT,
    createdAt TEXT,
    expiresAt TEXT
  );

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
`);
async function startServer() {
  const app = express();
  const PORT = 3e3;
  app.use(cors());
  app.use(express.json());
  app.use(bodyParser.text({ type: "text/*" }));
  app.use(bodyParser.urlencoded({ extended: true }));
  app.get("/api/endpoints", (req, res) => {
    const rows = db.prepare("SELECT * FROM endpoints ORDER BY createdAt DESC").all();
    const endpoints = rows.map((row) => ({
      ...row,
      responseHeaders: JSON.parse(row.responseHeaders || "{}")
    }));
    res.json(endpoints);
  });
  app.post("/api/endpoints", (req, res) => {
    const { name, status, body, headers } = req.body;
    const id = uuidv4().split("-")[0];
    const expiresAt = /* @__PURE__ */ new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);
    const newEndpoint = {
      id,
      name: name || "Unnamed Endpoint",
      responseStatus: status || 200,
      responseBody: body || "OK",
      responseHeaders: JSON.stringify(headers || {}),
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      expiresAt: expiresAt.toISOString()
    };
    const stmt = db.prepare(`
      INSERT INTO endpoints (id, name, responseStatus, responseBody, responseHeaders, createdAt, expiresAt)
      VALUES (@id, @name, @responseStatus, @responseBody, @responseHeaders, @createdAt, @expiresAt)
    `);
    stmt.run(newEndpoint);
    res.status(201).json({
      ...newEndpoint,
      responseHeaders: JSON.parse(newEndpoint.responseHeaders)
    });
  });
  app.patch("/api/endpoints/:id", (req, res) => {
    const { id } = req.params;
    const endpoint = db.prepare("SELECT * FROM endpoints WHERE id = ?").get(id);
    if (!endpoint) return res.status(404).send("Not found");
    const { status, body, headers } = req.body;
    if (status !== void 0) endpoint.responseStatus = status;
    if (body !== void 0) endpoint.responseBody = body;
    if (headers !== void 0) endpoint.responseHeaders = JSON.stringify(headers);
    const stmt = db.prepare(`
      UPDATE endpoints 
      SET responseStatus = @responseStatus, responseBody = @responseBody, responseHeaders = @responseHeaders
      WHERE id = @id
    `);
    stmt.run(endpoint);
    res.json({
      ...endpoint,
      responseHeaders: JSON.parse(endpoint.responseHeaders)
    });
  });
  app.delete("/api/endpoints/:id", (req, res) => {
    const { id } = req.params;
    db.prepare("DELETE FROM endpoints WHERE id = ?").run(id);
    db.prepare("DELETE FROM requests WHERE endpointId = ?").run(id);
    res.status(204).send();
  });
  app.get("/api/endpoints/:id/requests", (req, res) => {
    const { id } = req.params;
    const rows = db.prepare("SELECT * FROM requests WHERE endpointId = ? ORDER BY timestamp DESC LIMIT 100").all(id);
    const requests = rows.map((row) => ({
      ...row,
      headers: JSON.parse(row.headers || "{}"),
      query: JSON.parse(row.query || "{}")
    }));
    res.json(requests);
  });
  app.all("/webhook/:id", bodyParser.text({ type: "*/*" }), async (req, res) => {
    const { id } = req.params;
    const endpoint = db.prepare("SELECT * FROM endpoints WHERE id = ?").get(id);
    if (!endpoint) {
      return res.status(404).send("Webhook endpoint not found.");
    }
    const now = /* @__PURE__ */ new Date();
    if (now > new Date(endpoint.expiresAt)) {
      return res.status(410).send("Webhook endpoint has expired.");
    }
    const requestId = uuidv4();
    const capturedRequest = {
      id: requestId,
      endpointId: id,
      method: req.method,
      headers: JSON.stringify(req.headers),
      body: typeof req.body === "string" ? req.body : JSON.stringify(req.body),
      query: JSON.stringify(req.query),
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      ip: req.ip || req.headers["x-forwarded-for"] || req.socket.remoteAddress || ""
    };
    const stmt = db.prepare(`
      INSERT INTO requests (id, endpointId, method, headers, body, query, timestamp, ip)
      VALUES (@id, @endpointId, @method, @headers, @body, @query, @timestamp, @ip)
    `);
    stmt.run(capturedRequest);
    db.prepare(`
      DELETE FROM requests WHERE id IN (
        SELECT id FROM requests WHERE endpointId = ? ORDER BY timestamp DESC LIMIT -1 OFFSET 100
      )
    `).run(id);
    const headers = JSON.parse(endpoint.responseHeaders || "{}");
    Object.entries(headers).forEach(([key, value]) => {
      res.setHeader(key, value);
    });
    res.status(endpoint.responseStatus).send(endpoint.responseBody);
  });
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}
startServer();
