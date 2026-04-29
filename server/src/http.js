const http = require("http");
const fs = require("fs");
const path = require("path");
const express = require("express");
const { createHealthRouter } = require("./routes/health");
const { createDbTestBenchRouter } = require("./routes/db-testbench");
const { createApiRouter } = require("./routes/api");
const { createLogger, sanitizeForLog, serializeError } = require("./logging");
const { DEFAULT_UPLOADS_DIR, ensureUploadsDirExists } = require("./routes/api/uploads");
const { loadOtmConfig } = require("./otm/config");
const { createOtmClient } = require("./otm/client");
const { createTtlCache } = require("./otm/cache");
const { createOtmSyncQueue } = require("./otm/syncQueue");

const MAX_JSON_BODY_BYTES = 1 * 1024 * 1024;
const logger = createLogger("http");
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
  res.setHeader("access-control-allow-methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
  res.setHeader("access-control-allow-headers", "content-type,authorization");
  res.setHeader("access-control-max-age", "86400");
}

function sendJson(res, status, payload) {
  if (typeof res.status === "function") {
    applyCorsHeaders(res);
    res.status(status).json(payload);
    return;
  }

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
    .on("error", (error) => {
      logger.error("static.read.failed", {
        method: req.method,
        path: req.originalUrl || req.url,
        filePath,
        error: serializeError(error)
      });
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
  if (code === "MulterError") {
    if (error?.code === "LIMIT_FILE_SIZE" || error?.code === "LIMIT_FILE_COUNT") {
      return 413;
    }
    return 400;
  }

  if (error?.type === "entity.too.large") return 413;
  if (error instanceof SyntaxError && error?.status === 400 && "body" in error) return 400;

  return 500;
}

function shouldReturnVerboseErrors() {
  if (process.env.HTTP_VERBOSE_ERRORS === "1") {
    return true;
  }

  if (process.env.HTTP_VERBOSE_ERRORS === "0") {
    return false;
  }

  return process.env.NODE_ENV === "development";
}

function sanitizeForJson(value, maxLength = 8000) {
  if (value === undefined) {
    return undefined;
  }

  return sanitizeForLog(value, { maxStringLength: maxLength });
}

function serializeErrorCauseChain(error, maxDepth = 5) {
  const chain = [];
  let current = error;
  let depth = 0;

  while (current && depth < maxDepth) {
    chain.push({
      name: current.name || null,
      code: current.code || null,
      errno: current.errno || null,
      message: current.message || null,
      sqlState: current.sqlState || null,
      sqlMessage: current.sqlMessage || null,
      sql: current.sql || null,
      stack: typeof current.stack === "string" ? current.stack : null
    });

    current = current.cause;
    depth += 1;
  }

  return chain;
}

function buildErrorPayload(error, req, status) {
  let message = error?.message || "Internal server error";
  if (
    status === 413 &&
    (error?.name === "PayloadTooLargeError" || error?.type === "entity.too.large")
  ) {
    message = `Request body exceeds ${Math.floor(MAX_JSON_BODY_BYTES / (1024 * 1024))}MB limit`;
  }
  if (error?.name === "MulterError") {
    if (error?.code === "LIMIT_FILE_SIZE") {
      message = "Uploaded file exceeds 10MB limit";
    } else if (error?.code === "LIMIT_FILE_COUNT") {
      message = "Too many files uploaded";
    } else if (error?.code === "LIMIT_UNEXPECTED_FILE") {
      message = error?.message || "Unexpected upload file";
    }
  }

  const payload = {
    error: message,
    code: error?.name || error?.code || "InternalError"
  };

  const requestId = req?.requestId || `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const causeChain = serializeErrorCauseChain(error);

  logger.error("request.error", {
    requestId,
    status,
    method: req?.method || null,
    path: req?.originalUrl || req?.url || null,
    code: payload.code,
    message: payload.error,
    causeChain,
    params: sanitizeForLog(req?.params),
    query: sanitizeForLog(req?.query),
    body: sanitizeForLog(req?.body)
  });

  if (!shouldReturnVerboseErrors()) {
    return payload;
  }

  payload.debug = {
    requestId,
    status,
    method: req?.method || null,
    path: req?.originalUrl || req?.url || null,
    params: sanitizeForJson(req?.params),
    query: sanitizeForJson(req?.query),
    body: sanitizeForJson(req?.body),
    causeChain
  };

  return payload;
}

function sendProxyError(res, error) {
  logger.error("proxy.request.failed", {
    error: serializeError(error)
  });

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
  logger.debug("proxy.request.start", {
    method: req.method,
    path: req.originalUrl || req.url,
    target
  });

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
      logger.debug("proxy.request.success", {
        method: req.method,
        path: req.originalUrl || req.url,
        status: proxyRes.statusCode || 502,
        target
      });
      applyCorsHeaders(res);
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
  logger.debug("proxy.upgrade.start", {
    method: req.method,
    path: req.url,
    target
  });
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
    logger.warn("proxy.upgrade.failed", {
      method: req.method,
      path: req.url,
      target
    });
    socket.destroy();
  });

  proxyReq.end();
}

function createRequestId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function createHttpServer({
  port,
  db,
  frontendUrl = null,
  dbTestBenchEnabled = false,
  dbTestBenchToken = null,
  expoProxyEnabled = false,
  expoStaticEnabled = false,
  expoWebDistPath = null,
  expoProxyTarget = null
}) {
  const otmConfig = loadOtmConfig();
  const otmClient = createOtmClient(otmConfig);
  const otmTreeCache = createTtlCache(otmConfig.cacheTtlMs);
  const otmSpeciesCache = createTtlCache(otmConfig.speciesCacheTtlMs);
  const otmSyncQueue = createOtmSyncQueue({ otmClient, otmConfig, db });
  if (dbTestBenchEnabled && !dbTestBenchToken) {
    throw new Error(
      "DB_TEST_BENCH_ENABLED is set but no DB_TEST_BENCH_TOKEN was provided. " +
      "The testbench can invoke write-capable DB endpoints and must not run unauthenticated."
    );
  }

  const staticRoot = expoStaticEnabled && expoWebDistPath ? path.resolve(expoWebDistPath) : null;
  const app = express();

  logger.info("server.configure", {
    port,
    dbTestBenchEnabled,
    expoProxyEnabled,
    expoStaticEnabled,
    staticRoot,
    expoProxyTarget
  });

  ensureUploadsDirExists(DEFAULT_UPLOADS_DIR);

  app.use((req, res, next) => {
    req.requestId = createRequestId();
    req.log = logger.child({ requestId: req.requestId });
    const startedAt = Date.now();
    res.setHeader("x-request-id", req.requestId);

    req.log.info("request.start", {
      method: req.method,
      path: req.originalUrl || req.url,
      contentType: req.headers["content-type"] || null,
      contentLength: req.headers["content-length"] || null,
      ip: req.ip || req.socket?.remoteAddress || null
    });

    let settled = false;
    const logCompletion = (event) => {
      if (settled) {
        return;
      }
      settled = true;
      req.log.info(`request.${event}`, {
        method: req.method,
        path: req.originalUrl || req.url,
        status: res.statusCode,
        durationMs: Date.now() - startedAt
      });
    };

    res.on("finish", () => logCompletion("finish"));
    res.on("close", () => logCompletion("close"));

    applyCorsHeaders(res);
    if (req.method === "OPTIONS") {
      res.status(204).end();
      return;
    }
    next();
  });

  app.use(express.json({ limit: MAX_JSON_BODY_BYTES }));
  app.use(express.urlencoded({ extended: true, limit: MAX_JSON_BODY_BYTES }));
  // The global error handler at the bottom already handles entity too large. Which is why this block is removed
  app.use("/uploads", express.static(DEFAULT_UPLOADS_DIR));

  app.use(createHealthRouter({ db }));

  if (dbTestBenchEnabled) {
    app.use("/db/testbench", createDbTestBenchRouter({ db, token: dbTestBenchToken }));
  }

  app.use(
    "/api",
    createApiRouter({
      db,
      uploadsDir: DEFAULT_UPLOADS_DIR,
      uploadPublicBaseUrl: process.env.UPLOAD_PUBLIC_BASE_URL || null,
      frontendUrl: frontendUrl ?? process.env.FRONTEND_URL ?? null,
      otmClient,
      otmConfig,
      otmTreeCache,
      otmSpeciesCache,
      otmSyncQueue
    })
  );

  app.use((req, res, next) => {
    if (expoProxyEnabled && expoProxyTarget) {
      proxyHttpRequest(req, res, expoProxyTarget);
      return;
    }
    next();
  });

  app.use((req, res) => {
    if (staticRoot && (req.method === "GET" || req.method === "HEAD")) {
      let pathname = "/";
      try {
        pathname = new URL(req.url || "/", "http://localhost").pathname;
      } catch {
        sendJson(res, 400, { error: "Bad request", code: "BadRequestError" });
        return;
      }

      const staticFilePath = resolveStaticRoute(staticRoot, pathname);
      if (staticFilePath) {
        req.log.debug("static.route.hit", {
          pathname,
          staticFilePath
        });
        sendStaticFile(req, res, staticFilePath);
        return;
      }
    }

    sendJson(res, 404, { error: "Not found" });
  });

  app.use((error, req, res, _next) => {
    const status = toErrorStatus(error);
    sendJson(res, status, buildErrorPayload(error, req, status));
  });

  const server = http.createServer(app);

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
          logger.error("server.start.failed", { port, error: serializeError(error) });
          reject(error);
        };
        const onListening = () => {
          server.off("error", onError);
          logger.info("server.start.listening", { port });
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
            logger.error("server.stop.failed", { error: serializeError(error) });
            reject(error);
            return;
          }
          logger.info("server.stop.complete");
          resolve();
        });
      });
    }
  };
}

module.exports = {
  createHttpServer
};
