const path = require("path");
const { bootstrap } = require("./server/server.js");

const ENV_PATH = path.join(__dirname, "server", ".env");

bootstrap({ envPath: ENV_PATH }).catch((error) => {
  console.error("[app] failed to boot", error);
  process.exit(1);
});
