const https = require("https");
const http = require("http");
const { URL } = require("url");
const { signRequest } = require("./hmac");
const { createLogger } = require("../logging");

const logger = createLogger("otm.client");

function doRequest(options, body, timeoutMs) {
  return new Promise((resolve, reject) => {
    const protocol = options.protocol === "https:" ? https : http;
    const req = protocol.request(options, (res) => {
      const chunks = [];
      res.on("data", (chunk) => chunks.push(chunk));
      res.on("end", () => {
        const raw = Buffer.concat(chunks).toString("utf-8");
        resolve({ status: res.statusCode, headers: res.headers, body: raw });
      });
    });

    req.setTimeout(timeoutMs, () => {
      req.destroy(new Error(`OTM request timed out after ${timeoutMs}ms`));
    });

    req.on("error", reject);

    if (body) {
      req.write(body);
    }
    req.end();
  });
}

function createOtmClient(config) {
  if (!config.enabled) {
    const stub = async () => {
      throw new Error("OTM integration is not configured — set OTM_BASE_URL, OTM_API_USER, OTM_API_KEY, OTM_INSTANCE_NAME");
    };
    return { get: stub, post: stub, health: async () => ({ ok: false, reason: "not-configured" }) };
  }

  const base = new URL(config.baseUrl);

  async function request(method, path, bodyObject) {
    const authHeaders = signRequest({ method, path, apiUser: config.apiUser, apiKey: config.apiKey });
    const body = bodyObject ? JSON.stringify(bodyObject) : null;
    const startedAt = Date.now();

    const options = {
      protocol: base.protocol,
      hostname: base.hostname,
      port: base.port || (base.protocol === "https:" ? 443 : 80),
      path,
      method: method.toUpperCase(),
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        ...authHeaders,
        ...(body ? { "Content-Length": Buffer.byteLength(body) } : {})
      }
    };

    logger.info("otm.request.start", {
      method: method.toUpperCase(),
      path,
      bodyPresent: Boolean(body)
    });

    let result;
    try {
      result = await doRequest(options, body, config.requestTimeoutMs);
    } catch (err) {
      const durationMs = Date.now() - startedAt;
      logger.error("otm.request.error", {
        method: method.toUpperCase(),
        path,
        durationMs,
        error: err.message
      });
      throw err;
    }

    const durationMs = Date.now() - startedAt;
    logger.info("otm.request.complete", {
      method: method.toUpperCase(),
      path,
      status: result.status,
      durationMs
    });

    if (result.status >= 400) {
      const err = new Error(`OTM API error: HTTP ${result.status} on ${method.toUpperCase()} ${path}`);
      err.otmStatus = result.status;
      err.otmBody = result.body;
      throw err;
    }

    try {
      return JSON.parse(result.body);
    } catch {
      return result.body;
    }
  }

  async function health() {
    try {
      const path = `/${config.instanceName}/tiles/`;
      const authHeaders = signRequest({ method: "GET", path, apiUser: config.apiUser, apiKey: config.apiKey });
      const startedAt = Date.now();
      const base64 = new URL(config.baseUrl);

      const options = {
        protocol: base64.protocol,
        hostname: base64.hostname,
        port: base64.port || (base64.protocol === "https:" ? 443 : 80),
        path,
        method: "GET",
        headers: { "Accept": "application/json", ...authHeaders }
      };

      const result = await doRequest(options, null, config.requestTimeoutMs);
      const durationMs = Date.now() - startedAt;

      if (result.status < 500) {
        return { ok: true, status: result.status, durationMs };
      }
      return { ok: false, status: result.status, durationMs };
    } catch (err) {
      return { ok: false, reason: err.message };
    }
  }

  return {
    get: (path) => request("GET", path),
    post: (path, body) => request("POST", path, body),
    put: (path, body) => request("PUT", path, body),
    health
  };
}

module.exports = { createOtmClient };
