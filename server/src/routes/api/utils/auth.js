const { AuthError } = require("../../../errors");
const { parseBearerToken, verifyJwt } = require("./security");

function requireJwtSecret() {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    throw new Error("Missing required env var JWT_SECRET");
  }
  return jwtSecret;
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

async function requireAuthenticatedUser({ req, db, tx = undefined, routeLog = null }) {
  const token = parseBearerToken(req);
  if (!token) {
    routeLog?.warn?.("auth.missing", { reason: "missing-bearer-token" });
    throw new AuthError("Missing bearer token");
  }

  let tokenPayload;
  try {
    tokenPayload = verifyJwt(token, requireJwtSecret());
  } catch {
    routeLog?.warn?.("auth.invalid", { reason: "invalid-jwt" });
    throw new AuthError("Invalid token");
  }

  const userId = Number(tokenPayload.userId);
  const user = await db.users.getById(userId, tx);
  if (!user) {
    routeLog?.warn?.("auth.user.missing", { userId });
    throw new AuthError("User not found");
  }

  const role = await resolveUserRole(db, user.id, tx);
  routeLog?.debug?.("auth.verified", { userId: user.id, role });

  return {
    token,
    tokenPayload,
    user: {
      ...user,
      role
    }
  };
}

module.exports = {
  requireJwtSecret,
  resolveUserRole,
  requireAuthenticatedUser
};
