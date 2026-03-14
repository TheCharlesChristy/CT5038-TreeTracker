const http = require("http");
const fs = require("fs");
const path = require("path");

const MAX_JSON_BODY_BYTES = 2 * 1024 * 1024;
const MIME_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".gif": "image/gif",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2"
};

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
        const parsed = JSON.parse(raw);
        settled = true;
        resolve(parsed);
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

function sendStaticFile(req, res, filePath) {
  const extension = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[extension] || "application/octet-stream";
  const stat = fs.statSync(filePath);

  res.writeHead(200, {
    "content-type": contentType,
    "content-length": stat.size
  });

  if (req.method === "HEAD") {
    res.end();
    return;
  }

  fs.createReadStream(filePath)
    .on("error", () => {
      if (!res.headersSent) {
        res.writeHead(500, { "content-type": "text/plain; charset=utf-8" });
      }
      res.end("Failed to read static file");
    })
    .pipe(res);
}

function resolveStaticRoute(staticRoot, pathname) {
  const decodedPath = decodeURIComponent(pathname);
  const trimmedPath = decodedPath.replace(/^\/+/, "");
  const candidatePath = path.resolve(staticRoot, `.${path.sep}${trimmedPath}`);

  if (candidatePath !== staticRoot && !candidatePath.startsWith(`${staticRoot}${path.sep}`)) {
    return null;
  }

  if (fs.existsSync(candidatePath)) {
    const stat = fs.statSync(candidatePath);
    if (stat.isFile()) {
      return candidatePath;
    }
    if (stat.isDirectory()) {
      const indexPath = path.join(candidatePath, "index.html");
      if (fs.existsSync(indexPath) && fs.statSync(indexPath).isFile()) {
        return indexPath;
      }
    }
  }

  const htmlCandidate = path.resolve(staticRoot, `.${path.sep}${trimmedPath}.html`);
  if (
    htmlCandidate.startsWith(`${staticRoot}${path.sep}`) &&
    fs.existsSync(htmlCandidate) &&
    fs.statSync(htmlCandidate).isFile()
  ) {
    return htmlCandidate;
  }

  const spaFallback = path.join(staticRoot, "index.html");
  if (fs.existsSync(spaFallback) && fs.statSync(spaFallback).isFile()) {
    return spaFallback;
  }

  return null;
}

function toErrorStatus(error) {
  const code = error?.name || error?.code;
  if (code === "UnsupportedMediaTypeError") return 415;
  if (code === "ValidationError") return 400;
  if (code === "PayloadTooLargeError") return 413;
  if (code === "AuthError") return 401;
  if (code === "ForbiddenError") return 403;
  if (code === "NotFoundError") return 404;
  if (code === "ConflictError") return 409;
  return 500;
}

function contentTypeIsJson(value) {
  return String(value || "")
    .toLowerCase()
    .split(";")[0]
    .trim() === "application/json";
}

function createAuthError(name, message) {
  const error = new Error(message);
  error.name = name;
  return error;
}

function sendProxyError(res, error) {
  if (res.headersSent) {
    res.end();
    return;
  }

  sendJson(res, 502, {
    error: error?.message || "Expo dev server is unavailable",
    code: "BadGatewayError"
  });
}

function proxyHttpRequest(req, res, target) {
  const proxyReq = http.request(
    {
      host: target.host,
      port: target.port,
      method: req.method,
      path: req.url,
      headers: {
        ...req.headers,
        host: `${target.host}:${target.port}`
      }
    },
    (proxyRes) => {
      res.writeHead(proxyRes.statusCode || 502, proxyRes.headers);
      proxyRes.pipe(res);
    }
  );

  proxyReq.on("error", (error) => {
    sendProxyError(res, error);
  });

  req.pipe(proxyReq);
}

