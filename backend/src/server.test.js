import assert from "node:assert/strict";
import test from "node:test";
import { createApp, databasePoolConfig, MemoryMemoStore } from "./server.js";

function listen(appInstance) {
  return new Promise((resolve) => {
    const server = appInstance.listen(0, "127.0.0.1", () => resolve(server));
  });
}

test("databasePoolConfig keeps DATABASE_URL compatibility", () => {
  const config = databasePoolConfig(
    { DATABASE_URL: "postgres://local:local@postgres:5432/local" },
    () => assert.fail("password file must not be read when DATABASE_URL is set"),
  );

  assert.deepEqual(config, {
    connectionString: "postgres://local:local@postgres:5432/local",
  });
});

test("databasePoolConfig reads the Heimdall password file contract", () => {
  const paths = [];
  const config = databasePoolConfig(
    {
      DATABASE_HOST: "managed-postgres",
      DATABASE_PORT: "5432",
      DATABASE_NAME: "project_db",
      DATABASE_USER: "project_role",
      DATABASE_SCHEMA: "app",
      DATABASE_PASSWORD_FILE: "/run/secrets/heimdall/database/password",
    },
    (path) => {
      paths.push(path);
      return "file-password\n";
    },
  );

  assert.deepEqual(paths, ["/run/secrets/heimdall/database/password"]);
  assert.deepEqual(config, {
    host: "managed-postgres",
    port: 5432,
    database: "project_db",
    user: "project_role",
    password: "file-password",
    options: "-c search_path=app,pg_catalog",
  });
});

test("databasePoolConfig rejects an incomplete Heimdall contract", () => {
  assert.throws(
    () => databasePoolConfig({ DATABASE_HOST: "managed-postgres" }, () => "unused"),
    /Missing managed database environment variables/,
  );
});

test("databasePoolConfig rejects an invalid managed database port", () => {
  assert.throws(
    () =>
      databasePoolConfig(
        {
          DATABASE_HOST: "managed-postgres",
          DATABASE_PORT: "not-a-port",
          DATABASE_NAME: "project_db",
          DATABASE_USER: "project_role",
          DATABASE_SCHEMA: "app",
          DATABASE_PASSWORD_FILE: "/run/secrets/heimdall/database/password",
        },
        () => "file-password",
      ),
    /DATABASE_PORT must be an integer/,
  );
});

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
