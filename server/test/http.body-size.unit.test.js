const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const { createHttpServer } = require("../src/http");

function createDbStub() {
  return {
    health: async () => ({ ready: true }),
    trees: {
      list: async () => []
    }
  };
}

function sendJsonPost({ port, path, body, extraHeaders = {} }) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: "127.0.0.1",
        port,
        method: "POST",
        path,
        headers: {
          "content-type": "application/json",
          "content-length": Buffer.byteLength(body),
          connection: "close",
          ...extraHeaders
        }
      },
      (res) => {
        const chunks = [];
        res.on("data", (chunk) => chunks.push(chunk));
        res.on("end", () => {
          const raw = Buffer.concat(chunks).toString("utf-8");
          resolve({ status: res.statusCode, body: JSON.parse(raw) });
        });
      }
    );

    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

test("POST /db/testbench/invoke rejects oversized JSON bodies with 413", async () => {
  const httpServer = createHttpServer({
    port: 0,
    db: createDbStub(),
    dbTestBenchEnabled: true,
    dbTestBenchToken: "test-token"
  });

  const listeningServer = await httpServer.start();
  const { port } = listeningServer.address();

  const oversizedArgs = "x".repeat(2 * 1024 * 1024);
  const body = JSON.stringify({
    endpoint: "trees.list",
    args: [oversizedArgs]
  });

  try {
    const response = await sendJsonPost({
      port,
      path: "/db/testbench/invoke",
      body,
      extraHeaders: { authorization: "Bearer test-token" }
    });

    assert.equal(response.status, 413);
    assert.equal(response.body.code, "PayloadTooLargeError");
    assert.match(response.body.error, /Request body exceeds/);
  } finally {
    await httpServer.stop();
  }
});
