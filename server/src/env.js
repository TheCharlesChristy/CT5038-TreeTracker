const fs = require("fs");
const path = require("path");
const { createLogger } = require("./logging");

const logger = createLogger("server.env");

function stripWrappingQuotes(value) {
  if (value.length >= 2) {
    const first = value[0];
    const last = value[value.length - 1];
    if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
      return value.slice(1, -1);
    }
  }

  return value;
}

function parseEnvText(text) {
  const parsed = {};

  for (const rawLine of String(text).split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    const separatorIndex = line.indexOf("=");
    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    if (!key) {
      continue;
    }

    const rawValue = line.slice(separatorIndex + 1).trim();
    parsed[key] = stripWrappingQuotes(rawValue);
  }

  return parsed;
}

function loadEnvFile(envPath, targetEnv = process.env) {
  const resolvedPath = path.resolve(envPath);
  logger.info("env.load.start", { envPath: resolvedPath });

  if (!fs.existsSync(resolvedPath)) {
    logger.error("env.load.missing", { envPath: resolvedPath });
    throw new Error(`Missing env file at ${resolvedPath}`);
  }

  const contents = fs.readFileSync(resolvedPath, "utf-8");
  const parsed = parseEnvText(contents);
  const appliedKeys = [];
  const skippedKeys = [];

  for (const [key, value] of Object.entries(parsed)) {
    if (targetEnv[key] === undefined) {
      targetEnv[key] = value;
      appliedKeys.push(key);
      continue;
    }

    skippedKeys.push(key);
  }

  logger.info("env.load.complete", {
    envPath: resolvedPath,
    parsedKeys: Object.keys(parsed).length,
    appliedKeyCount: appliedKeys.length,
    skippedKeyCount: skippedKeys.length
  });

  return {
    path: resolvedPath,
    parsed
  };
}

module.exports = {
  loadEnvFile,
  __private: {
    parseEnvText,
    stripWrappingQuotes
  }
};
