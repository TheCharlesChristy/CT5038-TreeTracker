const path = require("path");
const fs = require("fs");
const { spawn } = require("child_process");
const { loadConfig } = require("./config");
const db = require("./db");
const { createHttpServer } = require("./http");
const { createLogger, serializeError } = require("./logging");
const { hashPassword } = require("./routes/api/utils/security");

const logger = createLogger("server");

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
    logger.info("expo.install.start", { expoPath, command: npmCommand, args: installArgs });
    await runCommand(npmCommand, installArgs, { cwd: expoPath, env: process.env });
  }

  logger.info("expo.export.start", {
    expoPath,
    distPath: path.resolve(config.expoWebDistPath),
    command: npmCommand,
    args: ["run", "export:web"]
  });
  await runCommand(npmCommand, ["run", "export:web"], { cwd: expoPath, env: process.env });
}

async function startExpo(config) {
  if (!config.startExpo || config.nodeEnv === "production") {
    return null;
  }

  const expoPath = path.resolve(config.expoProjectPath);
  if (!fs.existsSync(expoPath)) {
    logger.warn("expo.start.skipped", { reason: "missing-project-path", expoPath });
    return null;
  }

  logger.info("expo.starting", {
    expoPath,
    port: config.expoDevServerPort
  });
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
    logger.info("expo.exit", { code, signal: signal || "none" });
    if (config.expoFatalOnExit && code !== 0) {
      process.exitCode = 1;
    }
  });

  return child;
}

async function ensureDefaultDevUsers(defaultPassword) {
  const defaultPasswordHash = await hashPassword(defaultPassword);

  await db.transaction(async (tx) => {
    let adminUser = await db.users.getByUsername("admin", tx);
    if (!adminUser) {
      adminUser = await db.users.create({ username: "admin" }, tx);
    }
    await db.userPasswords.setForUser(adminUser.id, defaultPasswordHash, tx);
    await db.admins.grant(adminUser.id, tx);

    let guardianUser = await db.users.getByUsername("guardian", tx);
    if (!guardianUser) {
      guardianUser = await db.users.create({ username: "guardian" }, tx);
    }
    await db.userPasswords.setForUser(guardianUser.id, defaultPasswordHash, tx);
    await db.guardianUsers.grant(guardianUser.id, tx);
  });

  logger.info("bootstrap.dev-users.ready", {
    users: ["admin", "guardian"]
  });
}

async function bootstrap({ exitOnShutdown = false, envPath = null } = {}) {
  // Load env
  if (envPath) {
    require("dotenv").config({ path: envPath });
  } else {
    require("dotenv").config();
  }

  const config = loadConfig();
  logger.info("bootstrap.start", {
    exitOnShutdown,
    nodeEnv: config.nodeEnv,
    port: config.port,
    startExpo: config.startExpo,
    expoProxyEnabled: config.expoProxyEnabled,
    expoStaticEnabled: config.expoStaticEnabled,
    seedDevUsersEnabled: config.seedDevUsersEnabled,
    dbTestBenchEnabled: config.dbTestBenchEnabled
  });
  await prepareExpoWeb(config);
  await db.init(config.db);
  if (config.seedDevUsersEnabled) {
    await ensureDefaultDevUsers(config.seedDevUsersPassword);
  }

  const http = createHttpServer({
    port: config.port,
    db,
    dbTestBenchEnabled: config.dbTestBenchEnabled,
    dbTestBenchToken: config.dbTestBenchToken,
    frontendUrl: config.frontendUrl,
    expoProxyEnabled: config.expoProxyEnabled,
    expoStaticEnabled: config.expoStaticEnabled,
    expoWebDistPath: config.expoWebDistPath,
    expoProxyTarget: config.startExpo
      ? { host: "127.0.0.1", port: config.expoDevServerPort }
      : null
  });
  await http.start();
  logger.info("http.listening", { port: config.port });

  const expoChild = await startExpo(config);

  let shuttingDown = false;
  let signalHandlersInstalled = false;
  async function shutdown(signal) {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info("shutdown.start", { signal });

    if (expoChild && !expoChild.killed) {
      expoChild.kill("SIGTERM");
    }

    try {
      await http.stop();
    } catch (error) {
      logger.error("shutdown.http.failed", { error: serializeError(error) });
    }

    try {
      await db.close();
    } catch (error) {
      logger.error("shutdown.db.failed", { error: serializeError(error) });
    }

    if (signalHandlersInstalled) {
      process.off("SIGINT", handleSigint);
      process.off("SIGTERM", handleSigterm);
      signalHandlersInstalled = false;
    }

    if (exitOnShutdown) {
      process.exit(process.exitCode ?? 0);
    }
  }

  const handleSigint = () => shutdown("SIGINT");
  const handleSigterm = () => shutdown("SIGTERM");
  process.on("SIGINT", handleSigint);
  process.on("SIGTERM", handleSigterm);
  signalHandlersInstalled = true;

  logger.info("bootstrap.ready");

  return {
    config,
    http,
    shutdown
  };
}

async function runCli() {
  await bootstrap({ exitOnShutdown: true });
}

module.exports = {
  bootstrap,
  prepareExpoWeb,
  startExpo,
  runCli
};
