const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const db = require("../src/db");
const { bootstrap } = require("../bootstrap");

const shouldRun = process.env.RUN_DB_TESTS === "true";
const ENV_KEYS = [
  "NODE_ENV",
  "PORT",
  "DB_HOST",
  "DB_PORT",
  "DB_USER",
  "DB_PASSWORD",
  "DB_DATABASE",
  "DB_CONNECTION_LIMIT",
  "DB_SLOW_QUERY_MS",
  "DB_ALLOW_CREATE_DATABASE",
  "DB_SCHEMA_PATH",
  "JWT_SECRET",
  "SEED_DEV_USERS",
  "SEED_DEV_USERS_PASSWORD",
  "START_EXPO",
  "EXPO_PROJECT_PATH",
  "EXPO_DEV_SERVER_PORT",
  "EXPO_PROXY_ENABLED",
  "EXPO_STATIC_ENABLED",
  "EXPO_WEB_DIST_PATH",
  "EXPO_AUTO_PREPARE",
  "EXPO_DEVTOOLS_LISTEN_ADDRESS",
  "EXPO_FATAL_ON_EXIT",
  "DB_TEST_BENCH_ENABLED",
  "DB_TEST_BENCH_TOKEN"
];

function uniqueDatabaseName() {
  return `treetracker_bootstrap_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
}

async function withCleanEnv(fn) {
  const snapshot = {};
  for (const key of ENV_KEYS) {
    snapshot[key] = process.env[key];
    delete process.env[key];
  }

  try {
    return await fn();
  } finally {
    for (const key of ENV_KEYS) {
      if (snapshot[key] === undefined) {
        delete process.env[key];
        continue;
      }
      process.env[key] = snapshot[key];
    }
  }
}

test("bootstrap loads env and initializes the database when create-if-missing is enabled", { skip: !shouldRun }, async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "bootstrap-integration-"));
  const envPath = path.join(tempDir, ".env");
  const databaseName = uniqueDatabaseName();
  const schemaPath = path.join(__dirname, "..", "src", "db", "schema.sql");

  fs.writeFileSync(
    envPath,
    [
      "NODE_ENV=test",
      "PORT=0",
      `DB_HOST=${process.env.DB_HOST || "127.0.0.1"}`,
      `DB_PORT=${process.env.DB_PORT || "3306"}`,
      `DB_USER=${process.env.DB_USER || "root"}`,
      `DB_PASSWORD=${process.env.DB_PASSWORD || "root"}`,
      `DB_DATABASE=${databaseName}`,
      "DB_CONNECTION_LIMIT=5",
      "DB_SLOW_QUERY_MS=500",
      "DB_ALLOW_CREATE_DATABASE=true",
      `DB_SCHEMA_PATH=${schemaPath}`,
      "JWT_SECRET=integration-test-secret",
      "START_EXPO=false",
      "EXPO_STATIC_ENABLED=false",
      "EXPO_AUTO_PREPARE=false"
    ].join("\n")
  );

  await withCleanEnv(async () => {
    const runtime = await bootstrap({ envPath });
    const health = await db.health();

    try {
      assert.equal(health.ready, true);
      assert.equal(runtime.config.db.database, databaseName);
    } finally {
      await runtime.shutdown("test");
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
