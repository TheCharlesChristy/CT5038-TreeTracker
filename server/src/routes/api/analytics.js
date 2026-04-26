const express = require("express");
const { asyncHandler } = require("../middleware/async-handler");
const { createLogger } = require("../../logging");
const { requireAuthenticatedUser } = require("./utils/auth");

const logger = createLogger("routes.api.analytics");

function getRouteLogger(req, extra = {}) {
  return req?.log?.scope ? req.log.scope("routes.api.analytics", extra) : logger.child(extra);
}

function createAnalyticsRoute({ db }) {
  const router = express.Router();

  const analyticsHandler = async (req, res) => {
    const routeLog = getRouteLogger(req, { route: "analytics-overview" });
    routeLog.info("request.start", {
      method: req.method,
      path: req.originalUrl || req.url
    });

    const auth = await requireAuthenticatedUser({ req, db, routeLog });

    if (auth.user.role !== "admin") {
      const error = new Error("Admin access required");
      error.name = "ForbiddenError";
      throw error;
    }

    const [totalTrees, totalUsers, impactTotals] = await Promise.all([
      db.trees.count(),
      db.users.count(),
      db.treeData.getImpactTotals()
    ]);

    routeLog.info("request.success", {
      totalTrees,
      totalUsers
    });

    res.json({
      totalTrees,
      totalUsers,
      impactTotals
    });
  };

  router.get("/analytics", asyncHandler(analyticsHandler));

  return router;
}

module.exports = {
  createAnalyticsRoute
};