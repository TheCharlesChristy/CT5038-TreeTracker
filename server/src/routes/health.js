const express = require("express");
const { asyncHandler } = require("./middleware/async-handler");
const { createLogger } = require("../logging");

const logger = createLogger("routes.health");

function getRouteLogger(req, extra = {}) {
  return req?.log?.scope ? req.log.scope("routes.health", extra) : logger.child(extra);
}

function createHealthRouter({ db }) {
  const router = express.Router();

  router.get("/health", (req, res) => {
    const routeLog = getRouteLogger(req, { route: "health" });
    routeLog.info("request.start", {
      method: req.method,
      path: req.originalUrl || req.url
    });
    res.json({ status: "ok" });
    routeLog.info("request.success", { status: "ok" });
  });

  router.get(
    "/db/health",
    asyncHandler(async (req, res) => {
      const routeLog = getRouteLogger(req, { route: "db-health" });
      routeLog.info("request.start", {
        method: req.method,
        path: req.originalUrl || req.url
      });

      const health = await db.health();
      routeLog.info("request.result", {
        ready: health.ready,
        status: health.ready ? 200 : 503
      });
      res.status(health.ready ? 200 : 503).json(health);
    })
  );

  return router;
}

module.exports = {
  createHealthRouter
};
