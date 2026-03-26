const express = require("express");
const { asyncHandler } = require("../middleware/async-handler");
const { createLogger } = require("../../logging");
const { requireAuthenticatedUser } = require("./utils/auth");

const logger = createLogger("routes.api.users");

function getRouteLogger(req, extra = {}) {
  return req?.log?.scope ? req.log.scope("routes.api.users", extra) : logger.child(extra);
}

function createUsersRoute({ db }) {
  const router = express.Router();

  const meHandler = async (req, res) => {
    const routeLog = getRouteLogger(req, { route: "me" });
    routeLog.info("request.start", {
      method: req.method,
      path: req.originalUrl || req.url
    });

    const auth = await requireAuthenticatedUser({ req, db, routeLog });
    const user = auth.user;

    routeLog.info("request.success", {
      userId: user.id,
      role: user.role
    });

    res.json({
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role
    });
  };

  router.get("/users/me", asyncHandler(meHandler));
  router.get("/me", asyncHandler(meHandler));

  return router;
}

module.exports = {
  createUsersRoute
};
