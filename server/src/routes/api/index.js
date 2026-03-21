const express = require("express");
const { createApiRootRoute } = require("./root");
const { createTreesRoute } = require("./trees");
const { createAuthRoute } = require("./auth");
const { createUsersRoute } = require("./users");
const { createUploadsRoute } = require("./uploads");

function createApiRouter(deps) {
  const router = express.Router();

  router.use(createApiRootRoute(deps));
  router.use(createTreesRoute(deps));
  router.use(createAuthRoute(deps));
  router.use(createUsersRoute(deps));
  router.use(createUploadsRoute(deps));

  return router;
}

module.exports = {
  createApiRouter
};
