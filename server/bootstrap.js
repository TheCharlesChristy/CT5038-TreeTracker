const { bootstrap, DEFAULT_ENV_PATH } = require("./server");

if (require.main === module) {
  bootstrap().catch((error) => {
    console.error("[bootstrap] failed to boot", error);
    process.exit(1);
  });
}

module.exports = {
  bootstrap,
  DEFAULT_ENV_PATH
};
