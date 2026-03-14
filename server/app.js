const { bootstrap } = require("./bootstrap");

bootstrap().catch((error) => {
  console.error("[server] failed to boot", error);
  process.exit(1);
});
