import assert from "node:assert/strict";
import test from "node:test";
import { createApp, MemoryMemoStore } from "./server.js";

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
