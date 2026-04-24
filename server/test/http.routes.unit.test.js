const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const net = require("node:net");
const os = require("node:os");
const fs = require("node:fs");
const path = require("node:path");
const { createHttpServer } = require("../src/http");
const { signJwt } = require("../src/routes/api/utils/security");

function createDbStub(health = { ready: true }) {
  const deletedTokens = [];

  return {
    deletedTokens,
    health: async () => health,
    trees: {
      list: async () => ["ok"]
    },
    users: {
      getById: async (id) => (id === 1 ? { id: 1, username: "tester", email: "tester@example.com" } : null)
    },
    userSessions: {
      deleteByToken: async (sessionToken) => {
        deletedTokens.push(sessionToken);
        return { deleted: true };
      }
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
        const isJson = String(res.headers["content-type"] || "").startsWith("application/json");
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: isJson && raw ? JSON.parse(raw) : raw || null
        });
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

test("auth logout route deletes the refresh-token session", async () => {
  const db = createDbStub();
  const httpServer = createHttpServer({ port: 0, db });
  const listening = await httpServer.start();
  listening.unref();
  const port = listening.address().port;
  const refreshToken = "a".repeat(64);

  try {
    const response = await sendRequest({
      port,
      method: "POST",
      path: "/api/auth/logout",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ refreshToken })
    });

    assert.equal(response.status, 200);
    assert.equal(response.body.message, "Logout successful");
    assert.deepEqual(db.deletedTokens, [refreshToken]);
  } finally {
    await httpServer.stop();
  }
});

test("tree creation requires an authenticated user", async () => {
  const previousSecret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = "unit-test-secret";

  const httpServer = createHttpServer({ port: 0, db: createDbStub() });
  const listening = await httpServer.start();
  listening.unref();
  const port = listening.address().port;

  try {
    const response = await sendRequest({
      port,
      method: "POST",
      path: "/api/trees",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ latitude: 51.9, longitude: -2.1 })
    });

    assert.equal(response.status, 401);
    assert.equal(response.body.code, "AuthError");
  } finally {
    delete process.env.JWT_SECRET;
    if (previousSecret !== undefined) {
      process.env.JWT_SECRET = previousSecret;
    }
    await httpServer.stop();
  }
});

