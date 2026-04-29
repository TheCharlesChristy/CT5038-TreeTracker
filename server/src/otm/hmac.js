const crypto = require("crypto");

/**
 * Signs an OTM API request using HMAC-SHA256.
 *
 * OTM signing scheme:
 *   signature = HMAC-SHA256(apiKey, message)
 *   message   = method + "\n" + path + "\n" + requestDate
 *   header    = "ApiKey <apiUser>:<base64(signature)>"
 *
 * Reference: OpenTreeMap REST API authentication docs.
 */
function signRequest({ method, path, apiUser, apiKey }) {
  const requestDate = new Date().toUTCString();
  const message = [method.toUpperCase(), path, requestDate].join("\n");
  const signature = crypto
    .createHmac("sha256", apiKey)
    .update(message)
    .digest("base64");

  return {
    "Authorization": `ApiKey ${apiUser}:${signature}`,
    "X-Request-Date": requestDate
  };
}

module.exports = { signRequest };
