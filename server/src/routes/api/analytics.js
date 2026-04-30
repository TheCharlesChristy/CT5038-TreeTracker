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

  router.get("/analytics/activity", asyncHandler(async (req, res) => {
    const routeLog = getRouteLogger(req, { route: "analytics-activity" });
    const auth = await requireAuthenticatedUser({ req, db, routeLog });

    if (auth.user.role !== "admin") {
      const error = new Error("Admin access required");
      error.name = "ForbiddenError";
      throw error;
    }

    const days = Math.min(Number(req.query.days) || 30, 90);
    const trend = await db.workflows.analytics.getActivityTrend(days);
    res.json(trend);
  }));

  router.get("/analytics/users", asyncHandler(async (req, res) => {
    const routeLog = getRouteLogger(req, { route: "analytics-users" });
    const auth = await requireAuthenticatedUser({ req, db, routeLog });

    if (auth.user.role !== "admin") {
      const error = new Error("Admin access required");
      error.name = "ForbiddenError";
      throw error;
    }

    const analytics = await db.workflows.analytics.getUserAnalytics();
    res.json(analytics);
  }));

  return router;
}

module.exports = {
  createAnalyticsRoute
};