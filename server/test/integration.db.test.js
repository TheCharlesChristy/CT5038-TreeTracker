const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("path");
const crypto = require("node:crypto");
const db = require("../src/db");

const shouldRun = process.env.RUN_DB_TESTS === "true";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function initWithRetry() {
  const dbConfig = {
    host: process.env.DB_HOST || "127.0.0.1",
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "root",
    database: process.env.DB_DATABASE || "treetracker_test",
    connectionLimit: 5,
    slowQueryMs: 500,
    allowCreateDatabase: true,
    schemaPath: process.env.DB_SCHEMA_PATH || path.join(__dirname, "..", "src", "db", "schema.sql")
  };

  let lastError = null;
  for (let attempt = 1; attempt <= 25; attempt += 1) {
    try {
      await db.init(dbConfig);
      return;
    } catch (error) {
      lastError = error;
      await sleep(1000);
    }
  }

  throw lastError;
}

test("db init and core workflows smoke test", { skip: !shouldRun }, async () => {
  await initWithRetry();

  try {
    const username = `integration_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const register = await db.workflows.auth.registerUser({
      username,
      passwordHash: "hash_for_test_only"
    });

    assert.equal(typeof register.userId, "number");

    const createdUser = await db.users.getById(register.userId);
    assert.equal(createdUser.username, username);

    const sessionToken = crypto.randomBytes(32).toString("hex");
    const sessionExpiresAt = new Date(Date.now() + 60 * 60 * 1000);
    const session = await db.workflows.auth.createSession({
      userId: register.userId,
      sessionToken,
      expiresAt: sessionExpiresAt
    });

    assert.equal(typeof session.sessionId, "number");

    const validSession = await db.workflows.auth.validateSession({
      sessionToken,
      now: new Date()
    });
    assert.equal(validSession.valid, true);
    assert.equal(validSession.userId, register.userId);

    const tree = await db.workflows.trees.createTreeWithMeta({
      latitude: 51.8985,
      longitude: -8.4756,
      creatorUserId: register.userId
    });
    assert.equal(typeof tree.treeId, "number");

    await db.workflows.trees.setTreeData({
      treeId: tree.treeId,
      treeDataFields: {
        treeHeight: 4.5,
        leafArea: 2.1
      }
    });

    const details = await db.workflows.trees.getTreeDetails(tree.treeId);
    assert.equal(Number(details.tree.id), tree.treeId);
    assert.equal(Number(details.creationData.creator_user_id), register.userId);
    assert.equal(Number(details.treeData.tree_height), 4.5);
  } finally {
    await db.close();
  }
});
