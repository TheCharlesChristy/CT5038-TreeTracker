const {
  init,
  close,
  health,
  transaction,
  run,
  selectOne,
  runtimeExecutor,
  toDateInput,
  ensureOrder,
  buildUpdate,
  validators
} = require("./core");
const { createAccountEndpoints } = require("./modules/accounts");
const { createTreeEndpoints } = require("./modules/trees");
const { createContentEndpoints } = require("./modules/content");
const { createWorkflows } = require("./modules/workflows");
const { createDebugEndpoints } = require("./modules/debug");
const { ValidationError, NotFoundError, ConflictError, AuthError, DbError } = require("../errors");
const { createLogger, sanitizeForLog, serializeError } = require("../logging");

const logger = createLogger("db");
const skippedTopLevelProps = new Set(["errors", "validators", "__private"]);

function isWrapCandidate(value) {
  return value && typeof value === "object";
}

function createLoggedFunction(scope, fn, receiver) {
  return function loggedDbMethod(...args) {
    const startedAt = Date.now();
    logger.debug("call.start", {
      method: scope,
      args: sanitizeForLog(args)
    });

    const logSuccess = (result) => {
      logger.info("call.success", {
        method: scope,
        durationMs: Date.now() - startedAt,
        result: sanitizeForLog(result)
      });
      return result;
    };

    const logFailure = (error) => {
      logger.error("call.failure", {
        method: scope,
        durationMs: Date.now() - startedAt,
        args: sanitizeForLog(args),
        error: serializeError(error)
      });
      throw error;
    };

    try {
      const result = Reflect.apply(fn, receiver, args);
      if (result && typeof result.then === "function") {
        return result.then(logSuccess, logFailure);
      }
      return logSuccess(result);
    } catch (error) {
      return logFailure(error);
    }
  };
}

function wrapEndpointTree(root, scope = "db", cache = new WeakMap()) {
  if (!isWrapCandidate(root)) {
    return root;
  }

  if (cache.has(root)) {
    return cache.get(root);
  }

  const proxy = new Proxy(root, {
    get(target, prop, receiver) {
      const value = Reflect.get(target, prop, receiver);

      if (typeof prop === "symbol" || skippedTopLevelProps.has(prop)) {
        return value;
      }

      const nextScope = `${scope}.${String(prop)}`;

      if (typeof value === "function") {
        return createLoggedFunction(nextScope, value, receiver);
      }

      if (isWrapCandidate(value)) {
        return wrapEndpointTree(value, nextScope, cache);
      }

      return value;
    }
  });

  cache.set(root, proxy);
  return proxy;
}

const endpointContext = {
  run,
  selectOne,
  runtimeExecutor,
  toDateInput,
  ensureOrder,
  buildUpdate,
  validators,
  NotFoundError
};

const accountEndpoints = createAccountEndpoints(endpointContext);
const treeEndpoints = createTreeEndpoints(endpointContext);
const contentEndpoints = createContentEndpoints(endpointContext);
const debugEndpoints = createDebugEndpoints(endpointContext);

const workflows = createWorkflows({
  ...endpointContext,
  transaction,
  ...accountEndpoints,
  ...treeEndpoints,
  ...contentEndpoints
});

const exportedDb = wrapEndpointTree(
  {
    init,
    close,
    health,
    transaction,
    ...accountEndpoints,
    ...treeEndpoints,
    ...contentEndpoints,
    debug: debugEndpoints,
    workflows,
    errors: {
      ValidationError,
      NotFoundError,
      ConflictError,
      AuthError,
      DbError
    }
  },
  "db"
);

logger.info("exports.ready", {
  groupCount: Object.keys(exportedDb).filter((key) => !skippedTopLevelProps.has(key)).length
});

module.exports = exportedDb;
