const { ValidationError } = require("../errors");

function assert(condition, message) {
  if (!condition) {
    throw new ValidationError(message);
  }
}

function ensurePositiveInt(name, value) {
  assert(Number.isInteger(value) && value > 0, `${name} must be a positive integer`);
}

function ensureStringMax(name, value, max, allowNull = true) {
  if (value === undefined) return;
  if (value === null) {
    assert(allowNull, `${name} cannot be null`);
    return;
  }
  assert(typeof value === "string", `${name} must be a string`);
  assert(value.length <= max, `${name} must be <= ${max} chars`);
}

function ensureRequiredString(name, value, max) {
  assert(typeof value === "string", `${name} must be a string`);
  assert(value.trim().length > 0, `${name} cannot be empty`);
  assert(value.length <= max, `${name} must be <= ${max} chars`);
}

/** Allows empty strings for image-only comment bodies. */
function ensureStringAllowEmptyMax(name, value, max) {
  assert(typeof value === "string", `${name} must be a string`);
  assert(value.length <= max, `${name} must be <= ${max} chars`);
}

function ensureLatitude(value) {
  assert(typeof value === "number" && Number.isFinite(value), "latitude must be a finite number");
  assert(value >= -90 && value <= 90, "latitude out of range");
}

function ensureLongitude(value) {
  assert(typeof value === "number" && Number.isFinite(value), "longitude must be a finite number");
  assert(value >= -180 && value <= 180, "longitude out of range");
}

function ensureBoolean(name, value) {
  assert(typeof value === "boolean", `${name} must be boolean`);
}

function ensureHex64(name, value, allowNull = false) {
  if (value === undefined) return;
  if (value === null) {
    assert(allowNull, `${name} cannot be null`);
    return;
  }
  assert(typeof value === "string", `${name} must be a string`);
  assert(/^[a-fA-F0-9]{64}$/.test(value), `${name} must be 64 hex chars`);
}

function ensureNumberOrNull(name, value) {
  if (value === undefined || value === null) return;
  assert(typeof value === "number" && Number.isFinite(value), `${name} must be a finite number`);
}

function normalizeListParams(params = {}) {
  const limit = params.limit === undefined ? 50 : Number(params.limit);
  const offset = params.offset === undefined ? 0 : Number(params.offset);
  assert(Number.isInteger(limit) && limit > 0 && limit <= 500, "limit must be integer 1..500");
  assert(Number.isInteger(offset) && offset >= 0, "offset must be >= 0");
  return { limit, offset };
}

module.exports = {
  assert,
  ensurePositiveInt,
  ensureStringMax,
  ensureRequiredString,
  ensureStringAllowEmptyMax,
  ensureLatitude,
  ensureLongitude,
  ensureBoolean,
  ensureHex64,
  ensureNumberOrNull,
  normalizeListParams
};
