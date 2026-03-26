const test = require("node:test");
const assert = require("node:assert/strict");
const { __private } = require("../src/db/core");

test("splitSqlStatements handles comments and mixed SQL blocks deterministically", () => {
  const schema = `
    /* block comment with ; */
    CREATE TABLE users (
      id int primary key
    );

    -- inline comment
    CREATE INDEX idx_users ON users (id);
    INSERT INTO users (id) VALUES (1);
  `;

  const statements = __private.splitSqlStatements(schema);
  assert.deepEqual(statements, [
    "CREATE TABLE users (\n      id int primary key\n    )",
    "CREATE INDEX idx_users ON users (id)",
    "INSERT INTO users (id) VALUES (1)"
  ]);
});

test("tableNameFromCreateStatement supports quoted and unquoted identifiers", () => {
  assert.equal(__private.tableNameFromCreateStatement("CREATE TABLE users (id int)"), "users");
  assert.equal(__private.tableNameFromCreateStatement("CREATE TABLE `users` (id int)"), "users");
  assert.equal(__private.tableNameFromCreateStatement("CREATE TABLE IF NOT EXISTS users (id int)"), "users");
  assert.equal(__private.tableNameFromCreateStatement("CREATE TABLE IF NOT EXISTS `users` (id int)"), "users");
  assert.equal(__private.tableNameFromCreateStatement("CREATE INDEX idx_users ON users (id)"), null);
});

test("buildSchemaMigrations yields stable ordered versions", () => {
  const migrations = __private.buildSchemaMigrations(["CREATE TABLE a (id int)", "CREATE TABLE b (id int)"]);
  assert.deepEqual(migrations, [
    { version: "schema-0001", statement: "CREATE TABLE a (id int)", tableName: "a" },
    { version: "schema-0002", statement: "CREATE TABLE b (id int)", tableName: "b" }
  ]);
});