test("unmatched routes proxy to the Expo dev server when enabled", async () => {
  const expoServer = http.createServer((req, res) => {
    res.writeHead(200, { "content-type": "text/plain" });
    res.end(`expo:${req.url}`);
  });
  await new Promise((resolve) => expoServer.listen(0, "127.0.0.1", resolve));
  const expoPort = expoServer.address().port;

  const httpServer = createHttpServer({
    port: 0,
    db: createDbStub(),
    frontendUrl: "http://localhost:3000",
    expoProxyEnabled: true,
    expoProxyTarget: { host: "127.0.0.1", port: expoPort }
  });
  const listening = await httpServer.start();
  listening.unref();
  const port = listening.address().port;

  try {
    const proxied = await sendRequest({ port, path: "/" });
    assert.equal(proxied.status, 200);
    assert.equal(proxied.body, "expo:/");

    const health = await sendRequest({ port, path: "/health" });
    assert.equal(health.status, 200);
    assert.equal(health.body.status, "ok");
  } finally {
    await httpServer.stop();
    await new Promise((resolve) => expoServer.close(resolve));
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

test("unmatched GET routes serve the exported Expo web build when enabled", async () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "expo-static-"));
  fs.writeFileSync(path.join(tempRoot, "index.html"), "<!doctype html><html><body>expo web</body></html>");
  fs.mkdirSync(path.join(tempRoot, "_expo"));
  fs.writeFileSync(path.join(tempRoot, "_expo", "static.js"), "console.log('ok');");

  const httpServer = createHttpServer({
    port: 0,
    db: createDbStub(),
    expoStaticEnabled: true,
    expoWebDistPath: tempRoot
  });
  const listening = await httpServer.start();
  listening.unref();
  const port = listening.address().port;

  try {
    const root = await sendRequest({ port, path: "/" });
    assert.equal(root.status, 200);
    assert.match(root.body, /expo web/);

    const asset = await sendRequest({ port, path: "/_expo/static.js" });
    assert.equal(asset.status, 200);
    assert.equal(asset.body, "console.log('ok');");

    const nested = await sendRequest({ port, path: "/mainPage" });
    assert.equal(nested.status, 200);
    assert.match(nested.body, /expo web/);
  } finally {
    await httpServer.stop();
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
});

test("legacy /api routes expose old frontend-compatible endpoints", async () => {
  const previousSecret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = "unit-test-secret";
  const callLog = {
    treesCreate: 0,
    creationDataCreate: 0,
    treeDataCreate: 0,
    commentsCreate: 0,
    seenCreate: 0,
    wildlifeCreate: 0,
    diseaseCreate: 0
  };
  const accessToken = signJwt({ userId: 2, username: "user" }, process.env.JWT_SECRET, 15 * 60);

  const db = {
    health: async () => ({ ready: true }),
    transaction: async (fn) => fn({ __tx: true }),
    trees: {
      create: async () => {
        callLog.treesCreate += 1;
        return { id: 77 };
      },
      list: async () => [{ id: 77, latitude: 51.9, longitude: -2.1 }],
      getById: async (id) => (id === 77 ? { id: 77, latitude: 51.9, longitude: -2.1 } : null)
    },
    treeCreationData: {
      create: async () => {
        callLog.creationDataCreate += 1;
        return { id: 1 };
      },
      getByTreeId: async () => ({ id: 1 })
    },
    treeData: {
      create: async () => {
        callLog.treeDataCreate += 1;
        return { id: 1 };
      },
      getByTreeId: async () => ({
        tree_species: "Oak",
        trunk_diameter: 15,
        tree_height: 10,
        trunk_circumference: 30
      })
    },
    guardians: {
      listByTree: async () => [],
      add: async () => ({ added: true }),
    },
    admins: {
      isAdmin: async () => false
    },
    guardianUsers: {
      isGuardian: async () => false
    },
    comments: {
      create: async () => {
        callLog.commentsCreate += 1;
        return { id: 900 };
      }
    },
    seenObservations: {
      create: async () => {
        callLog.seenCreate += 1;
        return { comment_id: 900 };
      },
      listByTreeId: async () => [{ observation_notes: "healthy" }]
    },
    wildlifeObservations: {
      create: async () => {
        callLog.wildlifeCreate += 1;
        return { comment_id: 900 };
      },
      listByTreeId: async () => [{ wildlife: "bird" }]
    },
    diseaseObservations: {
      create: async () => {
        callLog.diseaseCreate += 1;
        return { comment_id: 900 };
      },
      listByTreeId: async () => [{ disease: "none" }]
    },
    treePhotos: {
      add: async () => ({ added: true }),
      listPhotoIdsByTree: async () => [5]
    },
    photos: {
      create: async () => ({ id: 5 }),
      getById: async () => ({ id: 5, image_url: "https://example.com/photo.jpg" })
    },
    users: {
      existsByUsername: async () => false,
      existsByEmail: async () => false,
      create: async () => ({ id: 2, username: "user", email: "user@example.com" }),
      getByUsername: async () => null,
      getByEmail: async () => null,
      getById: async (id) => (id === 2 ? { id: 2, username: "user", email: "user@example.com" } : null)
    },
    userPasswords: {
      setForUser: async () => ({ userId: 2 }),
      getHashByUserId: async () => null
    },
    userSessions: {
      create: async () => ({ id: 1 })
    }
  };

  const httpServer = createHttpServer({ port: 0, db });
  const listening = await httpServer.start();
  listening.unref();
  const port = listening.address().port;

  try {
    const apiRoot = await sendRequest({ port, path: "/api" });
    assert.equal(apiRoot.status, 200);
    assert.equal(apiRoot.body.message, "Tree API working");

    const addTree = await sendRequest({
      port,
      method: "POST",
      path: "/api/add-tree-data",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${accessToken}`
      },
      body: JSON.stringify({
        latitude: 51.9,
        longitude: -2.1,
        species: "Oak",
        notes: "healthy",
        wildlife: "bird",
        disease: "none",
        diameter: 15,
        height: 10,
        circumference: 30
      })
    });
    assert.equal(addTree.status, 200);
    assert.equal(addTree.body.success, true);
    assert.equal(addTree.body.tree_id, 77);
    assert.equal(callLog.treesCreate, 1);
    assert.equal(callLog.creationDataCreate, 1);
    assert.equal(callLog.treeDataCreate, 1);
    assert.equal(callLog.commentsCreate, 3);
    assert.equal(callLog.seenCreate, 1);
    assert.equal(callLog.wildlifeCreate, 1);
    assert.equal(callLog.diseaseCreate, 1);

    const trees = await sendRequest({ port, path: "/api/get-trees" });
    assert.equal(trees.status, 200);
    assert.equal(Array.isArray(trees.body), true);
    assert.equal(trees.body[0].id, 77);
    assert.equal(trees.body[0].species, "Oak");
    assert.deepEqual(trees.body[0].photos, [{ id: 5, image_url: "https://example.com/photo.jpg" }]);

    const details = await sendRequest({ port, path: "/api/get-tree-details?tree_id=77" });
    assert.equal(details.status, 200);
    assert.equal(details.body.id, 77);
    assert.equal(details.body.tree_species, "Oak");
    assert.equal(details.body.trunk_diameter, 15);
  } finally {
    delete process.env.JWT_SECRET;
    if (previousSecret !== undefined) {
      process.env.JWT_SECRET = previousSecret;
    }
    await httpServer.stop();
  }
});

test("legacy auth routes register login and return /api/me", async () => {
  const previousSecret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = "unit-test-secret";

  const users = [];
  const passwordByUserId = new Map();
  const guardianUserIds = new Set();
  let nextUserId = 1;

  const db = {
    health: async () => ({ ready: true }),
    transaction: async (fn) => fn({ __tx: true }),
    trees: { list: async () => [], getById: async () => null, create: async () => ({ id: 1 }) },
    treeCreationData: { create: async () => ({ id: 1 }), getByTreeId: async () => ({ id: 1 }) },
    treeData: { create: async () => ({ id: 1 }), getByTreeId: async () => null },
    comments: { create: async () => ({ id: 1 }) },
    seenObservations: { create: async () => ({ id: 1 }), listByTreeId: async () => [] },
    wildlifeObservations: { create: async () => ({ id: 1 }), listByTreeId: async () => [] },
    diseaseObservations: { create: async () => ({ id: 1 }), listByTreeId: async () => [] },
    treePhotos: { add: async () => ({ added: true }), listPhotoIdsByTree: async () => [] },
    photos: { create: async () => ({ id: 1 }), getById: async () => null },
    users: {
      existsByUsername: async (username) => users.some((user) => user.username === username),
      existsByEmail: async (email) => users.some((user) => user.email === email),
      create: async ({ username, email }) => {
        const user = { id: nextUserId++, username, email };
        users.push(user);
        return user;
      },
      getByUsername: async (username) => users.find((user) => user.username === username) || null,
      getByEmail: async (email) => users.find((user) => user.email === email) || null,
      getById: async (id) => users.find((user) => user.id === id) || null
    },
    userPasswords: {
      setForUser: async (userId, hash) => {
        passwordByUserId.set(userId, hash);
        return { userId };
      },
      getHashByUserId: async (userId) => passwordByUserId.get(userId) || null
    },
    admins: {
      isAdmin: async () => false
    },
    guardianUsers: {
      isGuardian: async (userId) => guardianUserIds.has(userId)
    },
    userSessions: {
      create: async () => ({ id: 1 })
    }
  };

  const httpServer = createHttpServer({ port: 0, db });
  const listening = await httpServer.start();
  listening.unref();
  const port = listening.address().port;

  try {
    const register = await sendRequest({
      port,
      method: "POST",
      path: "/api/register",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ username: "charles", email: "charles@example.com", password: "password123" })
    });
    assert.equal(register.status, 201);
    assert.equal(register.body.user.username, "charles");
    assert.equal(register.body.user.role, "registered_user");
    assert.equal(typeof register.body.accessToken, "string");

    guardianUserIds.add(register.body.user.id);

    const login = await sendRequest({
      port,
      method: "POST",
      path: "/api/login",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ usernameOrEmail: "charles", password: "password123" })
    });
    assert.equal(login.status, 200);
    assert.equal(login.body.user.email, "charles@example.com");
    assert.equal(login.body.user.role, "guardian");
    assert.equal(typeof login.body.accessToken, "string");

    const me = await sendRequest({
      port,
      method: "GET",
      path: "/api/me",
      headers: { authorization: `Bearer ${login.body.accessToken}` }
    });
    assert.equal(me.status, 200);
    assert.equal(me.body.username, "charles");
    assert.equal(me.body.role, "guardian");
  } finally {
    await httpServer.stop();
    if (previousSecret === undefined) {
      delete process.env.JWT_SECRET;
    } else {
      process.env.JWT_SECRET = previousSecret;
    }
  }
});
