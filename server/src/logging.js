const LEVEL_PRIORITY = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40
};

const DEFAULT_MAX_DEPTH = 4;
const DEFAULT_MAX_ITEMS = 20;
const DEFAULT_MAX_KEYS = 25;
const DEFAULT_MAX_STRING_LENGTH = 240;
const SENSITIVE_KEY_PATTERN = /(password|token|secret|authorization|cookie|session|api[-_]?key)/i;

function normalizeLevel(level) {
  return LEVEL_PRIORITY[level] ? level : null;
}

function getConfiguredLevel() {
  const configured = normalizeLevel(String(process.env.LOG_LEVEL || "").toLowerCase());
  if (configured) {
    return configured;
  }

  return process.env.NODE_ENV === "production" ? "info" : "debug";
}

function shouldLog(level) {
  return LEVEL_PRIORITY[level] >= LEVEL_PRIORITY[getConfiguredLevel()];
}

function truncateString(value, maxLength = DEFAULT_MAX_STRING_LENGTH) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength)}... [truncated ${value.length - maxLength} chars]`;
}

function serializeError(error) {
  if (!error || typeof error !== "object") {
    return error;
  }

  return {
    name: error.name || "Error",
    message: error.message || String(error),
    code: error.code || null,
    errno: error.errno || null,
    sqlState: error.sqlState || null,
    stack: typeof error.stack === "string" ? truncateString(error.stack, 2000) : null
  };
}

function sanitizeForLog(value, options = {}, depth = 0, seen = new WeakSet()) {
  const maxDepth = options.maxDepth ?? DEFAULT_MAX_DEPTH;
  const maxItems = options.maxItems ?? DEFAULT_MAX_ITEMS;
  const maxKeys = options.maxKeys ?? DEFAULT_MAX_KEYS;
  const maxStringLength = options.maxStringLength ?? DEFAULT_MAX_STRING_LENGTH;

  if (value === undefined || value === null) {
    return value;
  }

  if (typeof value === "string") {
    return truncateString(value, maxStringLength);
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return value;
  }

  if (typeof value === "bigint") {
    return `${value}n`;
  }

  if (typeof value === "function") {
    return `[Function ${value.name || "anonymous"}]`;
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? "[Invalid Date]" : value.toISOString();
  }

  if (Buffer.isBuffer(value)) {
    return `[Buffer ${value.length} bytes]`;
  }

  if (value instanceof Error) {
    return serializeError(value);
  }

  if (typeof value !== "object") {
    return String(value);
  }

  if (value && value.__txConn) {
    return "[transaction]";
  }

  if (seen.has(value)) {
    return "[Circular]";
  }

  if (depth >= maxDepth) {
    return Array.isArray(value) ? "[Array]" : "[Object]";
  }

  seen.add(value);

  if (Array.isArray(value)) {
    return value.slice(0, maxItems).map((entry) => sanitizeForLog(entry, options, depth + 1, seen));
  }

  const entries = Object.entries(value).slice(0, maxKeys);
  const result = {};

  for (const [key, entry] of entries) {
    if (SENSITIVE_KEY_PATTERN.test(key)) {
      result[key] = "[REDACTED]";
      continue;
    }

    result[key] = sanitizeForLog(entry, options, depth + 1, seen);
  }

  return result;
}

function writeLog(level, scope, event, meta) {
  if (!shouldLog(level)) {
    return;
  }

  const payload = meta && Object.keys(meta).length > 0 ? ` ${JSON.stringify(sanitizeForLog(meta))}` : "";
  const line = `[${new Date().toISOString()}] [${level}] [${scope}] ${event}${payload}`;

  if (level === "error") {
    console.error(line);
    return;
  }

  if (level === "warn") {
    console.warn(line);
    return;
  }

  console.log(line);
}

function createLogger(scope, baseMeta = {}) {
  function log(level, event, meta = {}) {
    writeLog(level, scope, event, { ...baseMeta, ...meta });
  }

  return {
    debug(event, meta) {
      log("debug", event, meta);
    },
    info(event, meta) {
      log("info", event, meta);
    },
    warn(event, meta) {
      log("warn", event, meta);
    },
    error(event, meta) {
      log("error", event, meta);
    },
    child(extraMeta = {}) {
      return createLogger(scope, { ...baseMeta, ...extraMeta });
    },
    scope(childScope, extraMeta = {}) {
      return createLogger(childScope, { ...baseMeta, ...extraMeta });
    }
  };
}

function wrapMethodsWithLogging(target, logger, options = {}) {
  const cache = new Map();

  return new Proxy(target, {
    get(obj, prop, receiver) {
      const value = Reflect.get(obj, prop, receiver);
      if (typeof value !== "function") {
        return value;
      }

      if (cache.has(prop)) {
        return cache.get(prop);
      }

      const wrapped = function wrappedMethod(...args) {
        const startedAt = Date.now();
        const callMeta = options.buildCallMeta ? options.buildCallMeta(prop, args) : { args };

        const logSuccess = (result) => {
          const successMeta = options.buildSuccessMeta ? options.buildSuccessMeta(prop, result, args) : { result };
          const successLevel = options.successLevel || "debug";
          logger[successLevel]("method.success", {
            method: String(prop),
            durationMs: Date.now() - startedAt,
            ...successMeta
          });
          return result;
        };

        const logFailure = (error) => {
          logger.error("method.failure", {
            method: String(prop),
            durationMs: Date.now() - startedAt,
            ...callMeta,
            error
          });
          throw error;
        };

        try {
          const result = Reflect.apply(value, receiver, args);
          if (result && typeof result.then === "function") {
            return result.then(logSuccess, logFailure);
          }
          return logSuccess(result);
        } catch (error) {
          return logFailure(error);
        }
      };

      cache.set(prop, wrapped);
      return wrapped;
    }
  });
}

module.exports = {
  createLogger,
  sanitizeForLog,
  serializeError,
  wrapMethodsWithLogging
};
