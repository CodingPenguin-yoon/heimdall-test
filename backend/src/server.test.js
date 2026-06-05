import assert from "node:assert/strict";
import test from "node:test";
import { app } from "./server.js";

function listen(appInstance) {
  return new Promise((resolve) => {
    const server = appInstance.listen(0, "127.0.0.1", () => resolve(server));
  });
}

test("GET /health returns ok", async () => {
  const server = await listen(app);

  try {
    const { port } = server.address();
    const response = await fetch(`http://127.0.0.1:${port}/health`);
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.status, "ok");
    assert.equal(body.service, "backend");
  } finally {
    server.close();
  }
});

test("GET /api/status reports connected", async () => {
  const server = await listen(app);

  try {
    const { port } = server.address();
    const response = await fetch(`http://127.0.0.1:${port}/api/status`);
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.connected, true);
  } finally {
    server.close();
  }
});
