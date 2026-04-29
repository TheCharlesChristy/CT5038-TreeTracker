const { createLogger } = require("../logging");

const logger = createLogger("otm.config");

function loadOtmConfig() {
  const baseUrl = process.env.OTM_BASE_URL || "";
  const apiUser = process.env.OTM_API_USER || "";
  const apiKey = process.env.OTM_API_KEY || "";
  const instanceName = process.env.OTM_INSTANCE_NAME || "";
  const enabled = Boolean(baseUrl && apiUser && apiKey && instanceName);

  logger.info("otm.config.loaded", {
    enabled,
    baseUrl: baseUrl || "(not set)",
    instanceName: instanceName || "(not set)",
    apiUserConfigured: Boolean(apiUser),
    apiKeyConfigured: Boolean(apiKey)
  });

  return {
    enabled,
    baseUrl,
    apiUser,
    apiKey,
    instanceName,
    requestTimeoutMs: Number(process.env.OTM_REQUEST_TIMEOUT_MS) || 10000,
    cacheTtlMs: Number(process.env.OTM_CACHE_TTL_MS) || 5 * 60 * 1000,
    speciesCacheTtlMs: Number(process.env.OTM_SPECIES_CACHE_TTL_MS) || 7 * 24 * 60 * 60 * 1000,
    maxRetries: Number(process.env.OTM_MAX_RETRIES) || 3,
    rateLimitRpm: Number(process.env.OTM_RATE_LIMIT_RPM) || 60
  };
}

module.exports = { loadOtmConfig };
