const express = require("express");
const { asyncHandler } = require("../middleware/async-handler");
const { parseBearerToken, verifyJwt } = require("./utils/security");

function createUsersRoute({ db }) {
  const router = express.Router();

  const meHandler = async (req, res) => {
    const token = parseBearerToken(req);
    if (!token) {
      const error = new Error("Missing bearer token");
      error.name = "AuthError";
      throw error;
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error("Missing required env var JWT_SECRET");
    }

    let tokenPayload;
    try {
      tokenPayload = verifyJwt(token, jwtSecret);
    } catch {
      const error = new Error("Invalid token");
      error.name = "AuthError";
      throw error;
    }

    const user = await db.users.getById(Number(tokenPayload.userId));
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    res.json({
      id: user.id,
      username: user.username,
      email: user.email
    });
  };

  router.get("/users/me", asyncHandler(meHandler));
  router.get("/me", asyncHandler(meHandler));

  return router;
}

module.exports = {
  createUsersRoute
};
