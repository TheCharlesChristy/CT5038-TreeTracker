const express = require("express");
const { asyncHandler } = require("../middleware/async-handler");
const { createLogger } = require("../../logging");
const { requireAuthenticatedUser } = require("./utils/auth");

const logger = createLogger("routes.api.users");

function getRouteLogger(req, extra = {}) {
  return req?.log?.scope ? req.log.scope("routes.api.users", extra) : logger.child(extra);
}

async function requireAdminUser({ req, db, routeLog }) {
  const auth = await requireAuthenticatedUser({ req, db, routeLog });

  if (auth.user.role !== "admin") {
    const error = new Error("Admin access required.");
    error.status = 403;
    throw error;
  }

  return auth;
}

function normalizeRole(role) {
  if (role === "registered_user" || role === "guardian" || role === "admin") {
    return role;
  }

  return null;
}

function createUsersRoute({ db }) {
  const router = express.Router();

  const meHandler = async (req, res) => {
    const routeLog = getRouteLogger(req, { route: "me" });
    const auth = await requireAuthenticatedUser({ req, db, routeLog });

    res.json({
      id: auth.user.id,
      username: auth.user.username,
      email: auth.user.email,
      role: auth.user.role
    });
  };

  router.get("/users/me", asyncHandler(meHandler));
  router.get("/me", asyncHandler(meHandler));

  router.get("/admin/users", asyncHandler(async (req, res) => {
    const routeLog = getRouteLogger(req, { route: "admin.users.list" });
    await requireAdminUser({ req, db, routeLog });

    const users = await db.users.list({ limit: 500, offset: 0 });

    const enrichedUsers = await Promise.all(
      users.map(async (user) => {
        const [role, guardianTreeIds] = await Promise.all([
          db.users.getRoleById(user.id),
          db.guardians.listByUser(user.id, { limit: 500, offset: 0 }),
        ]);

        return {
          ...user,
          role,
          guardianTreeIds,
        };
      })
    );

    res.json(enrichedUsers);
  }));

  router.patch("/admin/users/:userId/role", asyncHandler(async (req, res) => {
    const routeLog = getRouteLogger(req, { route: "admin.users.role" });
    const auth = await requireAdminUser({ req, db, routeLog });

    const userId = Number(req.params.userId);
    const role = normalizeRole(req.body?.role);

    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(400).json({ error: "Invalid user id." });
    }

    if (!role) {
      return res.status(400).json({ error: "Invalid role." });
    }

    if (auth.user.id === userId && role !== "admin") {
      return res.status(400).json({ error: "You cannot remove your own admin access." });
    }

    const userExists = await db.users.existsById(userId);
    if (!userExists) {
      return res.status(404).json({ error: "User not found." });
    }

    await db.admins.revoke(userId);
    await db.guardianUsers.revoke(userId);

    if (role === "admin") {
      await db.admins.grant(userId);
      await db.guardianUsers.grant(userId);
    } else if (role === "guardian") {
      await db.guardianUsers.grant(userId);
    }

    res.json({ success: true });
  }));

  router.post("/admin/users/:userId/guardian-trees", asyncHandler(async (req, res) => {
    const routeLog = getRouteLogger(req, { route: "admin.users.guardianTrees.add" });
    await requireAdminUser({ req, db, routeLog });

    const userId = Number(req.params.userId);
    const treeId = Number(req.body?.treeId);

    if (!Number.isInteger(userId) || userId <= 0 || !Number.isInteger(treeId) || treeId <= 0) {
      return res.status(400).json({ error: "Valid userId and treeId are required." });
    }

    await db.guardians.add({ userId, treeId });
    res.json({ success: true });
  }));

  router.delete("/admin/users/:userId/guardian-trees/:treeId", asyncHandler(async (req, res) => {
    const routeLog = getRouteLogger(req, { route: "admin.users.guardianTrees.remove" });
    await requireAdminUser({ req, db, routeLog });

    const userId = Number(req.params.userId);
    const treeId = Number(req.params.treeId);

    if (!Number.isInteger(userId) || userId <= 0 || !Number.isInteger(treeId) || treeId <= 0) {
      return res.status(400).json({ error: "Valid userId and treeId are required." });
    }

    await db.guardians.remove({ userId, treeId });
    res.json({ success: true });
  }));

  router.delete("/admin/users/:userId", asyncHandler(async (req, res) => {
    const routeLog = getRouteLogger(req, { route: "admin.users.delete" });
    const auth = await requireAdminUser({ req, db, routeLog });

    const userId = Number(req.params.userId);

    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(400).json({ error: "Invalid user id." });
    }

    if (auth.user.id === userId) {
      return res.status(400).json({ error: "You cannot delete your own account." });
    }

    const result = await db.users.deleteById(userId);

    if (!result.deleted) {
      return res.status(404).json({ error: "User not found." });
    }

    res.json({ success: true });
  }));

  return router;
}

module.exports = {
  createUsersRoute
};