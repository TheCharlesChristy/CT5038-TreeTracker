const express = require("express");
const { asyncHandler } = require("../middleware/async-handler");
const { createLogger } = require("../../logging");
const { parseBearerToken, verifyJwt } = require("./utils/security");

const logger = createLogger("routes.api.users");

function getRouteLogger(req, extra = {}) {
  return req?.log?.scope ? req.log.scope("routes.api.users", extra) : logger.child(extra);
}

async function resolveUserRole(db, userId, tx) {
  if (db.users && typeof db.users.getRoleById === "function") {
    return db.users.getRoleById(userId, tx);
  }

  const [isAdmin, isGuardian] = await Promise.all([
    db.admins && typeof db.admins.isAdmin === "function" ? db.admins.isAdmin(userId, tx) : false,
    db.guardianUsers && typeof db.guardianUsers.isGuardian === "function"
      ? db.guardianUsers.isGuardian(userId, tx)
      : false
  ]);

  if (isAdmin) {
    return "admin";
  }

  if (isGuardian) {
    return "guardian";
  }

  return "registered_user";
}

function createUsersRoute({ db }) {
  const router = express.Router();

  const meHandler = async (req, res) => {
    const routeLog = getRouteLogger(req, { route: "me" });
    routeLog.info("request.start", {
      method: req.method,
      path: req.originalUrl || req.url
    });

    const token = parseBearerToken(req);
    if (!token) {
      routeLog.warn("auth.missing", { reason: "missing-bearer-token" });
      const error = new Error("Missing bearer token");
      error.name = "AuthError";
      throw error;
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      routeLog.error("configuration.missing", { key: "JWT_SECRET" });
      throw new Error("Missing required env var JWT_SECRET");
    }

    let tokenPayload;
    try {
      tokenPayload = verifyJwt(token, jwtSecret);
    } catch {
      routeLog.warn("auth.invalid", { reason: "invalid-jwt" });
      const error = new Error("Invalid token");
      error.name = "AuthError";
      throw error;
    }

    routeLog.debug("auth.verified", {
      userId: Number(tokenPayload.userId)
    });

    const user = await db.users.getById(Number(tokenPayload.userId));
    if (!user) {
      routeLog.warn("lookup.miss", { userId: Number(tokenPayload.userId) });
      res.status(404).json({ error: "User not found" });
      return;
    }

    const role = await resolveUserRole(db, user.id);

    routeLog.info("request.success", {
      userId: user.id,
      role
    });

    res.json({
      id: user.id,
      username: user.username,
      email: user.email,
      role
    });
  };

  router.get("/users/me", asyncHandler(meHandler));
  router.get("/me", asyncHandler(meHandler));

  return router;
}

module.exports = {
  createUsersRoute
};
