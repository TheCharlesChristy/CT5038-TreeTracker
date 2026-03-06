const fs = require("fs/promises");
const mysql = require("mysql2/promise");
const { DbError, ConflictError, ValidationError } = require("../errors");
const { installDbClientLock } = require("./runtime-lock");
const {
  assert,
  ensurePositiveInt,
  ensureStringMax,
  ensureRequiredString,
  ensureLatitude,
  ensureLongitude,
  ensureBoolean,
  ensureHex64,
  ensureNumberOrNull,
  normalizeListParams
} = require("./validation");

installDbClientLock();

const REQUIRED_TABLES = [
  "users",
  "user_passwords",
  "admins",
  "user_sessions",
  "trees",
  "tree_creation_data",
  "tree_data",
  "guardians",
  "photos",
  "tree_photos",
  "comments",
  "comment_photos",
  "comments_tree",
  "comment_replies",
  "wildlife_observations",
  "disease_observations",
  "seen_observations"
];

let config = null;
let pool = null;
let ready = false;

function log(message, meta) {
  const payload = meta ? ` ${JSON.stringify(meta)}` : "";
  console.log(`[db] ${message}${payload}`);
}

function ensureReady() {
  if (!ready || !pool) {
    throw new DbError("Database middleware is not initialized");
  }
}

function escapeIdent(value) {
  return `\`${String(value).replace(/`/g, "``")}\``;
}

