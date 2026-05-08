const path = require("path");
const { AsyncLocalStorage } = require("node:async_hooks");
const mysql = require("mysql2");
const mysqlPromise = require("mysql2/promise");

const DB_ROOT = path.resolve(__dirname).replace(/\\/g, "/");
let installed = false;

// Cheap per-call context flag - set by runWithDbAccess() at middleware entrypoints.
const dbAccessStore = new AsyncLocalStorage();

function isDbAccessAllowed() {
  return dbAccessStore.getStore() === true;
}

function runWithDbAccess(fn) {
  return dbAccessStore.run(true, fn);
}

function createLockError() {
  const error = new Error(
    "Database client is locked. Import and use server/src/db endpoints instead of direct SQL client access."
  );
  error.code = "DB_LOCK_VIOLATION";
  return error;
}

function isDbMiddlewareCaller() {
  const stack = new Error().stack || "";
  const frames = stack.split("\n").slice(2);

  for (const frame of frames) {
    if (frame.includes("runtime-lock.js") || frame.includes("node:internal")) {
      continue;
    }

    const normalizedFrame = frame.replace(/\\/g, "/");
    return normalizedFrame.includes(`${DB_ROOT}/`);
  }

  return false;
}

function lockFactory(moduleRef, methodName) {
  const original = moduleRef[methodName];
  if (typeof original !== "function" || original.__dbLockWrapped) {
    return;
  }

  function guardedDbClientFactory(...args) {
    if (!isDbMiddlewareCaller()) {
      throw createLockError();
    }

    const result = original.apply(this, args);
    if (result && typeof result.then === "function") {
      return result.then((client) => wrapClient(client));
    }
    return wrapClient(result);
  }

  guardedDbClientFactory.__dbLockWrapped = true;
  moduleRef[methodName] = guardedDbClientFactory;
}

function wrapClientMethod(client, methodName) {
  const original = client[methodName];
  if (typeof original !== "function" || original.__dbLockWrapped) {
    return;
  }

  function guardedClientMethod(...args) {
    if (!isDbAccessAllowed()) {
      throw createLockError();
    }
    return original.apply(this, args);
  }

  guardedClientMethod.__dbLockWrapped = true;
  client[methodName] = guardedClientMethod;
}

function wrapGetConnection(client) {
  const original = client.getConnection;
  if (typeof original !== "function" || original.__dbLockWrapped) {
    return;
  }

  function guardedGetConnection(...args) {
    if (!isDbAccessAllowed()) {
      throw createLockError();
    }

    const maybeCallback = args[args.length - 1];
    if (typeof maybeCallback === "function") {
      const wrappedCallback = (error, connection) => maybeCallback(error, wrapClient(connection));
      const callbackArgs = [...args.slice(0, -1), wrappedCallback];
      return original.apply(this, callbackArgs);
    }

    const result = original.apply(this, args);
    if (result && typeof result.then === "function") {
      return result.then((connection) => wrapClient(connection));
    }
    return wrapClient(result);
  }

  guardedGetConnection.__dbLockWrapped = true;
  client.getConnection = guardedGetConnection;
}

function wrapPromiseFactory(client) {
  const original = client.promise;
  if (typeof original !== "function" || original.__dbLockWrapped) {
    return;
  }

  function guardedPromiseFactory(...args) {
    if (!isDbAccessAllowed()) {
      throw createLockError();
    }
    return wrapClient(original.apply(this, args));
  }

  guardedPromiseFactory.__dbLockWrapped = true;
  client.promise = guardedPromiseFactory;
}

function wrapClient(client) {
  if (!client || typeof client !== "object") {
    return client;
  }

  if (client.__dbLockClientWrapped) {
    return client;
  }

  Object.defineProperty(client, "__dbLockClientWrapped", {
    value: true,
    enumerable: false,
    configurable: false,
    writable: false
  });

  // Second-layer lock: block raw SQL execution even if a client leaks outside middleware.
  wrapClientMethod(client, "query");
  wrapClientMethod(client, "execute");
  wrapGetConnection(client);
  wrapPromiseFactory(client);

  return client;
}

function installDbClientLock() {
  if (installed) {
    return;
  }

  // Lock both callback and promise APIs to block direct pool/connection creation.
  lockFactory(mysql, "createConnection");
  lockFactory(mysql, "createPool");
  lockFactory(mysql, "createPoolCluster");
  lockFactory(mysqlPromise, "createConnection");
  lockFactory(mysqlPromise, "createPool");

  installed = true;
}

module.exports = {
  installDbClientLock,
  runWithDbAccess
};
