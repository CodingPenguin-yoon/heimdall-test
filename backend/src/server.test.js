import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import * as serverModule from "./server.js";

const { createApp, MemoryMemoStore } = serverModule;

function listen(appInstance) {
  return new Promise((resolve) => {
    const server = appInstance.listen(0, "127.0.0.1", () => resolve(server));
  });
}

test("GET /health returns ok", async () => {
  const app = createApp({ memoStore: new MemoryMemoStore() });
  const server = await listen(app);

  try {
    const { port } = server.address();
    const response = await fetch(`http://127.0.0.1:${port}/health`);
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.status, "ok");
    assert.equal(body.service, "backend");
    assert.equal(body.database, "connected");
  } finally {
    server.close();
  }
});

test("GET /api/status reports connected", async () => {
  const app = createApp({ memoStore: new MemoryMemoStore() });
  const server = await listen(app);

  try {
    const { port } = server.address();
    const response = await fetch(`http://127.0.0.1:${port}/api/status`);
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.connected, true);
    assert.equal(body.databaseConnected, true);
  } finally {
    server.close();
  }
});

test("GET /api reports backend and database connectivity", async () => {
  const app = createApp({ memoStore: new MemoryMemoStore() });
  const server = await listen(app);

  try {
    const { port } = server.address();
    const response = await fetch(`http://127.0.0.1:${port}/api`);

    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.connected, true);
    assert.equal(body.databaseConnected, true);
  } finally {
    server.close();
  }
});

test("database config reads the Heimdall password-file contract", async () => {
  const temporaryDirectory = await mkdtemp(join(tmpdir(), "heimdall-test-db-"));
  const passwordFile = join(temporaryDirectory, "project-database-password");

  try {
    await writeFile(passwordFile, "fixture-secret\n", { mode: 0o400 });

    assert.equal(typeof serverModule.databaseConfigFromEnvironment, "function");
    const config = serverModule.databaseConfigFromEnvironment({
      DATABASE_HOST: "managed-postgres",
      DATABASE_PORT: "5432",
      DATABASE_NAME: "hd_fixture",
      DATABASE_USER: "hd_role",
      DATABASE_SCHEMA: "app",
      DATABASE_PASSWORD_FILE: passwordFile,
      DATABASE_URL: "postgres://must-not-be-used",
    });

    assert.deepEqual(config, {
      host: "managed-postgres",
      port: 5432,
      database: "hd_fixture",
      user: "hd_role",
      password: "fixture-secret",
    });
  } finally {
    await rm(temporaryDirectory, { recursive: true, force: true });
  }
});

test("POST /api/memos creates a memo and GET /api/memos lists it", async () => {
  const app = createApp({ memoStore: new MemoryMemoStore() });
  const server = await listen(app);

  try {
    const { port } = server.address();
    const createResponse = await fetch(`http://127.0.0.1:${port}/api/memos`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ content: "첫 번째 메모" }),
    });
    const createBody = await createResponse.json();

    assert.equal(createResponse.status, 201);
    assert.equal(createBody.memo.content, "첫 번째 메모");

    const listResponse = await fetch(`http://127.0.0.1:${port}/api/memos`);
    const listBody = await listResponse.json();

    assert.equal(listResponse.status, 200);
    assert.equal(listBody.memos.length, 1);
    assert.equal(listBody.memos[0].content, "첫 번째 메모");
  } finally {
    server.close();
  }
});

test("POST /api/memos rejects empty content", async () => {
  const app = createApp({ memoStore: new MemoryMemoStore() });
  const server = await listen(app);

  try {
    const { port } = server.address();
    const response = await fetch(`http://127.0.0.1:${port}/api/memos`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ content: "   " }),
    });

    assert.equal(response.status, 400);
  } finally {
    server.close();
  }
});
