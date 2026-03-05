const test = require("node:test");
const assert = require("node:assert/strict");
const { ensureLatitude, ensureLongitude, ensureHex64 } = require("../src/db/validation");

test("latitude and longitude validators accept bounds", () => {
  assert.doesNotThrow(() => ensureLatitude(-90));
  assert.doesNotThrow(() => ensureLatitude(90));
  assert.doesNotThrow(() => ensureLongitude(-180));
  assert.doesNotThrow(() => ensureLongitude(180));
});

test("hex64 validator rejects invalid token", () => {
  assert.throws(() => ensureHex64("sessionToken", "abc"));
});
