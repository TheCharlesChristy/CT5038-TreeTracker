const path = require("path");
const fs = require("fs");
const { spawn } = require("child_process");
const { loadConfig } = require("./config");
const db = require("./db");
const { createHttpServer } = require("./http");

async function startExpo(config) {
  if (!config.startExpo || config.nodeEnv === "production") {
    return null;
  }

  const expoPath = path.resolve(config.expoProjectPath);
  if (!fs.existsSync(expoPath)) {
    console.warn(`[server] skipping Expo start: EXPO_PROJECT_PATH does not exist (${expoPath})`);
    return null;
  }

  const expoCommand = process.platform === "win32" ? "npx.cmd" : "npx";
  const child = spawn(expoCommand, ["expo", "start"], {
    cwd: expoPath,
    stdio: "inherit"
  });

  child.on("exit", (code, signal) => {
    console.log(`[server] Expo exited code=${code} signal=${signal || "none"}`);
    if (config.expoFatalOnExit && code !== 0) {
      process.exitCode = 1;
    }
  });

  return child;
}

async function bootstrap() {
  const config = loadConfig();
  await db.init(config.db);

  const http = createHttpServer({ port: config.port, db, dbTestBenchEnabled: config.dbTestBenchEnabled });
  await http.start();
  console.log(`[server] HTTP listening on :${config.port}`);

  const expoChild = await startExpo(config);

  let shuttingDown = false;
  async function shutdown(signal) {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`[server] shutdown requested via ${signal}`);

    if (expoChild && !expoChild.killed) {
      expoChild.kill("SIGTERM");
    }

    try {
      await http.stop();
    } catch (error) {
      console.error("[server] failed stopping HTTP server", error);
    }

    try {
      await db.close();
    } catch (error) {
      console.error("[server] failed closing DB", error);
    }

    process.exit(0);
  }

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));

  console.log("[server] ready");
}

bootstrap().catch((error) => {
  console.error("[server] failed to boot", error);
  process.exit(1);
});
