import cors from "cors";
import express from "express";
import { fileURLToPath } from "node:url";
import pg from "pg";

const { Pool } = pg;

const defaultDatabaseUrl =
  process.env.DATABASE_URL || "postgres://heimdall:heimdall@localhost:5432/heimdall_test";

export class PostgresMemoStore {
  constructor(connectionString = defaultDatabaseUrl) {
    this.pool = new Pool({ connectionString });
  }

  async init() {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS memos (
        id BIGSERIAL PRIMARY KEY,
        content TEXT NOT NULL CHECK (char_length(trim(content)) > 0),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
  }

  async health() {
    const result = await this.pool.query("SELECT 1 AS ok");
    return result.rows[0]?.ok === 1;
  }

  async listMemos() {
    const result = await this.pool.query(`
      SELECT id::text AS id, content, created_at AS "createdAt"
      FROM memos
      ORDER BY created_at DESC, id DESC
      LIMIT 50
    `);

    return result.rows;
  }

  async createMemo(content) {
    const result = await this.pool.query(
      `
        INSERT INTO memos (content)
        VALUES ($1)
        RETURNING id::text AS id, content, created_at AS "createdAt"
      `,
      [content],
    );

    return result.rows[0];
  }

  async close() {
    await this.pool.end();
  }
}

export class MemoryMemoStore {
  constructor(initialMemos = []) {
    this.nextId = initialMemos.length + 1;
    this.memos = initialMemos.map((memo, index) => ({
      id: String(index + 1),
      content: memo.content,
      createdAt: memo.createdAt || new Date().toISOString(),
    }));
  }

  async init() {}

  async health() {
    return true;
  }

  async listMemos() {
    return [...this.memos].sort((a, b) => Number(b.id) - Number(a.id));
  }

  async createMemo(content) {
    const memo = {
      id: String(this.nextId),
      content,
      createdAt: new Date().toISOString(),
    };

    this.nextId += 1;
    this.memos.unshift(memo);

    return memo;
  }

  async close() {}
}

const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(",").map((origin) => origin.trim())
  : true;

function isValidMemoContent(content) {
  return typeof content === "string" && content.trim().length > 0 && content.trim().length <= 500;
}

export function createApp({ memoStore = new PostgresMemoStore() } = {}) {
  const app = express();

  app.use(cors({ origin: allowedOrigins }));
  app.use(express.json());

  app.get("/health", async (_req, res) => {
    try {
      const databaseConnected = await memoStore.health();

      res.json({
        status: "ok",
        service: "backend",
        database: databaseConnected ? "connected" : "disconnected",
        uptime: Math.round(process.uptime()),
      });
    } catch (error) {
      res.status(503).json({
        status: "error",
        service: "backend",
        database: "disconnected",
        message: error instanceof Error ? error.message : "Database health check failed",
      });
    }
  });

  app.get("/api/status", async (_req, res) => {
    try {
      const databaseConnected = await memoStore.health();

      res.json({
        connected: true,
        databaseConnected,
        message: "Backend and database connection completed",
        checkedAt: new Date().toISOString(),
      });
    } catch (error) {
      res.status(503).json({
        connected: false,
        databaseConnected: false,
        message: error instanceof Error ? error.message : "Database connection failed",
        checkedAt: new Date().toISOString(),
      });
    }
  });

  app.get("/api/memos", async (_req, res) => {
    try {
      const memos = await memoStore.listMemos();
      res.json({ memos });
    } catch (error) {
      res.status(500).json({
        message: error instanceof Error ? error.message : "Failed to list memos",
      });
    }
  });

  app.post("/api/memos", async (req, res) => {
    const content = typeof req.body?.content === "string" ? req.body.content.trim() : "";

    if (!isValidMemoContent(content)) {
      res.status(400).json({ message: "Memo content must be 1-500 characters." });
      return;
    }

    try {
      const memo = await memoStore.createMemo(content);
      res.status(201).json({ memo });
    } catch (error) {
      res.status(500).json({
        message: error instanceof Error ? error.message : "Failed to create memo",
      });
    }
  });

  return app;
}

export const app = createApp();

const isDirectRun = process.argv[1] === fileURLToPath(import.meta.url);

if (isDirectRun) {
  const port = Number(process.env.PORT || 4000);
  const memoStore = new PostgresMemoStore();
  const serverApp = createApp({ memoStore });

  memoStore
    .init()
    .then(() => {
      serverApp.listen(port, () => {
        console.log(`Backend listening on port ${port}`);
      });
    })
    .catch((error) => {
      console.error("Failed to initialize database", error);
      process.exit(1);
    });
}
