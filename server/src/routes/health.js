const express = require("express");
const { asyncHandler } = require("./middleware/async-handler");

function createHealthRouter({ db }) {
  const router = express.Router();

  router.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  router.get(
    "/db/health",
    asyncHandler(async (_req, res) => {
      const health = await db.health();
      res.status(health.ready ? 200 : 503).json(health);
    })
  );

  return router;
}

module.exports = {
  createHealthRouter
};
