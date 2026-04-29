const express = require("express");
const { createApiRootRoute } = require("./root");
const { createTreesRoute } = require("./trees");
const { createAuthRoute } = require("./auth");
const { createUsersRoute } = require("./users");
const { createUploadsRoute } = require("./uploads");
const { createAccountRoute } = require("./account");
const { createAnalyticsRoute } = require("./analytics");
const { createOtmRoute } = require("./otm");

function createApiRouter(deps) {
  const router = express.Router();

  router.use(createApiRootRoute(deps));
  router.use(createTreesRoute(deps));
  router.use(createAuthRoute(deps));
  router.use(createUsersRoute(deps));
  router.use(createUploadsRoute(deps));
  router.use(createAccountRoute(deps));
  router.use(createAnalyticsRoute(deps));
  router.use(createOtmRoute(deps));

  return router;
}

module.exports = {
  createApiRouter
};
