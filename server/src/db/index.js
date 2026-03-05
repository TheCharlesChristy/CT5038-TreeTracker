const fs = require("fs/promises");
const mysql = require("mysql2/promise");
const {
  ValidationError,
  NotFoundError,
  ConflictError,
  AuthError,
  DbError
} = require("../errors");
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
      // Fundamental tension: insight vs secrecy. We log query shape and duration but never params to avoid leaking secrets.
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
    for (const statement of statements) {
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
  await run(pool, "SELECT 1 AS ok");
  return { ready: true };
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

const users = {
  async create(payload, tx) {
    ensureRequiredString("username", payload.username, 100);
    ensureStringMax("email", payload.email, 255);
    ensureStringMax("phone", payload.phone, 50);
    const executor = runtimeExecutor(tx);
    const result = await run(
      executor,
      "INSERT INTO users (username, email, phone) VALUES (?, ?, ?)",
      [payload.username, payload.email || null, payload.phone || null]
    );
    return this.getById(Number(result.insertId), tx);
  },

  async getById(id, tx) {
    ensurePositiveInt("id", id);
    return selectOne(runtimeExecutor(tx), "SELECT id, username, email, phone FROM users WHERE id = ?", [id]);
  },

  async getByUsername(username, tx) {
    ensureRequiredString("username", username, 100);
    return selectOne(runtimeExecutor(tx), "SELECT id, username, email, phone FROM users WHERE username = ?", [username]);
  },

  async list(params = {}, tx) {
    const { limit, offset } = normalizeListParams(params);
    return run(runtimeExecutor(tx), "SELECT id, username, email, phone FROM users ORDER BY id DESC LIMIT ? OFFSET ?", [
      limit,
      offset
    ]);
  },

  async updateById(id, fields, tx) {
    ensurePositiveInt("id", id);
    if (fields.username !== undefined) ensureRequiredString("username", fields.username, 100);
    if (fields.email !== undefined) ensureStringMax("email", fields.email, 255);
    if (fields.phone !== undefined) ensureStringMax("phone", fields.phone, 50);

    const { updates, params } = buildUpdate(fields, {
      username: "username",
      email: "email",
      phone: "phone"
    });

    const result = await run(runtimeExecutor(tx), `UPDATE users SET ${updates.join(", ")} WHERE id = ?`, [...params, id]);
    if (result.affectedRows === 0) {
      throw new NotFoundError(`User ${id} not found`);
    }
    return this.getById(id, tx);
  },

  async deleteById(id, tx) {
    ensurePositiveInt("id", id);
    const result = await run(runtimeExecutor(tx), "DELETE FROM users WHERE id = ?", [id]);
    if (result.affectedRows === 0) {
      throw new NotFoundError(`User ${id} not found`);
    }
    return { deleted: true };
  },

  async existsById(id, tx) {
    ensurePositiveInt("id", id);
    const row = await selectOne(runtimeExecutor(tx), "SELECT 1 AS ok FROM users WHERE id = ?", [id]);
    return Boolean(row);
  },

  async existsByUsername(username, tx) {
    ensureRequiredString("username", username, 100);
    const row = await selectOne(runtimeExecutor(tx), "SELECT 1 AS ok FROM users WHERE username = ?", [username]);
    return Boolean(row);
  }
};

const userPasswords = {
  async setForUser(userId, passwordHash, tx) {
    ensurePositiveInt("userId", userId);
    ensureRequiredString("passwordHash", passwordHash, 255);
    await run(
      runtimeExecutor(tx),
      "INSERT INTO user_passwords (user_id, password_hash) VALUES (?, ?) ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash)",
      [userId, passwordHash]
    );
    return { userId };
  },

  async getHashByUserId(userId, tx) {
    ensurePositiveInt("userId", userId);
    const row = await selectOne(runtimeExecutor(tx), "SELECT password_hash FROM user_passwords WHERE user_id = ?", [userId]);
    return row ? row.password_hash : null;
  },

  async deleteForUser(userId, tx) {
    ensurePositiveInt("userId", userId);
    const result = await run(runtimeExecutor(tx), "DELETE FROM user_passwords WHERE user_id = ?", [userId]);
    return { deleted: result.affectedRows > 0 };
  },

  async existsForUser(userId, tx) {
    ensurePositiveInt("userId", userId);
    const row = await selectOne(runtimeExecutor(tx), "SELECT 1 AS ok FROM user_passwords WHERE user_id = ?", [userId]);
    return Boolean(row);
  }
};

const admins = {
  async grant(userId, tx) {
    ensurePositiveInt("userId", userId);
    await run(runtimeExecutor(tx), "INSERT INTO admins (user_id) VALUES (?) ON DUPLICATE KEY UPDATE user_id = user_id", [
      userId
    ]);
    return { userId };
  },

  async revoke(userId, tx) {
    ensurePositiveInt("userId", userId);
    const result = await run(runtimeExecutor(tx), "DELETE FROM admins WHERE user_id = ?", [userId]);
    return { revoked: result.affectedRows > 0 };
  },

  async isAdmin(userId, tx) {
    ensurePositiveInt("userId", userId);
    const row = await selectOne(runtimeExecutor(tx), "SELECT 1 AS ok FROM admins WHERE user_id = ?", [userId]);
    return Boolean(row);
  },

  async list(params = {}, tx) {
    const { limit, offset } = normalizeListParams(params);
    return run(runtimeExecutor(tx), "SELECT user_id FROM admins ORDER BY user_id DESC LIMIT ? OFFSET ?", [limit, offset]);
  }
};

const userSessions = {
  async create(payload, tx) {
    ensurePositiveInt("userId", payload.userId);
    ensureHex64("sessionToken", payload.sessionToken);
    const expiresAt = toDateInput("expiresAt", payload.expiresAt);
    assert(expiresAt, "expiresAt is required");

    const result = await run(
      runtimeExecutor(tx),
      "INSERT INTO user_sessions (user_id, session_token, expires_at) VALUES (?, ?, ?)",
      [payload.userId, payload.sessionToken, expiresAt]
    );
    return this.getById(Number(result.insertId), tx);
  },

  async getById(id, tx) {
    ensurePositiveInt("id", id);
    return selectOne(runtimeExecutor(tx), "SELECT id, user_id, session_token, expires_at FROM user_sessions WHERE id = ?", [id]);
  },

  async getByToken(sessionToken, tx) {
    ensureHex64("sessionToken", sessionToken);
    return selectOne(runtimeExecutor(tx), "SELECT id, user_id, session_token, expires_at FROM user_sessions WHERE session_token = ?", [
      sessionToken
    ]);
  },

  async listByUserId(userId, params = {}, tx) {
    ensurePositiveInt("userId", userId);
    const { limit, offset } = normalizeListParams(params);
    const includeExpired = Boolean(params.includeExpired);
    if (includeExpired) {
      return run(
        runtimeExecutor(tx),
        "SELECT id, user_id, session_token, expires_at FROM user_sessions WHERE user_id = ? ORDER BY id DESC LIMIT ? OFFSET ?",
        [userId, limit, offset]
      );
    }

    return run(
      runtimeExecutor(tx),
      "SELECT id, user_id, session_token, expires_at FROM user_sessions WHERE user_id = ? AND expires_at > ? ORDER BY id DESC LIMIT ? OFFSET ?",
      [userId, new Date(), limit, offset]
    );
  },

  async extendByToken(sessionToken, newExpiresAt, tx) {
    ensureHex64("sessionToken", sessionToken);
    const expiresAt = toDateInput("newExpiresAt", newExpiresAt);
    assert(expiresAt, "newExpiresAt is required");
    const result = await run(
      runtimeExecutor(tx),
      "UPDATE user_sessions SET expires_at = ? WHERE session_token = ?",
      [expiresAt, sessionToken]
    );
    if (result.affectedRows === 0) {
      throw new NotFoundError("Session not found");
    }
    return this.getByToken(sessionToken, tx);
  },

  async deleteById(id, tx) {
    ensurePositiveInt("id", id);
    const result = await run(runtimeExecutor(tx), "DELETE FROM user_sessions WHERE id = ?", [id]);
    return { deleted: result.affectedRows > 0 };
  },

  async deleteByToken(sessionToken, tx) {
    ensureHex64("sessionToken", sessionToken);
    const result = await run(runtimeExecutor(tx), "DELETE FROM user_sessions WHERE session_token = ?", [sessionToken]);
    return { deleted: result.affectedRows > 0 };
  },

  async deleteAllForUser(userId, tx) {
    ensurePositiveInt("userId", userId);
    const result = await run(runtimeExecutor(tx), "DELETE FROM user_sessions WHERE user_id = ?", [userId]);
    return { count: result.affectedRows };
  },

  async deleteExpired(now = new Date(), tx) {
    const date = toDateInput("now", now) || new Date();
    const result = await run(runtimeExecutor(tx), "DELETE FROM user_sessions WHERE expires_at <= ?", [date]);
    return result.affectedRows;
  }
};

const trees = {
  async create(payload, tx) {
    ensureLatitude(payload.latitude);
    ensureLongitude(payload.longitude);
    const result = await run(runtimeExecutor(tx), "INSERT INTO trees (latitude, longitude) VALUES (?, ?)", [
      payload.latitude,
      payload.longitude
    ]);
    return this.getById(Number(result.insertId), tx);
  },

  async getById(id, tx) {
    ensurePositiveInt("id", id);
    return selectOne(runtimeExecutor(tx), "SELECT id, latitude, longitude FROM trees WHERE id = ?", [id]);
  },

  async list(params = {}, tx) {
    const { limit, offset } = normalizeListParams(params);
    return run(runtimeExecutor(tx), "SELECT id, latitude, longitude FROM trees ORDER BY id DESC LIMIT ? OFFSET ?", [limit, offset]);
  },

  async updateById(id, fields, tx) {
    ensurePositiveInt("id", id);
    if (fields.latitude !== undefined) ensureLatitude(fields.latitude);
    if (fields.longitude !== undefined) ensureLongitude(fields.longitude);
    const { updates, params } = buildUpdate(fields, {
      latitude: "latitude",
      longitude: "longitude"
    });
    const result = await run(runtimeExecutor(tx), `UPDATE trees SET ${updates.join(", ")} WHERE id = ?`, [...params, id]);
    if (result.affectedRows === 0) {
      throw new NotFoundError(`Tree ${id} not found`);
    }
    return this.getById(id, tx);
  },

  async deleteById(id, tx) {
    ensurePositiveInt("id", id);
    const result = await run(runtimeExecutor(tx), "DELETE FROM trees WHERE id = ?", [id]);
    return { deleted: result.affectedRows > 0 };
  },

  async findByBoundingBox(params, tx) {
    ensureLatitude(params.latMin);
    ensureLatitude(params.latMax);
    ensureLongitude(params.lonMin);
    ensureLongitude(params.lonMax);
    const { limit, offset } = normalizeListParams(params);

    return run(
      runtimeExecutor(tx),
      "SELECT id, latitude, longitude FROM trees WHERE latitude BETWEEN ? AND ? AND longitude BETWEEN ? AND ? ORDER BY id DESC LIMIT ? OFFSET ?",
      [params.latMin, params.latMax, params.lonMin, params.lonMax, limit, offset]
    );
  },

  async findNear(params, tx) {
    ensureLatitude(params.latitude);
    ensureLongitude(params.longitude);
    assert(typeof params.radiusMeters === "number" && params.radiusMeters > 0, "radiusMeters must be > 0");
    const limit = params.limit === undefined ? 50 : Number(params.limit);
    assert(Number.isInteger(limit) && limit > 0 && limit <= 500, "limit must be integer 1..500");

    const latDelta = params.radiusMeters / 111320;
    const lonBase = Math.cos((params.latitude * Math.PI) / 180);
    const lonDelta = params.radiusMeters / (111320 * Math.max(Math.abs(lonBase), 0.01));

    return run(
      runtimeExecutor(tx),
      "SELECT id, latitude, longitude FROM trees WHERE latitude BETWEEN ? AND ? AND longitude BETWEEN ? AND ? LIMIT ?",
      [params.latitude - latDelta, params.latitude + latDelta, params.longitude - lonDelta, params.longitude + lonDelta, limit]
    );
  },

  async count(tx) {
    const row = await selectOne(runtimeExecutor(tx), "SELECT COUNT(*) AS total FROM trees");
    return row ? Number(row.total) : 0;
  }
};

const treeCreationData = {
  async create(payload, tx) {
    ensurePositiveInt("treeId", payload.treeId);
    if (payload.creatorUserId !== undefined && payload.creatorUserId !== null) {
      ensurePositiveInt("creatorUserId", payload.creatorUserId);
    }
    const createdAt = toDateInput("createdAt", payload.createdAt);

    const result = await run(
      runtimeExecutor(tx),
      "INSERT INTO tree_creation_data (tree_id, creator_user_id, created_at) VALUES (?, ?, ?)",
      [payload.treeId, payload.creatorUserId || null, createdAt || null]
    );
    return this.getById(Number(result.insertId), tx);
  },

  async getById(id, tx) {
    ensurePositiveInt("id", id);
    return selectOne(
      runtimeExecutor(tx),
      "SELECT id, tree_id, creator_user_id, created_at FROM tree_creation_data WHERE id = ?",
      [id]
    );
  },

  async getByTreeId(treeId, tx) {
    ensurePositiveInt("treeId", treeId);
    return selectOne(
      runtimeExecutor(tx),
      "SELECT id, tree_id, creator_user_id, created_at FROM tree_creation_data WHERE tree_id = ? ORDER BY id DESC LIMIT 1",
      [treeId]
    );
  },

  async list(params = {}, tx) {
    const { limit, offset } = normalizeListParams(params);
    return run(
      runtimeExecutor(tx),
      "SELECT id, tree_id, creator_user_id, created_at FROM tree_creation_data ORDER BY id DESC LIMIT ? OFFSET ?",
      [limit, offset]
    );
  },

  async updateById(id, fields, tx) {
    ensurePositiveInt("id", id);
    if (fields.creatorUserId !== undefined && fields.creatorUserId !== null) {
      ensurePositiveInt("creatorUserId", fields.creatorUserId);
    }
    if (fields.createdAt !== undefined && fields.createdAt !== null) {
      fields.createdAt = toDateInput("createdAt", fields.createdAt);
    }

    const { updates, params } = buildUpdate(fields, {
      creatorUserId: "creator_user_id",
      createdAt: "created_at"
    });

    const result = await run(
      runtimeExecutor(tx),
      `UPDATE tree_creation_data SET ${updates.join(", ")} WHERE id = ?`,
      [...params, id]
    );
    if (result.affectedRows === 0) {
      throw new NotFoundError(`tree_creation_data ${id} not found`);
    }
    return this.getById(id, tx);
  },

  async deleteById(id, tx) {
    ensurePositiveInt("id", id);
    const result = await run(runtimeExecutor(tx), "DELETE FROM tree_creation_data WHERE id = ?", [id]);
    return { deleted: result.affectedRows > 0 };
  },

  async deleteByTreeId(treeId, tx) {
    ensurePositiveInt("treeId", treeId);
    const result = await run(runtimeExecutor(tx), "DELETE FROM tree_creation_data WHERE tree_id = ?", [treeId]);
    return { count: result.affectedRows };
  }
};

const TREE_DATA_NUMERIC_FIELDS = {
  avoidedRunoff: "avoided_runoff",
  carbonDioxideStored: "carbon_dioxide_stored",
  carbonDioxideRemoved: "carbon_dioxide_removed",
  waterIntercepted: "water_intercepted",
  airQualityImprovement: "air_quality_improvement",
  leafArea: "leaf_area",
  evapotranspiration: "evapotranspiration",
  trunkCircumference: "trunk_circumference",
  trunkDiameter: "trunk_diameter",
  treeHeight: "tree_height"
};

const treeData = {
  async create(payload, tx) {
    ensurePositiveInt("treeId", payload.treeId);
    for (const field of Object.keys(TREE_DATA_NUMERIC_FIELDS)) {
      ensureNumberOrNull(field, payload[field]);
    }

    const result = await run(
      runtimeExecutor(tx),
      `INSERT INTO tree_data (
        tree_id, avoided_runoff, carbon_dioxide_stored, carbon_dioxide_removed,
        water_intercepted, air_quality_improvement, leaf_area, evapotranspiration,
        trunk_circumference, trunk_diameter, tree_height
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        payload.treeId,
        payload.avoidedRunoff ?? null,
        payload.carbonDioxideStored ?? null,
        payload.carbonDioxideRemoved ?? null,
        payload.waterIntercepted ?? null,
        payload.airQualityImprovement ?? null,
        payload.leafArea ?? null,
        payload.evapotranspiration ?? null,
        payload.trunkCircumference ?? null,
        payload.trunkDiameter ?? null,
        payload.treeHeight ?? null
      ]
    );
    return this.getById(Number(result.insertId), tx);
  },

  async getById(id, tx) {
    ensurePositiveInt("id", id);
    return selectOne(runtimeExecutor(tx), "SELECT * FROM tree_data WHERE id = ?", [id]);
  },

  async getByTreeId(treeId, tx) {
    ensurePositiveInt("treeId", treeId);
    return selectOne(runtimeExecutor(tx), "SELECT * FROM tree_data WHERE tree_id = ? ORDER BY id DESC LIMIT 1", [treeId]);
  },

  async updateByTreeId(treeId, fields, tx) {
    ensurePositiveInt("treeId", treeId);
    for (const field of Object.keys(TREE_DATA_NUMERIC_FIELDS)) {
      if (Object.prototype.hasOwnProperty.call(fields, field)) {
        ensureNumberOrNull(field, fields[field]);
      }
    }

    const { updates, params } = buildUpdate(fields, TREE_DATA_NUMERIC_FIELDS);

    const result = await run(
      runtimeExecutor(tx),
      `UPDATE tree_data SET ${updates.join(", ")} WHERE tree_id = ?`,
      [...params, treeId]
    );
    if (result.affectedRows === 0) {
      throw new NotFoundError(`tree_data for tree ${treeId} not found`);
    }
    return this.getByTreeId(treeId, tx);
  },

  async deleteByTreeId(treeId, tx) {
    ensurePositiveInt("treeId", treeId);
    const result = await run(runtimeExecutor(tx), "DELETE FROM tree_data WHERE tree_id = ?", [treeId]);
    return { deleted: result.affectedRows > 0 };
  },

  async list(params = {}, tx) {
    const { limit, offset } = normalizeListParams(params);
    return run(runtimeExecutor(tx), "SELECT * FROM tree_data ORDER BY id DESC LIMIT ? OFFSET ?", [limit, offset]);
  }
};

const guardians = {
  async add(payload, tx) {
    ensurePositiveInt("userId", payload.userId);
    ensurePositiveInt("treeId", payload.treeId);
    const result = await run(
      runtimeExecutor(tx),
      "INSERT IGNORE INTO guardians (user_id, tree_id) VALUES (?, ?)",
      [payload.userId, payload.treeId]
    );
    return { added: result.affectedRows > 0 };
  },

  async remove(payload, tx) {
    ensurePositiveInt("userId", payload.userId);
    ensurePositiveInt("treeId", payload.treeId);
    const result = await run(runtimeExecutor(tx), "DELETE FROM guardians WHERE user_id = ? AND tree_id = ?", [
      payload.userId,
      payload.treeId
    ]);
    return { removed: result.affectedRows > 0 };
  },

  async exists(payload, tx) {
    ensurePositiveInt("userId", payload.userId);
    ensurePositiveInt("treeId", payload.treeId);
    const row = await selectOne(runtimeExecutor(tx), "SELECT 1 AS ok FROM guardians WHERE user_id = ? AND tree_id = ?", [
      payload.userId,
      payload.treeId
    ]);
    return Boolean(row);
  },

  async listByUser(userId, params = {}, tx) {
    ensurePositiveInt("userId", userId);
    const { limit, offset } = normalizeListParams(params);
    const rows = await run(
      runtimeExecutor(tx),
      "SELECT tree_id FROM guardians WHERE user_id = ? ORDER BY tree_id DESC LIMIT ? OFFSET ?",
      [userId, limit, offset]
    );
    return rows.map((row) => row.tree_id);
  },

  async listByTree(treeId, params = {}, tx) {
    ensurePositiveInt("treeId", treeId);
    const { limit, offset } = normalizeListParams(params);
    const rows = await run(
      runtimeExecutor(tx),
      "SELECT user_id FROM guardians WHERE tree_id = ? ORDER BY user_id DESC LIMIT ? OFFSET ?",
      [treeId, limit, offset]
    );
    return rows.map((row) => row.user_id);
  },

  async countByUser(userId, tx) {
    ensurePositiveInt("userId", userId);
    const row = await selectOne(runtimeExecutor(tx), "SELECT COUNT(*) AS total FROM guardians WHERE user_id = ?", [userId]);
    return Number(row.total || 0);
  },

  async countByTree(treeId, tx) {
    ensurePositiveInt("treeId", treeId);
    const row = await selectOne(runtimeExecutor(tx), "SELECT COUNT(*) AS total FROM guardians WHERE tree_id = ?", [treeId]);
    return Number(row.total || 0);
  }
};

const photos = {
  async create(payload, tx) {
    ensureRequiredString("imageUrl", payload.imageUrl, 65535);
    ensureStringMax("mimeType", payload.mimeType, 100);
    if (payload.byteSize !== undefined && payload.byteSize !== null) {
      assert(Number.isInteger(payload.byteSize) && payload.byteSize >= 0, "byteSize must be an unsigned integer");
    }
    ensureHex64("sha256", payload.sha256, true);
    const createdAt = toDateInput("createdAt", payload.createdAt);

    const result = await run(
      runtimeExecutor(tx),
      "INSERT INTO photos (image_url, mime_type, byte_size, sha256, created_at) VALUES (?, ?, ?, ?, ?)",
      [payload.imageUrl, payload.mimeType || null, payload.byteSize ?? null, payload.sha256 || null, createdAt || null]
    );
    return this.getById(Number(result.insertId), tx);
  },

  async getById(id, tx) {
    ensurePositiveInt("id", id);
    return selectOne(runtimeExecutor(tx), "SELECT * FROM photos WHERE id = ?", [id]);
  },

  async getBySha256(sha256, tx) {
    ensureHex64("sha256", sha256);
    return selectOne(runtimeExecutor(tx), "SELECT * FROM photos WHERE sha256 = ?", [sha256]);
  },

  async list(params = {}, tx) {
    const { limit, offset } = normalizeListParams(params);
    return run(runtimeExecutor(tx), "SELECT * FROM photos ORDER BY id DESC LIMIT ? OFFSET ?", [limit, offset]);
  },

  async updateById(id, fields, tx) {
    ensurePositiveInt("id", id);
    if (fields.imageUrl !== undefined) ensureRequiredString("imageUrl", fields.imageUrl, 65535);
    if (fields.mimeType !== undefined) ensureStringMax("mimeType", fields.mimeType, 100);
    if (fields.byteSize !== undefined && fields.byteSize !== null) {
      assert(Number.isInteger(fields.byteSize) && fields.byteSize >= 0, "byteSize must be an unsigned integer");
    }
    if (fields.sha256 !== undefined) ensureHex64("sha256", fields.sha256, true);

    const { updates, params } = buildUpdate(fields, {
      imageUrl: "image_url",
      mimeType: "mime_type",
      byteSize: "byte_size",
      sha256: "sha256"
    });

    const result = await run(runtimeExecutor(tx), `UPDATE photos SET ${updates.join(", ")} WHERE id = ?`, [...params, id]);
    if (result.affectedRows === 0) {
      throw new NotFoundError(`Photo ${id} not found`);
    }
    return this.getById(id, tx);
  },

  async deleteById(id, tx) {
    ensurePositiveInt("id", id);
    const result = await run(runtimeExecutor(tx), "DELETE FROM photos WHERE id = ?", [id]);
    return { deleted: result.affectedRows > 0 };
  },

  async existsById(id, tx) {
    ensurePositiveInt("id", id);
    const row = await selectOne(runtimeExecutor(tx), "SELECT 1 AS ok FROM photos WHERE id = ?", [id]);
    return Boolean(row);
  }
};

const treePhotos = {
  async add(payload, tx) {
    ensurePositiveInt("treeId", payload.treeId);
    ensurePositiveInt("photoId", payload.photoId);
    const result = await run(runtimeExecutor(tx), "INSERT IGNORE INTO tree_photos (tree_id, photo_id) VALUES (?, ?)", [
      payload.treeId,
      payload.photoId
    ]);
    return { added: result.affectedRows > 0 };
  },

  async remove(payload, tx) {
    ensurePositiveInt("treeId", payload.treeId);
    ensurePositiveInt("photoId", payload.photoId);
    const result = await run(runtimeExecutor(tx), "DELETE FROM tree_photos WHERE tree_id = ? AND photo_id = ?", [
      payload.treeId,
      payload.photoId
    ]);
    return { removed: result.affectedRows > 0 };
  },

  async exists(payload, tx) {
    ensurePositiveInt("treeId", payload.treeId);
    ensurePositiveInt("photoId", payload.photoId);
    const row = await selectOne(runtimeExecutor(tx), "SELECT 1 AS ok FROM tree_photos WHERE tree_id = ? AND photo_id = ?", [
      payload.treeId,
      payload.photoId
    ]);
    return Boolean(row);
  },

  async listPhotoIdsByTree(treeId, params = {}, tx) {
    ensurePositiveInt("treeId", treeId);
    const { limit, offset } = normalizeListParams(params);
    const rows = await run(
      runtimeExecutor(tx),
      "SELECT photo_id FROM tree_photos WHERE tree_id = ? ORDER BY photo_id DESC LIMIT ? OFFSET ?",
      [treeId, limit, offset]
    );
    return rows.map((row) => row.photo_id);
  },

  async listTreeIdsByPhoto(photoId, params = {}, tx) {
    ensurePositiveInt("photoId", photoId);
    const { limit, offset } = normalizeListParams(params);
    const rows = await run(
      runtimeExecutor(tx),
      "SELECT tree_id FROM tree_photos WHERE photo_id = ? ORDER BY tree_id DESC LIMIT ? OFFSET ?",
      [photoId, limit, offset]
    );
    return rows.map((row) => row.tree_id);
  },

  async deleteAllForTree(treeId, tx) {
    ensurePositiveInt("treeId", treeId);
    const result = await run(runtimeExecutor(tx), "DELETE FROM tree_photos WHERE tree_id = ?", [treeId]);
    return { count: result.affectedRows };
  },

  async deleteAllForPhoto(photoId, tx) {
    ensurePositiveInt("photoId", photoId);
    const result = await run(runtimeExecutor(tx), "DELETE FROM tree_photos WHERE photo_id = ?", [photoId]);
    return { count: result.affectedRows };
  }
};

const comments = {
  async create(payload = {}, tx) {
    if (payload.userId !== undefined && payload.userId !== null) {
      ensurePositiveInt("userId", payload.userId);
    }
    const createdAt = toDateInput("createdAt", payload.createdAt);
    const result = await run(runtimeExecutor(tx), "INSERT INTO comments (user_id, created_at) VALUES (?, ?)", [
      payload.userId || null,
      createdAt || null
    ]);
    return this.getById(Number(result.insertId), tx);
  },

  async getById(id, tx) {
    ensurePositiveInt("id", id);
    return selectOne(runtimeExecutor(tx), "SELECT id, user_id, created_at FROM comments WHERE id = ?", [id]);
  },

  async list(params = {}, tx) {
    const { limit, offset } = normalizeListParams(params);
    return run(runtimeExecutor(tx), "SELECT id, user_id, created_at FROM comments ORDER BY id DESC LIMIT ? OFFSET ?", [
      limit,
      offset
    ]);
  },

  async listByUserId(userId, params = {}, tx) {
    ensurePositiveInt("userId", userId);
    const { limit, offset } = normalizeListParams(params);
    return run(
      runtimeExecutor(tx),
      "SELECT id, user_id, created_at FROM comments WHERE user_id = ? ORDER BY id DESC LIMIT ? OFFSET ?",
      [userId, limit, offset]
    );
  },

  async updateUserById(id, userIdOrNull, tx) {
    ensurePositiveInt("id", id);
    if (userIdOrNull !== null) {
      ensurePositiveInt("userId", userIdOrNull);
    }
    const result = await run(runtimeExecutor(tx), "UPDATE comments SET user_id = ? WHERE id = ?", [userIdOrNull, id]);
    if (result.affectedRows === 0) {
      throw new NotFoundError(`Comment ${id} not found`);
    }
    return this.getById(id, tx);
  },

  async deleteById(id, tx) {
    ensurePositiveInt("id", id);
    const result = await run(runtimeExecutor(tx), "DELETE FROM comments WHERE id = ?", [id]);
    return { deleted: result.affectedRows > 0 };
  }
};

const commentPhotos = {
  async add(payload, tx) {
    ensurePositiveInt("commentId", payload.commentId);
    ensurePositiveInt("photoId", payload.photoId);
    const result = await run(
      runtimeExecutor(tx),
      "INSERT IGNORE INTO comment_photos (comment_id, photo_id) VALUES (?, ?)",
      [payload.commentId, payload.photoId]
    );
    return { added: result.affectedRows > 0 };
  },

  async remove(payload, tx) {
    ensurePositiveInt("commentId", payload.commentId);
    ensurePositiveInt("photoId", payload.photoId);
    const result = await run(runtimeExecutor(tx), "DELETE FROM comment_photos WHERE comment_id = ? AND photo_id = ?", [
      payload.commentId,
      payload.photoId
    ]);
    return { removed: result.affectedRows > 0 };
  },

  async exists(payload, tx) {
    ensurePositiveInt("commentId", payload.commentId);
    ensurePositiveInt("photoId", payload.photoId);
    const row = await selectOne(runtimeExecutor(tx), "SELECT 1 AS ok FROM comment_photos WHERE comment_id = ? AND photo_id = ?", [
      payload.commentId,
      payload.photoId
    ]);
    return Boolean(row);
  },

  async listPhotoIdsByComment(commentId, params = {}, tx) {
    ensurePositiveInt("commentId", commentId);
    const { limit, offset } = normalizeListParams(params);
    const rows = await run(
      runtimeExecutor(tx),
      "SELECT photo_id FROM comment_photos WHERE comment_id = ? ORDER BY photo_id DESC LIMIT ? OFFSET ?",
      [commentId, limit, offset]
    );
    return rows.map((row) => row.photo_id);
  },

  async listCommentIdsByPhoto(photoId, params = {}, tx) {
    ensurePositiveInt("photoId", photoId);
    const { limit, offset } = normalizeListParams(params);
    const rows = await run(
      runtimeExecutor(tx),
      "SELECT comment_id FROM comment_photos WHERE photo_id = ? ORDER BY comment_id DESC LIMIT ? OFFSET ?",
      [photoId, limit, offset]
    );
    return rows.map((row) => row.comment_id);
  },

  async deleteAllForComment(commentId, tx) {
    ensurePositiveInt("commentId", commentId);
    const result = await run(runtimeExecutor(tx), "DELETE FROM comment_photos WHERE comment_id = ?", [commentId]);
    return { count: result.affectedRows };
  },

  async deleteAllForPhoto(photoId, tx) {
    ensurePositiveInt("photoId", photoId);
    const result = await run(runtimeExecutor(tx), "DELETE FROM comment_photos WHERE photo_id = ?", [photoId]);
    return { count: result.affectedRows };
  }
};

const commentsTree = {
  async create(payload, tx) {
    ensurePositiveInt("commentId", payload.commentId);
    ensurePositiveInt("treeId", payload.treeId);
    ensureRequiredString("content", payload.content, 65535);
    const createdAt = toDateInput("createdAt", payload.createdAt);

    await run(
      runtimeExecutor(tx),
      "INSERT INTO comments_tree (comment_id, tree_id, content, created_at) VALUES (?, ?, ?, ?)",
      [payload.commentId, payload.treeId, payload.content, createdAt || null]
    );
    return this.get({ commentId: payload.commentId, treeId: payload.treeId }, tx);
  },

  async get(payload, tx) {
    ensurePositiveInt("commentId", payload.commentId);
    ensurePositiveInt("treeId", payload.treeId);
    return selectOne(runtimeExecutor(tx), "SELECT * FROM comments_tree WHERE comment_id = ? AND tree_id = ?", [
      payload.commentId,
      payload.treeId
    ]);
  },

  async getByCommentId(commentId, tx) {
    ensurePositiveInt("commentId", commentId);
    return selectOne(runtimeExecutor(tx), "SELECT * FROM comments_tree WHERE comment_id = ?", [commentId]);
  },

  async listByTreeId(treeId, params = {}, tx) {
    ensurePositiveInt("treeId", treeId);
    const { limit, offset } = normalizeListParams(params);
    const order = ensureOrder(params.order);
    return run(
      runtimeExecutor(tx),
      `SELECT * FROM comments_tree WHERE tree_id = ? ORDER BY created_at ${order.toUpperCase()} LIMIT ? OFFSET ?`,
      [treeId, limit, offset]
    );
  },

  async updateContent(payload, tx) {
    ensurePositiveInt("commentId", payload.commentId);
    ensurePositiveInt("treeId", payload.treeId);
    ensureRequiredString("content", payload.content, 65535);
    const result = await run(runtimeExecutor(tx), "UPDATE comments_tree SET content = ? WHERE comment_id = ? AND tree_id = ?", [
      payload.content,
      payload.commentId,
      payload.treeId
    ]);
    if (result.affectedRows === 0) {
      throw new NotFoundError("comments_tree row not found");
    }
    return this.get(payload, tx);
  },

  async delete(payload, tx) {
    ensurePositiveInt("commentId", payload.commentId);
    ensurePositiveInt("treeId", payload.treeId);
    const result = await run(runtimeExecutor(tx), "DELETE FROM comments_tree WHERE comment_id = ? AND tree_id = ?", [
      payload.commentId,
      payload.treeId
    ]);
    return { deleted: result.affectedRows > 0 };
  },

  async deleteByCommentId(commentId, tx) {
    ensurePositiveInt("commentId", commentId);
    const result = await run(runtimeExecutor(tx), "DELETE FROM comments_tree WHERE comment_id = ?", [commentId]);
    return { count: result.affectedRows };
  },

  async deleteAllForTree(treeId, tx) {
    ensurePositiveInt("treeId", treeId);
    const result = await run(runtimeExecutor(tx), "DELETE FROM comments_tree WHERE tree_id = ?", [treeId]);
    return { count: result.affectedRows };
  }
};

const commentReplies = {
  async create(payload, tx) {
    ensurePositiveInt("commentId", payload.commentId);
    ensurePositiveInt("parentCommentId", payload.parentCommentId);
    ensureRequiredString("content", payload.content, 65535);
    const createdAt = toDateInput("createdAt", payload.createdAt);

    await run(
      runtimeExecutor(tx),
      "INSERT INTO comment_replies (comment_id, parent_comment_id, content, created_at) VALUES (?, ?, ?, ?)",
      [payload.commentId, payload.parentCommentId, payload.content, createdAt || null]
    );
    return this.get({ commentId: payload.commentId, parentCommentId: payload.parentCommentId }, tx);
  },

  async get(payload, tx) {
    ensurePositiveInt("commentId", payload.commentId);
    ensurePositiveInt("parentCommentId", payload.parentCommentId);
    return selectOne(runtimeExecutor(tx), "SELECT * FROM comment_replies WHERE comment_id = ? AND parent_comment_id = ?", [
      payload.commentId,
      payload.parentCommentId
    ]);
  },

  async listByParent(parentCommentId, params = {}, tx) {
    ensurePositiveInt("parentCommentId", parentCommentId);
    const { limit, offset } = normalizeListParams(params);
    const order = ensureOrder(params.order);
    return run(
      runtimeExecutor(tx),
      `SELECT * FROM comment_replies WHERE parent_comment_id = ? ORDER BY created_at ${order.toUpperCase()} LIMIT ? OFFSET ?`,
      [parentCommentId, limit, offset]
    );
  },

  async listParentsOfComment(commentId, params = {}, tx) {
    ensurePositiveInt("commentId", commentId);
    const { limit, offset } = normalizeListParams(params);
    const rows = await run(
      runtimeExecutor(tx),
      "SELECT parent_comment_id FROM comment_replies WHERE comment_id = ? ORDER BY parent_comment_id DESC LIMIT ? OFFSET ?",
      [commentId, limit, offset]
    );
    return rows.map((row) => row.parent_comment_id);
  },

  async updateContent(payload, tx) {
    ensurePositiveInt("commentId", payload.commentId);
    ensurePositiveInt("parentCommentId", payload.parentCommentId);
    ensureRequiredString("content", payload.content, 65535);
    const result = await run(
      runtimeExecutor(tx),
      "UPDATE comment_replies SET content = ? WHERE comment_id = ? AND parent_comment_id = ?",
      [payload.content, payload.commentId, payload.parentCommentId]
    );
    if (result.affectedRows === 0) {
      throw new NotFoundError("comment_replies row not found");
    }
    return this.get(payload, tx);
  },

  async delete(payload, tx) {
    ensurePositiveInt("commentId", payload.commentId);
    ensurePositiveInt("parentCommentId", payload.parentCommentId);
    const result = await run(runtimeExecutor(tx), "DELETE FROM comment_replies WHERE comment_id = ? AND parent_comment_id = ?", [
      payload.commentId,
      payload.parentCommentId
    ]);
    return { deleted: result.affectedRows > 0 };
  },

  async deleteByCommentId(commentId, tx) {
    ensurePositiveInt("commentId", commentId);
    const result = await run(runtimeExecutor(tx), "DELETE FROM comment_replies WHERE comment_id = ?", [commentId]);
    return { count: result.affectedRows };
  },

  async deleteAllForParent(parentCommentId, tx) {
    ensurePositiveInt("parentCommentId", parentCommentId);
    const result = await run(runtimeExecutor(tx), "DELETE FROM comment_replies WHERE parent_comment_id = ?", [parentCommentId]);
    return { count: result.affectedRows };
  }
};

const wildlifeObservations = {
  async create(payload, tx) {
    ensurePositiveInt("commentId", payload.commentId);
    ensurePositiveInt("treeId", payload.treeId);
    ensureRequiredString("wildlife", payload.wildlife, 255);
    ensureBoolean("wildlifeFound", payload.wildlifeFound);
    ensureStringMax("observationNotes", payload.observationNotes, 65535);

    await run(
      runtimeExecutor(tx),
      "INSERT INTO wildlife_observations (comment_id, tree_id, wildlife, wildlife_found, observation_notes) VALUES (?, ?, ?, ?, ?)",
      [payload.commentId, payload.treeId, payload.wildlife, payload.wildlifeFound ? 1 : 0, payload.observationNotes || null]
    );
    return this.getByCommentId(payload.commentId, tx);
  },

  async getByCommentId(commentId, tx) {
    ensurePositiveInt("commentId", commentId);
    return selectOne(runtimeExecutor(tx), "SELECT * FROM wildlife_observations WHERE comment_id = ?", [commentId]);
  },

  async listByTreeId(treeId, params = {}, tx) {
    ensurePositiveInt("treeId", treeId);
    const { limit, offset } = normalizeListParams(params);
    const order = ensureOrder(params.order);
    return run(
      runtimeExecutor(tx),
      `SELECT * FROM wildlife_observations WHERE tree_id = ? ORDER BY comment_id ${order.toUpperCase()} LIMIT ? OFFSET ?`,
      [treeId, limit, offset]
    );
  },

  async updateByCommentId(commentId, fields, tx) {
    ensurePositiveInt("commentId", commentId);
    if (fields.wildlife !== undefined) ensureRequiredString("wildlife", fields.wildlife, 255);
    if (fields.wildlifeFound !== undefined) ensureBoolean("wildlifeFound", fields.wildlifeFound);
    if (fields.observationNotes !== undefined) ensureStringMax("observationNotes", fields.observationNotes, 65535);

    const mappedFields = { ...fields };
    if (mappedFields.wildlifeFound !== undefined) {
      mappedFields.wildlifeFound = mappedFields.wildlifeFound ? 1 : 0;
    }

    const { updates, params } = buildUpdate(mappedFields, {
      wildlife: "wildlife",
      wildlifeFound: "wildlife_found",
      observationNotes: "observation_notes"
    });

    const result = await run(
      runtimeExecutor(tx),
      `UPDATE wildlife_observations SET ${updates.join(", ")} WHERE comment_id = ?`,
      [...params, commentId]
    );
    if (result.affectedRows === 0) {
      throw new NotFoundError("wildlife observation not found");
    }
    return this.getByCommentId(commentId, tx);
  },

  async deleteByCommentId(commentId, tx) {
    ensurePositiveInt("commentId", commentId);
    const result = await run(runtimeExecutor(tx), "DELETE FROM wildlife_observations WHERE comment_id = ?", [commentId]);
    return { deleted: result.affectedRows > 0 };
  }
};

const diseaseObservations = {
  async create(payload, tx) {
    ensurePositiveInt("commentId", payload.commentId);
    ensurePositiveInt("treeId", payload.treeId);
    ensureRequiredString("disease", payload.disease, 255);
    ensureStringMax("evidence", payload.evidence, 65535);

    await run(
      runtimeExecutor(tx),
      "INSERT INTO disease_observations (comment_id, tree_id, disease, evidence) VALUES (?, ?, ?, ?)",
      [payload.commentId, payload.treeId, payload.disease, payload.evidence || null]
    );
    return this.getByCommentId(payload.commentId, tx);
  },

  async getByCommentId(commentId, tx) {
    ensurePositiveInt("commentId", commentId);
    return selectOne(runtimeExecutor(tx), "SELECT * FROM disease_observations WHERE comment_id = ?", [commentId]);
  },

  async listByTreeId(treeId, params = {}, tx) {
    ensurePositiveInt("treeId", treeId);
    const { limit, offset } = normalizeListParams(params);
    const order = ensureOrder(params.order);
    return run(
      runtimeExecutor(tx),
      `SELECT * FROM disease_observations WHERE tree_id = ? ORDER BY comment_id ${order.toUpperCase()} LIMIT ? OFFSET ?`,
      [treeId, limit, offset]
    );
  },

  async updateByCommentId(commentId, fields, tx) {
    ensurePositiveInt("commentId", commentId);
    if (fields.disease !== undefined) ensureRequiredString("disease", fields.disease, 255);
    if (fields.evidence !== undefined) ensureStringMax("evidence", fields.evidence, 65535);

    const { updates, params } = buildUpdate(fields, {
      disease: "disease",
      evidence: "evidence"
    });

    const result = await run(
      runtimeExecutor(tx),
      `UPDATE disease_observations SET ${updates.join(", ")} WHERE comment_id = ?`,
      [...params, commentId]
    );
    if (result.affectedRows === 0) {
      throw new NotFoundError("disease observation not found");
    }
    return this.getByCommentId(commentId, tx);
  },

  async deleteByCommentId(commentId, tx) {
    ensurePositiveInt("commentId", commentId);
    const result = await run(runtimeExecutor(tx), "DELETE FROM disease_observations WHERE comment_id = ?", [commentId]);
    return { deleted: result.affectedRows > 0 };
  }
};

const seenObservations = {
  async create(payload, tx) {
    ensurePositiveInt("commentId", payload.commentId);
    ensurePositiveInt("treeId", payload.treeId);
    ensureStringMax("observationNotes", payload.observationNotes, 65535);
    await run(runtimeExecutor(tx), "INSERT INTO seen_observations (comment_id, tree_id, observation_notes) VALUES (?, ?, ?)", [
      payload.commentId,
      payload.treeId,
      payload.observationNotes || null
    ]);
    return this.getByCommentId(payload.commentId, tx);
  },

  async getByCommentId(commentId, tx) {
    ensurePositiveInt("commentId", commentId);
    return selectOne(runtimeExecutor(tx), "SELECT * FROM seen_observations WHERE comment_id = ?", [commentId]);
  },

  async listByTreeId(treeId, params = {}, tx) {
    ensurePositiveInt("treeId", treeId);
    const { limit, offset } = normalizeListParams(params);
    const order = ensureOrder(params.order);
    return run(
      runtimeExecutor(tx),
      `SELECT * FROM seen_observations WHERE tree_id = ? ORDER BY comment_id ${order.toUpperCase()} LIMIT ? OFFSET ?`,
      [treeId, limit, offset]
    );
  },

  async updateByCommentId(commentId, fields, tx) {
    ensurePositiveInt("commentId", commentId);
    if (fields.observationNotes !== undefined) ensureStringMax("observationNotes", fields.observationNotes, 65535);

    const { updates, params } = buildUpdate(fields, {
      observationNotes: "observation_notes"
    });

    const result = await run(
      runtimeExecutor(tx),
      `UPDATE seen_observations SET ${updates.join(", ")} WHERE comment_id = ?`,
      [...params, commentId]
    );
    if (result.affectedRows === 0) {
      throw new NotFoundError("seen observation not found");
    }
    return this.getByCommentId(commentId, tx);
  },

  async deleteByCommentId(commentId, tx) {
    ensurePositiveInt("commentId", commentId);
    const result = await run(runtimeExecutor(tx), "DELETE FROM seen_observations WHERE comment_id = ?", [commentId]);
    return { deleted: result.affectedRows > 0 };
  }
};

const workflows = {
  auth: {
    async registerUser(payload) {
      ensureRequiredString("username", payload.username, 100);
      ensureRequiredString("passwordHash", payload.passwordHash, 255);
      return transaction(async (tx) => {
        const user = await users.create(
          {
            username: payload.username,
            email: payload.email,
            phone: payload.phone
          },
          tx
        );
        await userPasswords.setForUser(user.id, payload.passwordHash, tx);
        return { userId: user.id };
      });
    },

    async createSession(payload) {
      const session = await userSessions.create(payload);
      return { sessionId: session.id };
    },

    async validateSession(payload) {
      ensureHex64("sessionToken", payload.sessionToken);
      const now = toDateInput("now", payload.now) || new Date();
      const session = await userSessions.getByToken(payload.sessionToken);
      if (!session) {
        return { valid: false };
      }
      if (new Date(session.expires_at) <= now) {
        return { valid: false };
      }
      return { valid: true, userId: Number(session.user_id) };
    },

    async logout(payload) {
      ensureHex64("sessionToken", payload.sessionToken);
      await userSessions.deleteByToken(payload.sessionToken);
      return { loggedOut: true };
    }
  },

  trees: {
    async createTreeWithMeta(payload) {
      return transaction(async (tx) => {
        const tree = await trees.create({ latitude: payload.latitude, longitude: payload.longitude }, tx);
        await treeCreationData.create(
          {
            treeId: tree.id,
            creatorUserId: payload.creatorUserId
          },
          tx
        );
        return { treeId: tree.id };
      });
    },

    async setTreeData(payload) {
      ensurePositiveInt("treeId", payload.treeId);
      const existing = await treeData.getByTreeId(payload.treeId);
      if (existing) {
        await treeData.updateByTreeId(payload.treeId, payload.treeDataFields || {});
      } else {
        await treeData.create({ treeId: payload.treeId, ...(payload.treeDataFields || {}) });
      }
      return { updated: true };
    },

    async getTreeDetails(treeId) {
      ensurePositiveInt("treeId", treeId);
      const tree = await trees.getById(treeId);
      if (!tree) {
        throw new NotFoundError(`Tree ${treeId} not found`);
      }

      const [creationData, dataRow, photoIds, guardiansUserIds] = await Promise.all([
        treeCreationData.getByTreeId(treeId),
        treeData.getByTreeId(treeId),
        treePhotos.listPhotoIdsByTree(treeId, { limit: 500, offset: 0 }),
        guardians.listByTree(treeId, { limit: 500, offset: 0 })
      ]);

      return {
        tree,
        creationData,
        treeData: dataRow,
        photoIds,
        guardiansUserIds
      };
    },

    async getTreeFeed(treeId, params = {}) {
      ensurePositiveInt("treeId", treeId);
      const { limit, offset } = normalizeListParams(params);

      // Fundamental tension: strict normalization vs query efficiency. We intentionally use a typed SQL union to keep feed reads fast.
      const rows = await run(
        runtimeExecutor(),
        `
          SELECT 'tree_comment' AS item_type, ct.comment_id, ct.created_at, ct.content, NULL AS extra
          FROM comments_tree ct
          WHERE ct.tree_id = ?
          UNION ALL
          SELECT 'wildlife' AS item_type, wo.comment_id, c.created_at, wo.observation_notes AS content, wo.wildlife AS extra
          FROM wildlife_observations wo
          INNER JOIN comments c ON c.id = wo.comment_id
          WHERE wo.tree_id = ?
          UNION ALL
          SELECT 'disease' AS item_type, dobs.comment_id, c.created_at, dobs.evidence AS content, dobs.disease AS extra
          FROM disease_observations dobs
          INNER JOIN comments c ON c.id = dobs.comment_id
          WHERE dobs.tree_id = ?
          UNION ALL
          SELECT 'seen' AS item_type, so.comment_id, c.created_at, so.observation_notes AS content, NULL AS extra
          FROM seen_observations so
          INNER JOIN comments c ON c.id = so.comment_id
          WHERE so.tree_id = ?
          UNION ALL
          SELECT 'reply' AS item_type, cr.comment_id, cr.created_at, cr.content, CAST(cr.parent_comment_id AS CHAR) AS extra
          FROM comment_replies cr
          INNER JOIN comments_tree ct2 ON ct2.comment_id = cr.parent_comment_id
          WHERE ct2.tree_id = ?
          ORDER BY created_at DESC
          LIMIT ? OFFSET ?
        `,
        [treeId, treeId, treeId, treeId, treeId, limit, offset]
      );

      return rows;
    }
  },

  photos: {
    async addPhotoAndAttachToTree(payload) {
      ensurePositiveInt("treeId", payload.treeId);
      return transaction(async (tx) => {
        let photoRow = null;
        if (payload.photo.sha256) {
          photoRow = await photos.getBySha256(payload.photo.sha256, tx);
        }
        if (!photoRow) {
          photoRow = await photos.create(payload.photo, tx);
        }
        await treePhotos.add({ treeId: payload.treeId, photoId: photoRow.id }, tx);
        return { photoId: Number(photoRow.id) };
      });
    },

    async addPhotoAndAttachToComment(payload) {
      ensurePositiveInt("commentId", payload.commentId);
      return transaction(async (tx) => {
        let photoRow = null;
        if (payload.photo.sha256) {
          photoRow = await photos.getBySha256(payload.photo.sha256, tx);
        }
        if (!photoRow) {
          photoRow = await photos.create(payload.photo, tx);
        }
        await commentPhotos.add({ commentId: payload.commentId, photoId: photoRow.id }, tx);
        return { photoId: Number(photoRow.id) };
      });
    }
  },

  comments: {
    async addTreeComment(payload) {
      ensurePositiveInt("treeId", payload.treeId);
      ensureRequiredString("content", payload.content, 65535);
      return transaction(async (tx) => {
        const comment = await comments.create({ userId: payload.userId }, tx);
        await commentsTree.create({ commentId: comment.id, treeId: payload.treeId, content: payload.content }, tx);

        if (Array.isArray(payload.photoIds)) {
          for (const photoId of payload.photoIds) {
            ensurePositiveInt("photoId", photoId);
            await commentPhotos.add({ commentId: comment.id, photoId }, tx);
          }
        }

        return { commentId: comment.id };
      });
    },

    async replyToComment(payload) {
      ensurePositiveInt("parentCommentId", payload.parentCommentId);
      ensureRequiredString("content", payload.content, 65535);
      return transaction(async (tx) => {
        const comment = await comments.create({ userId: payload.userId }, tx);
        await commentReplies.create(
          {
            commentId: comment.id,
            parentCommentId: payload.parentCommentId,
            content: payload.content
          },
          tx
        );

        if (Array.isArray(payload.photoIds)) {
          for (const photoId of payload.photoIds) {
            ensurePositiveInt("photoId", photoId);
            await commentPhotos.add({ commentId: comment.id, photoId }, tx);
          }
        }

        return { commentId: comment.id };
      });
    }
  },

  observations: {
    async addWildlifeObservation(payload) {
      ensurePositiveInt("treeId", payload.treeId);
      return transaction(async (tx) => {
        const comment = await comments.create({ userId: payload.userId }, tx);
        await wildlifeObservations.create(
          {
            commentId: comment.id,
            treeId: payload.treeId,
            wildlife: payload.wildlife,
            wildlifeFound: payload.wildlifeFound,
            observationNotes: payload.observationNotes
          },
          tx
        );

        if (Array.isArray(payload.photoIds)) {
          for (const photoId of payload.photoIds) {
            ensurePositiveInt("photoId", photoId);
            await commentPhotos.add({ commentId: comment.id, photoId }, tx);
          }
        }

        return { commentId: comment.id };
      });
    },

    async addDiseaseObservation(payload) {
      ensurePositiveInt("treeId", payload.treeId);
      return transaction(async (tx) => {
        const comment = await comments.create({ userId: payload.userId }, tx);
        await diseaseObservations.create(
          {
            commentId: comment.id,
            treeId: payload.treeId,
            disease: payload.disease,
            evidence: payload.evidence
          },
          tx
        );

        if (Array.isArray(payload.photoIds)) {
          for (const photoId of payload.photoIds) {
            ensurePositiveInt("photoId", photoId);
            await commentPhotos.add({ commentId: comment.id, photoId }, tx);
          }
        }

        return { commentId: comment.id };
      });
    },

    async addSeenObservation(payload) {
      ensurePositiveInt("treeId", payload.treeId);
      return transaction(async (tx) => {
        const comment = await comments.create({ userId: payload.userId }, tx);
        await seenObservations.create(
          {
            commentId: comment.id,
            treeId: payload.treeId,
            observationNotes: payload.observationNotes
          },
          tx
        );

        if (Array.isArray(payload.photoIds)) {
          for (const photoId of payload.photoIds) {
            ensurePositiveInt("photoId", photoId);
            await commentPhotos.add({ commentId: comment.id, photoId }, tx);
          }
        }

        return { commentId: comment.id };
      });
    }
  },

  users: {
    async getUserProfile(userId) {
      ensurePositiveInt("userId", userId);
      const user = await users.getById(userId);
      if (!user) {
        throw new NotFoundError(`User ${userId} not found`);
      }
      const [isAdmin, guardianTreeIds] = await Promise.all([
        admins.isAdmin(userId),
        guardians.listByUser(userId, { limit: 500, offset: 0 })
      ]);

      return {
        user,
        isAdmin,
        guardianTreeIds
      };
    }
  }
};

// Structural constraint: do not export pool/connection/query from this module.
// Relaxing this boundary would invalidate the repository-level DB lock guarantees.
module.exports = {
  init,
  close,
  health,
  transaction,
  users,
  userPasswords,
  admins,
  userSessions,
  trees,
  treeCreationData,
  treeData,
  guardians,
  photos,
  treePhotos,
  comments,
  commentPhotos,
  commentsTree,
  commentReplies,
  wildlifeObservations,
  diseaseObservations,
  seenObservations,
  workflows,
  errors: {
    ValidationError,
    NotFoundError,
    ConflictError,
    AuthError,
    DbError
  }
};
