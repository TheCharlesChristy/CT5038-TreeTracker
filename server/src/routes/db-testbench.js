const express = require("express");
const { asyncHandler } = require("./middleware/async-handler");

function listDbEndpoints(db) {
  const endpointMap = {};

  for (const [groupName, value] of Object.entries(db)) {
    if (["init", "close", "health", "transaction", "errors"].includes(groupName)) {
      continue;
    }
    if (!value || typeof value !== "object") {
      continue;
    }

    const methods = {};
    for (const [methodName, candidate] of Object.entries(value)) {
      if (typeof candidate === "function") {
        methods[methodName] = `${groupName}.${methodName}`;
        continue;
      }

      if (candidate && typeof candidate === "object") {
        const nestedMethods = Object.keys(candidate).filter((name) => typeof candidate[name] === "function");
        if (nestedMethods.length > 0) {
          methods[methodName] = nestedMethods.reduce((acc, nestedMethod) => {
            acc[nestedMethod] = `${groupName}.${methodName}.${nestedMethod}`;
            return acc;
          }, {});
        }
      }
    }

    if (Object.keys(methods).length > 0) {
      endpointMap[groupName] = methods;
    }
  }

  return endpointMap;
}

function flattenEndpointMap(endpointMap) {
  const flat = [];

  for (const value of Object.values(endpointMap)) {
    for (const method of Object.values(value)) {
      if (typeof method === "string") {
        flat.push(method);
        continue;
      }
      for (const nested of Object.values(method)) {
        flat.push(nested);
      }
    }
  }

  return flat.sort();
}

function resolveDbEndpoint(db, endpointPath) {
  const parts = String(endpointPath || "")
    .split(".")
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length < 2 || parts.length > 3) {
    return null;
  }

  let owner = db;
  let candidate = db[parts[0]];
  for (let index = 1; index < parts.length; index += 1) {
    if (!candidate || typeof candidate !== "object") {
      return null;
    }
    owner = candidate;
    candidate = candidate[parts[index]];
  }

  if (typeof candidate !== "function") {
    return null;
  }

  return candidate.bind(owner);
}

function createAuthError(name, message) {
  const error = new Error(message);
  error.name = name;
  return error;
}

function authorizeTestBench(req, token) {
  if (!token) {
    throw createAuthError("InternalError", "Testbench is enabled but no token is configured");
  }

  const authHeader = String(req.headers.authorization || "");
  const bearerPrefix = "bearer ";
  const bearerToken = authHeader.toLowerCase().startsWith(bearerPrefix)
    ? authHeader.slice(bearerPrefix.length).trim()
    : null;
  const headerToken = req.headers["x-testbench-token"];
  const providedToken = bearerToken || (typeof headerToken === "string" ? headerToken : null);

  if (!providedToken) {
    throw createAuthError("AuthError", "Missing testbench authorization token");
  }

  if (providedToken !== token) {
    throw createAuthError("ForbiddenError", "Invalid testbench authorization token");
  }
}

function createDbTestBenchRouter({ db, token }) {
  const router = express.Router();
  const endpointMap = listDbEndpoints(db);
  const flatEndpoints = flattenEndpointMap(endpointMap);

  router.get(
    "/endpoints",
    asyncHandler(async (req, res) => {
      authorizeTestBench(req, token);
      res.json({ endpoints: endpointMap, flatEndpoints });
    })
  );

  router.post(
    "/invoke",
    asyncHandler(async (req, res) => {
      authorizeTestBench(req, token);

      if (!req.is("application/json")) {
        const unsupported = new Error("Content-Type must be application/json");
        unsupported.name = "UnsupportedMediaTypeError";
        throw unsupported;
      }

      if (!req.body || typeof req.body !== "object" || Array.isArray(req.body) || !req.body.endpoint) {
        const payloadError = new Error("Request body must include endpoint");
        payloadError.name = "ValidationError";
        throw payloadError;
      }

      if (!flatEndpoints.includes(req.body.endpoint)) {
        res.status(404).json({ error: "Unknown endpoint", code: "NotFoundError" });
        return;
      }

      const fn = resolveDbEndpoint(db, req.body.endpoint);
      if (!fn) {
        res.status(404).json({ error: "Unknown endpoint", code: "NotFoundError" });
        return;
      }

      const args = Array.isArray(req.body.args) ? req.body.args : [];
      const result = await fn(...args);
      res.json({ endpoint: req.body.endpoint, result });
    })
  );

  return router;
}

module.exports = {
  createDbTestBenchRouter
};