function proxyUpgradeRequest(req, socket, head, target) {
  const proxyReq = http.request({
    host: target.host,
    port: target.port,
    method: req.method,
    path: req.url,
    headers: {
      ...req.headers,
      connection: req.headers.connection || "Upgrade",
      host: `${target.host}:${target.port}`
    }
  });

  proxyReq.on("upgrade", (proxyRes, proxySocket, proxyHead) => {
    const statusMessage = proxyRes.statusMessage || "Switching Protocols";
    socket.write(`HTTP/1.1 ${proxyRes.statusCode || 101} ${statusMessage}\r\n`);

    for (const [key, value] of Object.entries(proxyRes.headers)) {
      if (value === undefined) {
        continue;
      }
      if (Array.isArray(value)) {
        for (const item of value) {
          socket.write(`${key}: ${item}\r\n`);
        }
        continue;
      }
      socket.write(`${key}: ${value}\r\n`);
    }

    socket.write("\r\n");

    if (head?.length) {
      proxySocket.write(head);
    }
    if (proxyHead?.length) {
      socket.write(proxyHead);
    }

    proxySocket.pipe(socket);
    socket.pipe(proxySocket);
  });

  proxyReq.on("error", () => {
    socket.destroy();
  });

  proxyReq.end();
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

function createHttpServer({
  port,
  db,
  dbTestBenchEnabled = false,
  dbTestBenchToken = null,
  expoProxyEnabled = false,
  expoStaticEnabled = false,
  expoWebDistPath = null,
  expoProxyTarget = null
}) {
  if (dbTestBenchEnabled && !dbTestBenchToken) {
    throw new Error(
      "DB_TEST_BENCH_ENABLED is set but no DB_TEST_BENCH_TOKEN was provided. " +
      "The testbench can invoke write-capable DB endpoints and must not run unauthenticated."
    );
  }

  const endpointMap = listDbEndpoints(db);
  const flatEndpoints = flattenEndpointMap(endpointMap);
  const staticRoot = expoStaticEnabled && expoWebDistPath ? path.resolve(expoWebDistPath) : null;

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
        authorizeTestBench(req, dbTestBenchToken);
        sendJson(res, 200, {
          endpoints: endpointMap,
          flatEndpoints
        });
        return;
      }

      if (dbTestBenchEnabled && req.method === "POST" && url.pathname === "/db/testbench/invoke") {
        authorizeTestBench(req, dbTestBenchToken);

        if (!contentTypeIsJson(req.headers["content-type"])) {
          req.resume();
          const unsupported = new Error("Content-Type must be application/json");
          unsupported.name = "UnsupportedMediaTypeError";
          throw unsupported;
        }

        const body = await parseJsonBody(req);
        if (!body || typeof body !== "object" || Array.isArray(body) || !body.endpoint) {
          const payloadError = new Error("Request body must include endpoint");
          payloadError.name = "ValidationError";
          throw payloadError;
        }

        if (!flatEndpoints.includes(body.endpoint)) {
          sendJson(res, 404, { error: "Unknown endpoint", code: "NotFoundError" });
          return;
        }
        const fn = resolveDbEndpoint(db, body.endpoint);
        if (!fn) {
          sendJson(res, 404, { error: "Unknown endpoint", code: "NotFoundError" });
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

      if (expoProxyEnabled && expoProxyTarget) {
        proxyHttpRequest(req, res, expoProxyTarget);
        return;
      }

      if (staticRoot && (req.method === "GET" || req.method === "HEAD")) {
        const staticFilePath = resolveStaticRoute(staticRoot, url.pathname);
        if (staticFilePath) {
          sendStaticFile(req, res, staticFilePath);
          return;
        }
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

  if (expoProxyEnabled && expoProxyTarget) {
    server.on("upgrade", (req, socket, head) => {
      proxyUpgradeRequest(req, socket, head, expoProxyTarget);
    });
  }

  return {
    start() {
      return new Promise((resolve, reject) => {
        const onError = (error) => {
          server.off("listening", onListening);
          reject(error);
        };
        const onListening = () => {
          server.off("error", onError);
          resolve(server);
        };

        server.once("error", onError);
        server.once("listening", onListening);
        server.listen(port);
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
