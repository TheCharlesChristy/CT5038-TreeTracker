const test = require("node:test");
const assert = require("node:assert/strict");
const mysql = require("mysql2");
const mysqlPromise = require("mysql2/promise");
const { createLeakedPromisePool, createLeakedCallbackPool } = require("../src/db/test-helpers/lock-fixtures");
const { installDbClientLock } = require("../src/db/runtime-lock");

// Importing db installs runtime lock hooks in mysql2 factory methods.
require("../src/db");

test("runtime DB lock blocks direct mysql2 pool creation outside middleware", () => {
  assert.throws(
    () => mysqlPromise.createPool({ host: "127.0.0.1", user: "root", database: "any" }),
    (error) => error && error.code === "DB_LOCK_VIOLATION"
  );
});

test("runtime DB lock blocks direct mysql2 connection creation outside middleware", () => {
  assert.throws(
    () => mysqlPromise.createConnection({ host: "127.0.0.1", user: "root", database: "any" }),
    (error) => error && error.code === "DB_LOCK_VIOLATION"
  );
  assert.throws(
    () => mysql.createPool({ host: "127.0.0.1", user: "root", database: "any" }),
    (error) => error && error.code === "DB_LOCK_VIOLATION"
  );
});

test("second-layer lock blocks query/execute outside middleware on leaked clients", async () => {
  const pool = createLeakedPromisePool();
  try {
    assert.throws(() => pool.query("SELECT 1"), (error) => error && error.code === "DB_LOCK_VIOLATION");
    assert.throws(() => pool.execute("SELECT 1"), (error) => error && error.code === "DB_LOCK_VIOLATION");
  } finally {
    await pool.end();
  }
});


test("second-layer lock blocks getConnection callback and promise wrappers outside middleware", async () => {
  const pool = createLeakedCallbackPool();
  try {
    assert.throws(() => pool.promise(), (error) => error && error.code === "DB_LOCK_VIOLATION");
    assert.throws(() => pool.getConnection(() => {}), (error) => error && error.code === "DB_LOCK_VIOLATION");
    assert.throws(() => pool.getConnection(), (error) => error && error.code === "DB_LOCK_VIOLATION");
  } finally {
    await pool.end();
  }
});

test("runtime lock install is idempotent", () => {
  assert.doesNotThrow(() => installDbClientLock());
  assert.doesNotThrow(() => installDbClientLock());
});
