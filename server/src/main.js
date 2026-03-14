const path = require("path");
const fs = require("fs");
const { spawn } = require("child_process");
const { loadConfig } = require("./config");
const db = require("./db");
const { createHttpServer } = require("./http");

function runCommand(command, args, options) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { ...options, stdio: "inherit" });

    child.on("error", reject);
    child.on("exit", (code, signal) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(
        new Error(
          `${command} ${args.join(" ")} failed with code=${code} signal=${signal || "none"}`
        )
      );
    });
  });
}

async function prepareExpoWeb(config) {
  if (!config.expoStaticEnabled || !config.expoAutoPrepare) {
    return;
  }

  const expoPath = path.resolve(config.expoProjectPath);
  if (!fs.existsSync(expoPath)) {
    throw new Error(`EXPO_PROJECT_PATH does not exist (${expoPath})`);
  }

  const packageJsonPath = path.join(expoPath, "package.json");
  if (!fs.existsSync(packageJsonPath)) {
    throw new Error(`Expo project is missing package.json (${packageJsonPath})`);
  }

  const nodeModulesPath = path.join(expoPath, "node_modules");
  const hasNodeModules = fs.existsSync(nodeModulesPath);
  const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";

  if (!hasNodeModules) {
    const installArgs = fs.existsSync(path.join(expoPath, "package-lock.json")) ? ["ci"] : ["install"];
    console.log(`[server] installing Expo web dependencies in ${expoPath}`);
    await runCommand(npmCommand, installArgs, { cwd: expoPath, env: process.env });
  }

  console.log(`[server] exporting Expo web bundle to ${path.resolve(config.expoWebDistPath)}`);
  await runCommand(npmCommand, ["run", "export:web"], { cwd: expoPath, env: process.env });
}

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
  const child = spawn(expoCommand, ["expo", "start", "--port", String(config.expoDevServerPort)], {
    cwd: expoPath,
    stdio: "inherit",
    env: {
      ...process.env,
      EXPO_DEVTOOLS_LISTEN_ADDRESS: process.env.EXPO_DEVTOOLS_LISTEN_ADDRESS || "0.0.0.0"
    }
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
  await prepareExpoWeb(config);
  await db.init(config.db);

  const http = createHttpServer({
    port: config.port,
    db,
    dbTestBenchEnabled: config.dbTestBenchEnabled,
    dbTestBenchToken: config.dbTestBenchToken,
    expoProxyEnabled: config.expoProxyEnabled,
    expoStaticEnabled: config.expoStaticEnabled,
    expoWebDistPath: config.expoWebDistPath,
    expoProxyTarget: config.startExpo
      ? { host: "127.0.0.1", port: config.expoDevServerPort }
      : null
  });
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

    process.exit(process.exitCode ?? 0);
  }

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));

  console.log("[server] ready");
}

bootstrap().catch((error) => {
  console.error("[server] failed to boot", error);
  process.exit(1);
});
