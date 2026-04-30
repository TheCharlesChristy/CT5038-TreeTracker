const fs = require("fs/promises");
const mysql = require("mysql2/promise");
const { DbError, ConflictError, ValidationError } = require("../errors");
const { createLogger, sanitizeForLog, serializeError } = require("../logging");
const { installDbClientLock, runWithDbAccess } = require("./runtime-lock");
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
  "guardians",
  "user_sessions",
  "trees",
  "tree_creation_data",
  "tree_data",
  "guardian_trees",
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

const logger = createLogger("db.core");

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

function buildSchemaMigrations(statements) {
  return statements.map((statement, index) => ({
    version: `schema-${String(index + 1).padStart(4, "0")}`,
    statement,
    tableName: tableNameFromCreateStatement(statement)
  }));
}

function isSchemaSnapshotVersion(version) {
  return /^schema-\d{4}$/.test(String(version || ""));
}

async function ensureMigrationsTable(executor) {
  await run(
    executor,
    `
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version varchar(64) PRIMARY KEY,
        applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      ) engine = InnoDB
    `
  );
}

async function listAppliedMigrationVersions(executor) {
  const rows = await run(executor, "SELECT version FROM schema_migrations ORDER BY version ASC");
  return rows.map((row) => row.version);
}

async function tableExists(executor, tableName) {
  const row = await selectOne(
    executor,
    "SELECT 1 AS ok FROM information_schema.tables WHERE table_schema = ? AND table_name = ?",
    [config.database, tableName]
  );
  return Boolean(row);
}

async function columnExists(executor, tableName, columnName) {
  const row = await selectOne(
    executor,
    "SELECT 1 AS ok FROM information_schema.columns WHERE table_schema = ? AND table_name = ? AND column_name = ?",
    [config.database, tableName, columnName]
  );
  return Boolean(row);
}

async function addColumnIfMissing(executor, tableName, columnName, definition) {
  if (await columnExists(executor, tableName, columnName)) {
    return;
  }

  logger.info("migration.add-missing-column", { table: tableName, column: columnName });
  await run(executor, `ALTER TABLE ${escapeIdent(tableName)} ADD COLUMN ${escapeIdent(columnName)} ${definition}`);
}

async function renameTableIfNeeded(executor, fromName, toName) {
  const [fromExists, toExists] = await Promise.all([tableExists(executor, fromName), tableExists(executor, toName)]);
  if (!fromExists || toExists) {
    return;
  }

  logger.info("migration.rename-legacy-table", { from: fromName, to: toName });
  await run(executor, `RENAME TABLE ${escapeIdent(fromName)} TO ${escapeIdent(toName)}`);
}

async function applyMigrations(executor, schemaPath) {
  await renameTableIfNeeded(executor, "guardians", "guardian_trees");
  await renameTableIfNeeded(executor, "guardian_users", "guardians");

  const schemaSql = await fs.readFile(schemaPath, "utf-8");
  const statements = splitSqlStatements(schemaSql);
  const migrations = buildSchemaMigrations(statements);

  await ensureMigrationsTable(executor);
  const appliedVersions = new Set(await listAppliedMigrationVersions(executor));
  const definedVersions = new Set(migrations.map((migration) => migration.version));

  const unknownApplied = [...appliedVersions].filter(
    (version) => !definedVersions.has(version) && !isSchemaSnapshotVersion(version)
  );
  if (unknownApplied.length > 0) {
    throw new DbError(`Inconsistent migration history. Unknown versions: ${unknownApplied.join(", ")}`);
  }

  for (const migration of migrations) {
    if (appliedVersions.has(migration.version)) {
      if (migration.tableName && !(await tableExists(executor, migration.tableName))) {
        logger.warn("migration.repair-missing-table", {
          version: migration.version,
          table: migration.tableName
        });
        await run(executor, migration.statement);
      }
      continue;
    }

    logger.info("migration.apply", {
      version: migration.version,
      table: migration.tableName
    });
    await run(executor, migration.statement);
    await run(executor, "INSERT INTO schema_migrations (version) VALUES (?)", [migration.version]);
  }

  await addColumnIfMissing(executor, "users", "created_at", "TIMESTAMP NULL DEFAULT NULL");
  await addColumnIfMissing(executor, "user_sessions", "created_at", "TIMESTAMP NULL DEFAULT NULL");
}

async function run(executor, sql, params = []) {
  return runWithDbAccess(async () => {
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

      logger.debug("query.success", {
        elapsedMs: elapsed,
        sql: executionSql,
        params: sanitizeForLog(executionParams)
      });

      if (config && elapsed >= config.slowQueryMs) {
        logger.warn("query.slow", { elapsedMs: elapsed, sql: executionSql });
      }
      return rows;
    } catch (error) {
      logger.error("query.failure", {
        elapsedMs: Date.now() - start,
        sql: executionSql,
        params: sanitizeForLog(executionParams),
        error: serializeError(error)
      });

      if (error && error.code === "ER_DUP_ENTRY") {
        throw new ConflictError("Duplicate value violates unique constraint", { cause: error });
      }
      if (error && ["ER_NO_REFERENCED_ROW_2", "ER_ROW_IS_REFERENCED_2"].includes(error.code)) {
        throw new ConflictError("Foreign key constraint violation", { cause: error });
      }
      throw new DbError("Database operation failed", { cause: error });
    }
  });
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

  logger.info("init.start", {
    host: config.host,
    port: config.port,
    database: config.database,
    connectionLimit: config.connectionLimit,
    slowQueryMs: config.slowQueryMs,
    allowCreateDatabase: config.allowCreateDatabase,
    schemaPath: config.schemaPath
  });

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
      logger.warn("init.create-database", { database: config.database });
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

  logger.info("init.apply-migrations");
  await applyMigrations(pool, config.schemaPath);

  const stillMissing = await ensureTablesExist(pool);
  if (stillMissing.length > 0) {
    throw new DbError(`Schema application incomplete. Missing tables: ${stillMissing.join(", ")}`);
  }

  ready = true;
  logger.info("init.complete");
}

async function close() {
  if (pool) {
    logger.info("close.start");
    await pool.end();
    logger.info("close.complete");
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
    logger.warn("health.failed", { error: serializeError(error) });
    return { ready: false };
  }
}

async function transaction(fn) {
  return runWithDbAccess(async () => {
    ensureReady();
    const startedAt = Date.now();
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();
      logger.debug("transaction.begin");

      const tx = { __txConn: connection };
      const result = await fn(tx);

      await connection.commit();
      logger.debug("transaction.commit", { durationMs: Date.now() - startedAt });
      return result;
    } catch (error) {
      try {
        await connection.rollback();
        logger.warn("transaction.rollback", {
          durationMs: Date.now() - startedAt,
          error: serializeError(error)
        });
      } catch (rollbackError) {
        logger.error("transaction.rollback.failed", {
          durationMs: Date.now() - startedAt,
          error: serializeError(rollbackError)
        });
      }
      throw error;
    } finally {
      connection.release();
    }
  });
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
    buildSchemaMigrations,
    isSchemaSnapshotVersion
  }
};
