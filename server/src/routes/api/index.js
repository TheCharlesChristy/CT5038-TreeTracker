const express = require("express");
const { createApiRootRoute } = require("./root");
const { createTreesRoute } = require("./trees");
const { createAuthRoute } = require("./auth");
const { createUsersRoute } = require("./users");
const { createUploadsRoute } = require("./uploads");
const { createAccountRoute } = require("./account");
const { createAnalyticsRoute } = require("./analytics");

function createApiRouter(deps) {
  const router = express.Router();

  router.use(createApiRootRoute(deps));
  // Multipart /trees/:treeId/photos and /comment-photos must resolve reliably; mount uploads
  // before trees so those POST routes are hit first (avoids 404 if trees router stack differs).
  router.use(createUploadsRoute(deps));
  router.use(createTreesRoute(deps));
  router.use(createAuthRoute(deps));
  router.use(createUsersRoute(deps));
  router.use(createAccountRoute(deps));
  router.use(createAnalyticsRoute(deps));

  return router;
}

module.exports = {
  createApiRouter
};
