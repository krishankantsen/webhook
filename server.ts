import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs";
import cors from "cors";
import bodyParser from "body-parser";
import { initializeApp, cert, getApp, getApps } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { v4 as uuidv4 } from "uuid";
import firebaseConfig from "./firebase-applet-config.json";

// Initialize Firebase Admin
// Requires a service account key file for authentication.
// Place your downloaded service account JSON at ./service-account.json
// OR set the GOOGLE_APPLICATION_CREDENTIALS environment variable to its path.
let adminApp;
if (getApps().length > 0) {
  adminApp = getApp();
} else {
  const serviceAccountPath =
    process.env.GOOGLE_APPLICATION_CREDENTIALS ||
    path.join(process.cwd(), "service-account.json");

  if (!fs.existsSync(serviceAccountPath)) {
    console.error(
      `\n❌ Firebase Admin credentials not found.\n` +
      `   To fix this:\n` +
      `   1. Go to Firebase Console → Project Settings → Service Accounts\n` +
      `   2. Click "Generate new private key" and download the JSON\n` +
      `   3. Save it as: ${path.join(process.cwd(), "service-account.json")}\n` +
      `   (or set GOOGLE_APPLICATION_CREDENTIALS env var to its path)\n`
    );
    process.exit(1);
  }

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, "utf8"));
  adminApp = initializeApp({
    credential: cert(serviceAccount),
    projectId: firebaseConfig.projectId,
  });
}

const db = getFirestore(adminApp, firebaseConfig.firestoreDatabaseId);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware for webhooks
  app.use(cors());
  app.use(bodyParser.text({ type: "*/*" })); // Capture everything as text

  // Webhook capture endpoint
  app.all("/webhook/:id", async (req, res) => {
    const { id } = req.params;
    
    try {
      // 1. Check if endpoint exists and is not expired
      const endpointRef = db.collection("endpoints").doc(id);
      const endpointDoc = await endpointRef.get();

      if (!endpointDoc.exists) {
        return res.status(404).send("Webhook endpoint not found.");
      }

      const endpointData = endpointDoc.data();
      const now = new Date();
      const expiresAt = endpointData?.expiresAt?.toDate();

      if (expiresAt && now > expiresAt) {
        return res.status(410).send("Webhook endpoint has expired.");
      }

      // 2. Capture the request
      const requestId = uuidv4();
      const capturedRequest = {
        id: requestId,
        endpointId: id,
        method: req.method,
        headers: req.headers,
        body: typeof req.body === 'string' ? req.body : JSON.stringify(req.body),
        query: req.query,
        timestamp: FieldValue.serverTimestamp(),
        ip: req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress,
      };

      await endpointRef.collection("requests").doc(requestId).set(capturedRequest);

      // 3. Send custom response
      const status = endpointData?.responseStatus || 200;
      const responseBody = endpointData?.responseBody || "OK";
      const responseHeaders = endpointData?.responseHeaders || {};

      // Set custom headers
      Object.entries(responseHeaders).forEach(([key, value]) => {
        res.setHeader(key, value as string);
      });

      res.status(status).send(responseBody);

    } catch (error) {
      console.error("Error capturing webhook:", error);
      res.status(500).send("Internal Server Error");
    }
  });

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

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

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
