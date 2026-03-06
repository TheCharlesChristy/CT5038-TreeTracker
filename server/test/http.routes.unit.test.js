const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const net = require("node:net");
const { createHttpServer } = require("../src/http");

function createDbStub(health = { ready: true }) {
  return {
    health: async () => health,
    trees: {
      list: async () => ["ok"]
    }
  };
}

function sendRequest({ port, method = "GET", path = "/", headers = {}, body }) {
  return new Promise((resolve, reject) => {
    const requestHeaders = { ...headers, connection: "close" };
    if (body !== undefined && requestHeaders["content-length"] === undefined) {
      requestHeaders["content-length"] = Buffer.byteLength(body);
    }
    const req = http.request({ hostname: "127.0.0.1", port, method, path, headers: requestHeaders }, (res) => {
      const chunks = [];
      res.on("data", (chunk) => chunks.push(chunk));
      res.on("end", () => {
        const raw = Buffer.concat(chunks).toString("utf-8");
        const parsed = raw ? JSON.parse(raw) : null;
        resolve({ status: res.statusCode, headers: res.headers, body: parsed });
      });
    });
    req.setTimeout(5000, () => reject(new Error("request timeout")));
    req.on("error", reject);
    if (body) req.write(body);
    req.end();
  });
}

test("HTTP startup rejects when listen emits EADDRINUSE", async () => {
  const blocker = net.createServer();
  await new Promise((resolve) => blocker.listen(0, "127.0.0.1", resolve));
  const occupiedPort = blocker.address().port;

  const httpServer = createHttpServer({ port: occupiedPort, db: createDbStub() });
  try {
    await assert.rejects(() => httpServer.start(), (error) => error && error.code === "EADDRINUSE");
  } finally {
    await new Promise((resolve) => blocker.close(resolve));
  }
});

test("health and db health routes return expected status", async () => {
  const readyServer = createHttpServer({ port: 0, db: createDbStub({ ready: true }) });
  const listening = await readyServer.start();
  listening.unref();
  const port = listening.address().port;

  try {
    const health = await sendRequest({ port, path: "/health" });
    assert.equal(health.status, 200);
    assert.equal(health.body.status, "ok");

    const dbHealth = await sendRequest({ port, path: "/db/health" });
    assert.equal(dbHealth.status, 200);
    assert.equal(dbHealth.body.ready, true);
  } finally {
    await readyServer.stop();
  }

  const notReadyServer = createHttpServer({ port: 0, db: createDbStub({ ready: false }) });
  const listening2 = await notReadyServer.start();
  listening2.unref();
  const port2 = listening2.address().port;
  try {
    const dbHealth = await sendRequest({ port: port2, path: "/db/health" });
    assert.equal(dbHealth.status, 503);
    assert.equal(dbHealth.body.ready, false);
  } finally {
    await notReadyServer.stop();
  }
});

test("OPTIONS requests include CORS preflight response", async () => {
  const httpServer = createHttpServer({ port: 0, db: createDbStub() });
  const listening = await httpServer.start();
  listening.unref();
  const port = listening.address().port;
  try {
    const response = await sendRequest({ port, method: "OPTIONS", path: "/whatever" });
    assert.equal(response.status, 204);
    assert.equal(response.headers["access-control-allow-origin"], "*");
  } finally {
    // intentionally not awaiting stop(); server is unref'd for deterministic test completion
  }
});

test("invalid path and endpoint responses map correctly", async () => {
  const httpServer = createHttpServer({ port: 0, db: createDbStub() });
  const listening = await httpServer.start();
  listening.unref();
  const port = listening.address().port;
  try {
    const missing = await sendRequest({ port, path: "/unknown/path" });
    assert.equal(missing.status, 404);
    assert.equal(missing.body.error, "Not found");
  } finally {
    await httpServer.stop();
  }
});

test("testbench auth and payload contract enforce status mapping", async () => {
  const httpServer = createHttpServer({
    port: 0,
    db: createDbStub(),
    dbTestBenchEnabled: true,
    dbTestBenchToken: "secret"
  });
  const listening = await httpServer.start();
  listening.unref();
  const port = listening.address().port;

  try {
    const unauth = await sendRequest({ port, path: "/db/testbench/endpoints" });
    assert.equal(unauth.status, 401);

    const forbidden = await sendRequest({
      port,
      path: "/db/testbench/endpoints",
      headers: { authorization: "Bearer wrong" }
    });
    assert.equal(forbidden.status, 403);

    const media = await sendRequest({
      port,
      method: "POST",
      path: "/db/testbench/invoke",
      headers: { authorization: "Bearer secret", "content-type": "text/plain" },
      body: "{}"
    });
    assert.equal(media.status, 415);

    const malformed = await sendRequest({
      port,
      method: "POST",
      path: "/db/testbench/invoke",
      headers: { authorization: "Bearer secret", "content-type": "application/json" },
      body: "{"
    });
    assert.equal(malformed.status, 400);

    const empty = await sendRequest({
      port,
      method: "POST",
      path: "/db/testbench/invoke",
      headers: { authorization: "Bearer secret", "content-type": "application/json" },
      body: "{}"
    });
    assert.equal(empty.status, 400);

    const ok = await sendRequest({
      port,
      method: "POST",
      path: "/db/testbench/invoke",
      headers: { authorization: "Bearer secret", "content-type": "application/json" },
      body: JSON.stringify({ endpoint: "trees.list", args: [] })
    });
    assert.equal(ok.status, 200);
    assert.equal(ok.body.endpoint, "trees.list");
  } finally {
    await httpServer.stop();
  }
});
