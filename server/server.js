const path = require("path");
const { loadEnvFile } = require("./src/env");
const { runCli } = require("./src/main");
const { createLogger, serializeError } = require("./src/logging");

const DEFAULT_ENV_PATH = path.join(__dirname, ".env");
const logger = createLogger("server.bootstrap");

function bootstrap({ envPath = DEFAULT_ENV_PATH } = {}) {
  logger.info("bootstrap.start", { envPath });
  const result = loadEnvFile(envPath);
  logger.info("env.loaded", {
    envPath: result.path,
    parsedKeyCount: Object.keys(result.parsed || {}).length
  });
  return runCli();
}

if (require.main === module) {
  bootstrap().catch((error) => {
    logger.error("bootstrap.failed", { error: serializeError(error) });
    process.exit(1);
  });
}

module.exports = {
  bootstrap,
  DEFAULT_ENV_PATH
};
