const test = require("node:test");
const assert = require("node:assert/strict");
const core = require("../src/db/core");

function createExecutor(calls) {
  return {
    async execute(sql, params) {
      calls.push({ sql, params });
      return [[{ ok: true }]];
    }
  };
}

test("run rewrites LIMIT ?", async () => {
  const calls = [];
  await core.run(createExecutor(calls), "SELECT * FROM trees LIMIT ?", [10]);
  assert.deepEqual(calls[0], { sql: "SELECT * FROM trees LIMIT 10", params: [] });
});

test("run rewrites LIMIT ? OFFSET ?", async () => {
  const calls = [];
  await core.run(createExecutor(calls), "SELECT * FROM trees LIMIT ? OFFSET ?", [5, 20]);
  assert.deepEqual(calls[0], { sql: "SELECT * FROM trees LIMIT 5 OFFSET 20", params: [] });
});

test("run rejects invalid LIMIT/OFFSET", async () => {
  await assert.rejects(() => core.run(createExecutor([]), "SELECT * FROM trees LIMIT ?", [-1]), /LIMIT must be/);
  await assert.rejects(
    () => core.run(createExecutor([]), "SELECT * FROM trees LIMIT ? OFFSET ?", [5, -2]),
    /OFFSET must be/
  );
});

test("run leaves non matching SQL untouched", async () => {
  const calls = [];
  await core.run(createExecutor(calls), "SELECT * FROM trees WHERE id = ?", [99]);
  assert.deepEqual(calls[0], { sql: "SELECT * FROM trees WHERE id = ?", params: [99] });
});
