const express = require("express");
const { createLogger } = require("../../logging");

const logger = createLogger("routes.api.root");

function createApiRootRoute() {
  const router = express.Router();

  router.get("/", (req, res) => {
    const routeLog = req?.log?.scope
      ? req.log.scope("routes.api.root", { route: "root" })
      : logger.child({ route: "root" });
    routeLog.info("request.start", {
      method: req.method,
      path: req.originalUrl || req.url
    });
    res.json({
      message: "Tree API working",
      version: "v1"
    });
    routeLog.info("request.success");
  });

  return router;
}

module.exports = {
  createApiRootRoute
};