function splitSqlStatements(sqlText) {
  const withoutBlockComments = sqlText.replace(/\/\*[\s\S]*?\*\//g, "");
  const withoutLineComments = withoutBlockComments
    .split("\n")
    .map((line) => line.replace(/--.*$/, ""))
    .join("\n");

  return withoutLineComments
    .split(";")
    .map((statement) => statement.trim())
    .filter(Boolean);
}

function tableNameFromCreateStatement(statement) {
  const match = statement.match(/^CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?`?([A-Za-z0-9_]+)`?\s*\(/i);
  return match ? match[1] : null;
}

function selectSchemaStatementsForMissingTables(statements, missingTables) {
  const missing = new Set(missingTables);
  return statements.filter((statement) => {
    const tableName = tableNameFromCreateStatement(statement);
    return tableName && missing.has(tableName);
  });
}

async function run(executor, sql, params = []) {
  const start = Date.now();
  let executionSql = sql;
  let executionParams = params;

  const limitOffsetPattern = /LIMIT\s+\?\s+OFFSET\s+\?/i;
  if (limitOffsetPattern.test(executionSql)) {
    const limit = Number(executionParams[executionParams.length - 2]);
    const offset = Number(executionParams[executionParams.length - 1]);
    assert(Number.isInteger(limit) && limit >= 0, "LIMIT must be a non-negative integer");
    assert(Number.isInteger(offset) && offset >= 0, "OFFSET must be a non-negative integer");
    executionSql = executionSql.replace(limitOffsetPattern, `LIMIT ${limit} OFFSET ${offset}`);
    executionParams = executionParams.slice(0, -2);
  } else {
    const limitOnlyPattern = /LIMIT\s+\?/i;
    if (limitOnlyPattern.test(executionSql)) {
      const limit = Number(executionParams[executionParams.length - 1]);
      assert(Number.isInteger(limit) && limit >= 0, "LIMIT must be a non-negative integer");
      executionSql = executionSql.replace(limitOnlyPattern, `LIMIT ${limit}`);
      executionParams = executionParams.slice(0, -1);
    }
  }

  try {
    const [rows] = await executor.execute(executionSql, executionParams);
    const elapsed = Date.now() - start;
    if (elapsed >= config.slowQueryMs) {
      log("slow-query", { elapsedMs: elapsed, sql: executionSql });
    }
    return rows;
  } catch (error) {
    if (error && error.code === "ER_DUP_ENTRY") {
      throw new ConflictError("Duplicate value violates unique constraint", { cause: error });
    }
    if (error && ["ER_NO_REFERENCED_ROW_2", "ER_ROW_IS_REFERENCED_2"].includes(error.code)) {
      throw new ConflictError("Foreign key constraint violation", { cause: error });
    }
    throw new DbError("Database operation failed", { cause: error });
  }
}

function runtimeExecutor(tx) {
  ensureReady();
  if (tx && tx.__txConn) {
    return tx.__txConn;
  }
  return pool;
}

async function selectOne(executor, sql, params = []) {
  const rows = await run(executor, sql, params);
  return rows[0] || null;
}

function toDateInput(name, value) {
  if (value === undefined) return undefined;
  const parsed = new Date(value);
  assert(!Number.isNaN(parsed.getTime()), `${name} must be a valid date`);
  return parsed;
}

function ensureOrder(value) {
  const order = (value || "desc").toLowerCase();
  assert(order === "asc" || order === "desc", "order must be asc or desc");
  return order;
}

function buildUpdate(fields, allowedMap) {
  const updates = [];
  const params = [];

  for (const [inputKey, dbColumn] of Object.entries(allowedMap)) {
    if (Object.prototype.hasOwnProperty.call(fields, inputKey)) {
      updates.push(`${dbColumn} = ?`);
      params.push(fields[inputKey]);
    }
  }

  if (updates.length === 0) {
    throw new ValidationError("No update fields provided");
  }

  return { updates, params };
}

async function ensureTablesExist(executor) {
  const placeholders = REQUIRED_TABLES.map(() => "?").join(",");
  const rows = await run(
    executor,
    `SELECT table_name FROM information_schema.tables WHERE table_schema = ? AND table_name IN (${placeholders})`,
    [config.database, ...REQUIRED_TABLES]
  );

  const existing = new Set(rows.map((row) => row.table_name || row.TABLE_NAME));
  return REQUIRED_TABLES.filter((name) => !existing.has(name));
}

async function init(userConfig) {
  if (ready) {
    return;
  }

  config = {
    host: userConfig.host,
    port: userConfig.port,
    user: userConfig.user,
    password: userConfig.password,
    database: userConfig.database,
    connectionLimit: userConfig.connectionLimit,
    slowQueryMs: userConfig.slowQueryMs,
    allowCreateDatabase: userConfig.allowCreateDatabase,
    schemaPath: userConfig.schemaPath
  };

  log("init-start");

  const bootstrapConn = await mysql.createConnection({
    host: config.host,
    port: config.port,
    user: config.user,
    password: config.password,
    multipleStatements: true
  });

  try {
    const dbExists = await selectOne(
      bootstrapConn,
      "SELECT SCHEMA_NAME AS name FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME = ?",
      [config.database]
    );

    if (!dbExists) {
      if (!config.allowCreateDatabase) {
        throw new DbError("Database does not exist and auto-create is disabled");
      }
      log("creating-database", { database: config.database });
      await run(bootstrapConn, `CREATE DATABASE ${escapeIdent(config.database)}`);
    }
  } finally {
    await bootstrapConn.end();
  }

  pool = mysql.createPool({
    host: config.host,
    port: config.port,
    user: config.user,
    password: config.password,
    database: config.database,
    waitForConnections: true,
    connectionLimit: config.connectionLimit,
    queueLimit: 0
  });

  const missingTables = await ensureTablesExist(pool);
  if (missingTables.length > 0) {
    log("applying-schema", { missingTables });
    const schemaSql = await fs.readFile(config.schemaPath, "utf-8");
    const statements = splitSqlStatements(schemaSql);
    const statementsToApply = selectSchemaStatementsForMissingTables(statements, missingTables);
    for (const statement of statementsToApply) {
      await run(pool, statement);
    }
  }

  const stillMissing = await ensureTablesExist(pool);
  if (stillMissing.length > 0) {
    throw new DbError(`Schema application incomplete. Missing tables: ${stillMissing.join(", ")}`);
  }

  ready = true;
  log("init-complete");
}

async function close() {
  if (pool) {
    await pool.end();
  }
  pool = null;
  ready = false;
}

async function health() {
  if (!ready || !pool) {
    return { ready: false };
  }
  try {
    await run(pool, "SELECT 1 AS ok");
    return { ready: true };
  } catch (error) {
    return { ready: false };
  }
}

async function transaction(fn) {
  ensureReady();
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const tx = { __txConn: connection };
    const result = await fn(tx);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

module.exports = {
  init,
  close,
  health,
  transaction,
  run,
  selectOne,
  runtimeExecutor,
  toDateInput,
  ensureOrder,
  buildUpdate,
  validators: {
    assert,
    ensurePositiveInt,
    ensureStringMax,
    ensureRequiredString,
    ensureLatitude,
    ensureLongitude,
    ensureBoolean,
    ensureHex64,
    ensureNumberOrNull,
    normalizeListParams
  },
  __private: {
    splitSqlStatements,
    tableNameFromCreateStatement,
    selectSchemaStatementsForMissingTables
  }
};
