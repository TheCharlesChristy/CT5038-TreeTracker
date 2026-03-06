const test = require("node:test");
const assert = require("node:assert/strict");
const v = require("../src/db/validation");

test("assert validator", () => {
  assert.doesNotThrow(() => v.assert(true, "ok"));
  assert.throws(() => v.assert(false, "bad"), /bad/);
});

test("int/string validators boundary conditions", () => {
  assert.doesNotThrow(() => v.ensurePositiveInt("id", 1));
  assert.throws(() => v.ensurePositiveInt("id", 0), /positive integer/);

  assert.doesNotThrow(() => v.ensureStringMax("name", "x", 1));
  assert.throws(() => v.ensureStringMax("name", "xx", 1), /<= 1/);

  assert.doesNotThrow(() => v.ensureRequiredString("name", "x", 5));
  assert.throws(() => v.ensureRequiredString("name", "   ", 5), /cannot be empty/);
});

test("location and boolean validators", () => {
  assert.doesNotThrow(() => v.ensureLatitude(-90));
  assert.throws(() => v.ensureLatitude(91), /out of range/);
  assert.doesNotThrow(() => v.ensureLongitude(180));
  assert.throws(() => v.ensureLongitude(-181), /out of range/);

  assert.doesNotThrow(() => v.ensureBoolean("ok", true));
  assert.throws(() => v.ensureBoolean("ok", "true"), /must be boolean/);
});

test("hex and numeric nullable validators", () => {
  assert.doesNotThrow(() => v.ensureHex64("sessionToken", "a".repeat(64)));
  assert.throws(() => v.ensureHex64("sessionToken", "abc"), /64 hex/);

  assert.doesNotThrow(() => v.ensureNumberOrNull("value", null));
  assert.doesNotThrow(() => v.ensureNumberOrNull("value", 1.25));
  assert.throws(() => v.ensureNumberOrNull("value", Infinity), /finite number/);
});

test("normalizeListParams validates boundaries", () => {
  assert.deepEqual(v.normalizeListParams({}), { limit: 50, offset: 0 });
  assert.deepEqual(v.normalizeListParams({ limit: 500, offset: 0 }), { limit: 500, offset: 0 });
  assert.throws(() => v.normalizeListParams({ limit: 0 }), /1..500/);
  assert.throws(() => v.normalizeListParams({ offset: -1 }), />= 0/);
});
