const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { bootstrap } = require("../bootstrap");

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
  "DB_TEST_BENCH_TOKEN",
  "MYSQL_ROOT_PASSWORD",
  "MYSQL_DATABASE"
];

function withCleanEnv(fn) {
  const snapshot = {};
  for (const key of ENV_KEYS) {
    snapshot[key] = process.env[key];
    delete process.env[key];
  }

  return Promise.resolve()
    .then(fn)
    .finally(() => {
      for (const key of ENV_KEYS) {
        if (snapshot[key] === undefined) {
          delete process.env[key];
          continue;
        }
        process.env[key] = snapshot[key];
      }
    });
}

test("bootstrap fails clearly when the env file is missing", async () => {
  await withCleanEnv(() => {
    assert.throws(
      () => bootstrap({ envPath: path.join(os.tmpdir(), "missing-bootstrap.env") }),
      /Missing env file/
    );
  });
});

test("bootstrap fails clearly when required DB env vars are absent", async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "bootstrap-missing-db-"));
  const envPath = path.join(tempDir, ".env");
  fs.writeFileSync(envPath, "NODE_ENV=production\nJWT_SECRET=test-secret\nSTART_EXPO=false\nEXPO_STATIC_ENABLED=false\nPORT=0\n");

  await withCleanEnv(async () => {
    try {
      await assert.rejects(() => bootstrap({ envPath }), /Missing required env var DB_HOST/);
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
});

test("bootstrap fails clearly on malformed numeric env vars", async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "bootstrap-bad-number-"));
  const envPath = path.join(tempDir, ".env");
  fs.writeFileSync(
    envPath,
    [
      "NODE_ENV=production",
      "JWT_SECRET=test-secret",
      "START_EXPO=false",
      "EXPO_STATIC_ENABLED=false",
      "PORT=0",
      "DB_HOST=127.0.0.1",
      "DB_PORT=not-a-number",
      "DB_USER=root",
      "DB_PASSWORD=root",
      "DB_DATABASE=treetracker_bootstrap_test"
    ].join("\n")
  );

  await withCleanEnv(async () => {
    try {
      await assert.rejects(() => bootstrap({ envPath }), /Invalid numeric env var DB_PORT/);
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
