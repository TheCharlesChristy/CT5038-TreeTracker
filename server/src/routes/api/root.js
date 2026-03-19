const express = require("express");

function createApiRootRoute() {
  const router = express.Router();

  router.get("/", (_req, res) => {
    res.json({
      message: "Tree API working",
      version: "v1"
    });
  });

  return router;
}

module.exports = {
  createApiRootRoute
};
