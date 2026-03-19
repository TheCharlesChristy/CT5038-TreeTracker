const express = require("express");
const { asyncHandler } = require("../middleware/async-handler");
const { requireJson } = require("./utils/http");
const { hashPassword, randomHex64, signJwt, verifyPassword } = require("./utils/security");

function createAuthRoute({ db }) {
  const router = express.Router();

  const registerHandler = async (req, res) => {
    requireJson(req);

    const username = String(req.body.username || "").trim();
    const email = String(req.body.email || "").trim();
    const password = String(req.body.password || "");

    if (!username) {
      res.status(400).json({ error: "Username is required" });
      return;
    }
    if (!password) {
      res.status(400).json({ error: "Password is required" });
      return;
    }
    if (password.length < 8) {
      res.status(400).json({ error: "Password must be at least 8 characters" });
      return;
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error("Missing required env var JWT_SECRET");
    }

    const passwordHash = await hashPassword(password);
    const refreshToken = randomHex64();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const user = await db.transaction(async (tx) => {
      const usernameExists = await db.users.existsByUsername(username, tx);

      if (usernameExists) {
        const conflict = new Error("Username already exists");
        conflict.name = "ConflictError";
        throw conflict;
      }

      if (email) {
        const emailExists = await db.users.existsByEmail(email, tx);
        if (emailExists) {
          const conflict = new Error("Email already exists");
          conflict.name = "ConflictError";
          throw conflict;
        }
      }

      const createdUser = await db.users.create({ username, email: email || null }, tx);
      await db.userPasswords.setForUser(createdUser.id, passwordHash, tx);
      await db.userSessions.create(
        {
          userId: createdUser.id,
          sessionToken: refreshToken,
          expiresAt
        },
        tx
      );

      return createdUser;
    });

    const accessToken = signJwt(
      {
        userId: user.id,
        username: user.username
      },
      jwtSecret,
      15 * 60
    );

    res.status(201).json({
      message: "Account created successfully",
      user: {
        id: user.id,
        username: user.username,
        email: user.email
      },
      accessToken,
      refreshToken
    });
  };

  const loginHandler = async (req, res) => {
    requireJson(req);

    const usernameOrEmail = String(req.body.usernameOrEmail || "").trim();
    const password = String(req.body.password || "");

    if (!usernameOrEmail || !password) {
      res.status(400).json({ error: "Missing credentials" });
      return;
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error("Missing required env var JWT_SECRET");
    }

    const user = usernameOrEmail.includes("@")
      ? await db.users.getByEmail(usernameOrEmail)
      : await db.users.getByUsername(usernameOrEmail);

    if (!user) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    const passwordHash = await db.userPasswords.getHashByUserId(user.id);
    const passwordMatches = await verifyPassword(password, passwordHash);
    if (!passwordMatches) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    const refreshToken = randomHex64();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await db.userSessions.create({ userId: user.id, sessionToken: refreshToken, expiresAt });

    const accessToken = signJwt(
      {
        userId: user.id,
        username: user.username
      },
      jwtSecret,
      15 * 60
    );

    res.json({
      message: "Login successful",
      user: {
        id: user.id,
        username: user.username,
        email: user.email
      },
      accessToken,
      refreshToken
    });
  };

  router.post("/auth/register", asyncHandler(registerHandler));
  router.post("/register", asyncHandler(registerHandler));

  router.post("/auth/login", asyncHandler(loginHandler));
  router.post("/login", asyncHandler(loginHandler));

  return router;
}

module.exports = {
  createAuthRoute
};
