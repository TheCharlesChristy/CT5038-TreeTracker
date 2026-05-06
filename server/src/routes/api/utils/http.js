function parsePositiveInt(value, fieldName) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    const error = new Error(`${fieldName} must be a positive integer`);
    error.name = "ValidationError";
    throw error;
  }
  return parsed;
}

function parseListParams(query = {}) {
  const limit = query.limit === undefined ? 500 : Number(query.limit);
  const offset = query.offset === undefined ? 0 : Number(query.offset);

  if (!Number.isInteger(limit) || limit < 1 || limit > 500) {
    const error = new Error("limit must be integer 1..500");
    error.name = "ValidationError";
    throw error;
  }

  if (!Number.isInteger(offset) || offset < 0) {
    const error = new Error("offset must be >= 0");
    error.name = "ValidationError";
    throw error;
  }

  return { limit, offset };
}

function getUploadPublicBase(req, explicitBase) {
  if (explicitBase) {
    return explicitBase.replace(/\/+$/, "");
  }
  return "/uploads";
}

function requireJson(req) {
  // Accept application/json and common aliases (charset, +json types).
  if (!req.is("application/json") && !req.is("json")) {
    const error = new Error("Content-Type must be application/json");
    error.name = "UnsupportedMediaTypeError";
    throw error;
  }
}

module.exports = {
  parsePositiveInt,
  parseListParams,
  getUploadPublicBase,
  requireJson
};
