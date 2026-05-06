function createAccountEndpoints(ctx) {
  const { run, selectOne, runtimeExecutor, toDateInput, buildUpdate, validators, NotFoundError } = ctx;
  const { assert, ensurePositiveInt, ensureStringMax, ensureRequiredString, ensureHex64, normalizeListParams } = validators;

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
      return selectOne(
        runtimeExecutor(tx),
        "SELECT id, username, email, phone, verified_at FROM users WHERE id = ?", 
        [id]
      );
    },

    async getByUsername(username, tx) {
      ensureRequiredString("username", username, 100);
      return selectOne(
        runtimeExecutor(tx),
        "SELECT id, username, email, phone, verified_at FROM users WHERE username = ?",
        [username]
      );
    },

    async getByEmail(email, tx) {
      ensureRequiredString("email", email, 255);
      return selectOne(
        runtimeExecutor(tx),
        "SELECT id, username, email, phone, verified_at FROM users WHERE email = ?",
        [email]
      );
    },

    async getRoleById(id, tx) {
      ensurePositiveInt("id", id);

      const [isAdmin, isGuardian] = await Promise.all([
        admins.isAdmin(id, tx),
        guardianUsers.isGuardian(id, tx)
      ]);

      if (isAdmin) {
        return "admin";
      }

      if (isGuardian) {
        return "guardian";
      }

      return "registered_user";
    },

    async list(params = {}, tx) {
      const { limit, offset } = normalizeListParams(params);
      return run(runtimeExecutor(tx), "SELECT id, username, email, phone, verified_at FROM users ORDER BY id DESC LIMIT ? OFFSET ?", [
        limit,
        offset
      ]);
    },

    async count(tx) {
      const row = await selectOne(runtimeExecutor(tx), "SELECT COUNT(*) AS total FROM users");
      return row ? Number(row.total) : 0;
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
      return { deleted: result.affectedRows > 0 };
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
    },

    async existsByEmail(email, tx) {
      ensureRequiredString("email", email, 255);
      const row = await selectOne(runtimeExecutor(tx), "SELECT 1 AS ok FROM users WHERE email = ?", [email]);
      return Boolean(row);
    },

    async setVerifiedAt(id, date, tx) {
      ensurePositiveInt("id", id);
      const verifiedAt = toDateInput("verifiedAt", date);
      assert(verifiedAt, "date is required");
      const result = await run(
        runtimeExecutor(tx),
        "UPDATE users SET verified_at = ? WHERE id = ?",
        [verifiedAt, id]
      );
      if (result.affectedRows === 0) {
        throw new NotFoundError(`User ${id} not found`);
      }
      return this.getById(id, tx);
    },

    async revokeVerification(id, tx) {
      ensurePositiveInt("id", id);
      const result = await run(
        runtimeExecutor(tx),
        "UPDATE users SET verified_at = NULL WHERE id = ?",
        [id]
      );
      if (result.affectedRows === 0) {
        throw new NotFoundError(`User ${id} not found`);
      }
      return this.getById(id, tx);
    },
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

  const guardianUsers = {
    async grant(userId, tx) {
      ensurePositiveInt("userId", userId);
      await run(
        runtimeExecutor(tx),
        "INSERT INTO guardians (user_id) VALUES (?) ON DUPLICATE KEY UPDATE user_id = user_id",
        [userId]
      );
      return { userId };
    },

    async revoke(userId, tx) {
      ensurePositiveInt("userId", userId);
      const result = await run(runtimeExecutor(tx), "DELETE FROM guardians WHERE user_id = ?", [userId]);
      return { revoked: result.affectedRows > 0 };
    },

    async isGuardian(userId, tx) {
      ensurePositiveInt("userId", userId);
      const row = await selectOne(runtimeExecutor(tx), "SELECT 1 AS ok FROM guardians WHERE user_id = ?", [userId]);
      return Boolean(row);
    },

    async list(params = {}, tx) {
      const { limit, offset } = normalizeListParams(params);
      return run(runtimeExecutor(tx), "SELECT user_id FROM guardians ORDER BY user_id DESC LIMIT ? OFFSET ?", [limit, offset]);
    }
  };

  const emailVerificationTokens = {
    async create(userId, tx) {
      ensurePositiveInt("userId", userId);
      const crypto = require("crypto");
      const token = crypto.randomBytes(32).toString("hex"); // 64 char hex
      const expiresAt = toDateInput("expiresAt", new Date(Date.now() + 60 * 60 * 1000)); // 1 hour

      await run(
        runtimeExecutor(tx),
        "INSERT INTO email_verification_tokens (user_id, token, expires_at) VALUES (?, ?, ?)",
        [userId, token, expiresAt]
      );

      return token;
    },

    async getByToken(token, tx) {
      ensureRequiredString("token", token, 64);
      return selectOne(
        runtimeExecutor(tx),
        "SELECT id, user_id, token, created_at, expires_at FROM email_verification_tokens WHERE token = ? AND expires_at > NOW()",
        [token]
      );
    },

    async deleteByToken(token, tx) {
      ensureRequiredString("token", token, 64);
      const result = await run(
        runtimeExecutor(tx),
        "DELETE FROM email_verification_tokens WHERE token = ?",
        [token]
      );
      return { deleted: result.affectedRows > 0 };
    },

    async deleteByUserId(userId, tx) {
      ensurePositiveInt("userId", userId);
      const result = await run(
        runtimeExecutor(tx),
        "DELETE FROM email_verification_tokens WHERE user_id = ?",
        [userId]
      );
      return { count: result.affectedRows };
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

  return {
    users,
    userPasswords,
    admins,
    guardianUsers,
    userSessions,
    emailVerificationTokens
  };
}

module.exports = {
  createAccountEndpoints
};
