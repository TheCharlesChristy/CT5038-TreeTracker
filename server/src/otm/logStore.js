const MAX_ENTRIES = 500;

let nextId = 1;
const entries = [];

function append(level, scope, event, meta) {
  entries.push({
    id: nextId++,
    timestamp: new Date().toISOString(),
    level,
    scope,
    event,
    meta: meta && Object.keys(meta).length > 0 ? meta : null,
  });

  if (entries.length > MAX_ENTRIES) {
    entries.shift();
  }
}

function getEntries({ limit = 200, after = 0, level = null } = {}) {
  let result = entries.filter((e) => e.id > after);
  if (level) {
    result = result.filter((e) => e.level === level);
  }
  // Return most recent `limit` entries in chronological order
  return result.slice(-limit);
}

function getTotal() {
  return entries.length;
}

/**
 * Returns a logger-shaped object that writes to both the given base logger
 * and the in-memory log store. debug calls are forwarded but not captured
 * (too noisy for the UI).
 */
function createCapturingLogger(scope, baseLogger) {
  return {
    debug(event, meta) {
      baseLogger.debug(event, meta);
    },
    info(event, meta) {
      append("info", scope, event, meta);
      baseLogger.info(event, meta);
    },
    warn(event, meta) {
      append("warn", scope, event, meta);
      baseLogger.warn(event, meta);
    },
    error(event, meta) {
      append("error", scope, event, meta);
      baseLogger.error(event, meta);
    },
    child(extra) {
      return createCapturingLogger(scope, baseLogger.child(extra));
    },
    scope(childScope, extra) {
      return createCapturingLogger(childScope, baseLogger.scope(childScope, extra));
    },
  };
}

module.exports = { append, getEntries, getTotal, createCapturingLogger };
