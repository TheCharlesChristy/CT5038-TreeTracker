const http = require("http");

const MAX_JSON_BODY_BYTES = 2 * 1024 * 1024;

function applyCorsHeaders(res) {
  res.setHeader("access-control-allow-origin", "*");
  res.setHeader("access-control-allow-methods", "GET,POST,OPTIONS");
  res.setHeader("access-control-allow-headers", "content-type,authorization");
  res.setHeader("access-control-max-age", "86400");
}

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

function payloadTooLargeError() {
  const error = new Error(`Request body exceeds ${MAX_JSON_BODY_BYTES} bytes`);
  error.name = "PayloadTooLargeError";
  return error;
}

async function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    let settled = false;

    const finishWithError = (error) => {
      if (settled) {
        return;
      }
      settled = true;
      reject(error);
    };

    const contentLengthHeader = Number(req.headers["content-length"]);
    if (Number.isFinite(contentLengthHeader) && contentLengthHeader > MAX_JSON_BODY_BYTES) {
      finishWithError(payloadTooLargeError());
      req.resume();
      return;
    }

    req.on("data", (chunk) => {
      if (settled) {
        return;
      }

      size += chunk.length;
      if (size > MAX_JSON_BODY_BYTES) {
        finishWithError(payloadTooLargeError());
        req.resume();
        return;
      }

      chunks.push(chunk);
    });

    req.on("end", () => {
      if (settled) {
        return;
      }

      const raw = Buffer.concat(chunks).toString("utf-8");
      if (!raw) {
        settled = true;
        resolve({});
        return;
      }

      try {
        settled = true;
        resolve(JSON.parse(raw));
      } catch (error) {
        const parseError = new Error("Invalid JSON body");
        parseError.name = "ValidationError";
        finishWithError(parseError);
      }
    });

    req.on("error", (error) => {
      finishWithError(error);
    });
  });
}

function sendJson(res, status, payload) {
  applyCorsHeaders(res);
  res.writeHead(status, { "content-type": "application/json" });
  res.end(JSON.stringify(payload));
}

function toErrorStatus(error) {
  const code = error?.name || error?.code;
  if (code === "ValidationError") return 400;
  if (code === "PayloadTooLargeError") return 413;
  if (code === "AuthError") return 401;
  if (code === "NotFoundError") return 404;
  if (code === "ConflictError") return 409;
  return 500;
}

function createHttpServer({ port, db, dbTestBenchEnabled = false }) {
  const endpointMap = listDbEndpoints(db);
  const flatEndpoints = flattenEndpointMap(endpointMap);

  const server = http.createServer(async (req, res) => {
    if (req.method === "OPTIONS") {
      applyCorsHeaders(res);
      res.writeHead(204);
      res.end();
      return;
    }

    try {
      let url;
      try {
        url = new URL(req.url || "/", "http://localhost");
      } catch {
        sendJson(res, 400, { error: "Bad request", code: "BadRequestError" });
        return;
      }
      if (req.method === "GET" && url.pathname === "/health") {
        sendJson(res, 200, { status: "ok" });
        return;
      }

      if (req.method === "GET" && url.pathname === "/db/health") {
        const health = await db.health();
        sendJson(res, health.ready ? 200 : 503, health);
        return;
      }

      if (dbTestBenchEnabled && req.method === "GET" && url.pathname === "/db/testbench/endpoints") {
        sendJson(res, 200, {
          endpoints: endpointMap,
          flatEndpoints
        });
        return;
      }

      if (dbTestBenchEnabled && req.method === "POST" && url.pathname === "/db/testbench/invoke") {
        const body = await parseJsonBody(req);
        if (!flatEndpoints.includes(body.endpoint)) {
          sendJson(res, 404, { error: "Unknown endpoint" });
          return;
        }
        const fn = resolveDbEndpoint(db, body.endpoint);
        if (!fn) {
          sendJson(res, 404, { error: "Unknown endpoint" });
          return;
        }

        const args = Array.isArray(body.args) ? body.args : [];
        const result = await fn(...args);
        sendJson(res, 200, {
          endpoint: body.endpoint,
          result
        });
        return;
      }

      sendJson(res, 404, { error: "Not found" });
    } catch (error) {
      const status = toErrorStatus(error);
      sendJson(res, status, {
        error: error?.message || "Internal server error",
        code: error?.name || error?.code || "InternalError"
      });
    }
  });

  return {
    start() {
      return new Promise((resolve) => {
        server.listen(port, () => resolve(server));
      });
    },
    stop() {
      return new Promise((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error);
            return;
          }
          resolve();
        });
      });
    }
  };
}

module.exports = {
  createHttpServer
};