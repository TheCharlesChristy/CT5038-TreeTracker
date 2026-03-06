const test = require("node:test");
const assert = require("node:assert/strict");
const { __private } = require("../src/db/core");

test("selectSchemaStatementsForMissingTables only returns CREATE TABLE for missing required tables", () => {
  const schema = `
    -- Setup Users and Auth
    CREATE TABLE users (
      id bigint unsigned AUTO_INCREMENT PRIMARY KEY
    );

    CREATE TABLE user_passwords (
      user_id bigint unsigned PRIMARY KEY
    );

    CREATE TABLE trees (
      id bigint unsigned AUTO_INCREMENT PRIMARY KEY
    );
  `;

  const statements = __private.splitSqlStatements(schema);
  const selected = __private.selectSchemaStatementsForMissingTables(statements, ["trees"]);

  assert.deepEqual(selected, [
    "CREATE TABLE trees (\n      id bigint unsigned AUTO_INCREMENT PRIMARY KEY\n    )"
  ]);
});

test("tableNameFromCreateStatement supports quoted and unquoted identifiers", () => {
  assert.equal(__private.tableNameFromCreateStatement("CREATE TABLE users (id int)"), "users");
  assert.equal(__private.tableNameFromCreateStatement("CREATE TABLE `users` (id int)"), "users");
  assert.equal(__private.tableNameFromCreateStatement("CREATE TABLE IF NOT EXISTS users (id int)"), "users");
  assert.equal(__private.tableNameFromCreateStatement("CREATE TABLE IF NOT EXISTS `users` (id int)"), "users");
  assert.equal(__private.tableNameFromCreateStatement("CREATE INDEX idx_users ON users (id)"), null);
});
