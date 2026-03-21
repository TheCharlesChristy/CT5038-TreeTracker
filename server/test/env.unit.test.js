const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { loadEnvFile, __private } = require("../src/env");

test("parseEnvText handles comments and wrapped values", () => {
  const parsed = __private.parseEnvText(`
    # comment
    DB_HOST=mysql
    DB_PASSWORD="secret value"
    EXPO_AUTO_PREPARE='false'
  `);

  assert.deepEqual(parsed, {
    DB_HOST: "mysql",
    DB_PASSWORD: "secret value",
    EXPO_AUTO_PREPARE: "false"
  });
});

test("loadEnvFile sets only missing keys", () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "env-load-"));
  const envPath = path.join(tempDir, ".env");
  fs.writeFileSync(envPath, "DB_HOST=mysql\nPORT=4000\n");

  const targetEnv = { PORT: "9000" };
  const result = loadEnvFile(envPath, targetEnv);

  try {
    assert.equal(result.path, envPath);
    assert.equal(targetEnv.DB_HOST, "mysql");
    assert.equal(targetEnv.PORT, "9000");
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});
