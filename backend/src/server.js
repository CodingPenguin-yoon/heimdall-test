import cors from "cors";
import express from "express";
import { fileURLToPath } from "node:url";

export const app = express();

const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(",").map((origin) => origin.trim())
  : true;

app.use(cors({ origin: allowedOrigins }));
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "backend",
    uptime: Math.round(process.uptime()),
  });
});

app.get("/api/status", (_req, res) => {
  res.json({
    connected: true,
    message: "Backend connection completed",
    checkedAt: new Date().toISOString(),
  });
});

const isDirectRun = process.argv[1] === fileURLToPath(import.meta.url);

if (isDirectRun) {
  const port = Number(process.env.PORT || 4000);

  app.listen(port, () => {
    console.log(`Backend listening on port ${port}`);
  });
}

