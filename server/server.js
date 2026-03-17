const path = require("path");
const { loadEnvFile } = require("./src/env");
const { runCli } = require("./src/main");

const DEFAULT_ENV_PATH = path.join(__dirname, ".env");

function bootstrap({ envPath = DEFAULT_ENV_PATH } = {}) {
  const result = loadEnvFile(envPath);
  console.log(`[server] loaded env from ${result.path}`);
  return runCli();
}

if (require.main === module) {
  bootstrap().catch((error) => {
    console.error("[server] failed to boot", error);
    process.exit(1);
  });
}

module.exports = {
  bootstrap,
  DEFAULT_ENV_PATH
};
