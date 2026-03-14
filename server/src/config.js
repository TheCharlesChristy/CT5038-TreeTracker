const path = require("path");

function parseBool(name, fallback) {
  const value = process.env[name];
  if (value === undefined) return fallback;
  return value === "true" || value === "1";
}

function parseNumber(name, fallback) {
  const value = process.env[name];
  if (value === undefined) return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Invalid numeric env var ${name}`);
  }
  return parsed;
}

function required(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var ${name}`);
  }
  return value;
}

function loadConfig() {
  const root = path.resolve(__dirname, "..", "..");
  const startExpo = parseBool("START_EXPO", process.env.NODE_ENV !== "production");
  const expoProjectPath = process.env.EXPO_PROJECT_PATH || path.join(root, "TreeGuardiansExpo");
  return {
    nodeEnv: process.env.NODE_ENV || "development",
    port: parseNumber("PORT", 4000),
    db: {
      host: required("DB_HOST"),
      port: parseNumber("DB_PORT", 3306),
      user: required("DB_USER"),
      password: required("DB_PASSWORD"),
      database: required("DB_DATABASE"),
      connectionLimit: parseNumber("DB_CONNECTION_LIMIT", 10),
      slowQueryMs: parseNumber("DB_SLOW_QUERY_MS", 200),
      allowCreateDatabase: parseBool("DB_ALLOW_CREATE_DATABASE", true),
      schemaPath: process.env.DB_SCHEMA_PATH || path.join(__dirname, "db", "schema.sql")
    },
    startExpo,
    expoProjectPath,
    expoDevServerPort: parseNumber("EXPO_DEV_SERVER_PORT", 8081),
    expoFatalOnExit: parseBool("EXPO_FATAL_ON_EXIT", false),
    expoProxyEnabled: parseBool("EXPO_PROXY_ENABLED", startExpo),
    expoStaticEnabled: parseBool("EXPO_STATIC_ENABLED", !startExpo),
    expoWebDistPath: process.env.EXPO_WEB_DIST_PATH || path.join(expoProjectPath, "dist"),
    expoAutoPrepare: parseBool("EXPO_AUTO_PREPARE", !startExpo),
    dbTestBenchEnabled: process.env.NODE_ENV === "production"
      ? false
      : parseBool("DB_TEST_BENCH_ENABLED", false),
    dbTestBenchToken: process.env.DB_TEST_BENCH_TOKEN || null
  };
}

module.exports = {
  loadConfig
};
