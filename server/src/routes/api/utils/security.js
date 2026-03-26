const crypto = require("crypto");

function base64UrlEncode(input) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function base64UrlDecode(input) {
  let normalized = String(input || "").replace(/-/g, "+").replace(/_/g, "/");
  while (normalized.length % 4 !== 0) {
    normalized += "=";
  }
  return Buffer.from(normalized, "base64");
}

function signJwt(payload, secret, expiresInSeconds) {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "HS256", typ: "JWT" };
  const fullPayload = {
    ...payload,
    iat: now,
    exp: now + expiresInSeconds
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(fullPayload));
  const data = `${encodedHeader}.${encodedPayload}`;
  const signature = crypto
    .createHmac("sha256", secret)
    .update(data)
    .digest("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");

  return `${data}.${signature}`;
}

function verifyJwt(token, secret) {
  const parts = String(token || "").split(".");
  if (parts.length !== 3) {
    throw new Error("Invalid token format");
  }

  const data = `${parts[0]}.${parts[1]}`;
  const expectedSig = crypto
    .createHmac("sha256", secret)
    .update(data)
    .digest("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");

  const providedSig = parts[2];
  const expectedBuffer = Buffer.from(expectedSig);
  const providedBuffer = Buffer.from(providedSig);
  if (expectedBuffer.length !== providedBuffer.length || !crypto.timingSafeEqual(expectedBuffer, providedBuffer)) {
    throw new Error("Invalid token signature");
  }

  const payloadRaw = base64UrlDecode(parts[1]).toString("utf-8");
  const payload = JSON.parse(payloadRaw);
  const now = Math.floor(Date.now() / 1000);
  if (typeof payload.exp === "number" && now >= payload.exp) {
    throw new Error("Token expired");
  }

  return payload;
}

function deriveScrypt(password, salt) {
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, 64, { N: 16384, r: 8, p: 1 }, (error, derivedKey) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(derivedKey);
    });
  });
}

async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = await deriveScrypt(password, salt);
  return `scrypt$${salt}$${derived.toString("hex")}`;
}

async function verifyPassword(password, passwordHash) {
  if (typeof passwordHash !== "string" || !passwordHash.startsWith("scrypt$")) {
    return false;
  }

  const parts = passwordHash.split("$");
  if (parts.length !== 3) {
    return false;
  }

  const salt = parts[1];
  const expected = Buffer.from(parts[2], "hex");
  const actual = await deriveScrypt(password, salt);
  if (expected.length !== actual.length) {
    return false;
  }
  return crypto.timingSafeEqual(expected, actual);
}

function parseBearerToken(req) {
  const authHeader = String(req.headers.authorization || "");
  const bearerPrefix = "bearer ";
  if (!authHeader.toLowerCase().startsWith(bearerPrefix)) {
    return null;
  }
  return authHeader.slice(bearerPrefix.length).trim();
}

module.exports = {
  signJwt,
  verifyJwt,
  hashPassword,
  verifyPassword,
  parseBearerToken,
  randomHex64() {
    return crypto.randomBytes(32).toString("hex");
  }
};
