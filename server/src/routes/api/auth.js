const express = require("express");
const { asyncHandler } = require("../middleware/async-handler");
const { createLogger } = require("../../logging");
const { requireJson } = require("./utils/http");
const { hashPassword, randomHex64, signJwt, verifyPassword } = require("./utils/security");
const { requireJwtSecret, resolveUserRole } = require("./utils/auth");

const logger = createLogger("routes.api.auth");

function getRouteLogger(req, extra = {}) {
  return req?.log?.scope ? req.log.scope("routes.api.auth", extra) : logger.child(extra);
}

function createAuthRoute({ db }) {
  const router = express.Router();

  const registerHandler = async (req, res) => {
    const routeLog = getRouteLogger(req, { route: "register" });
    routeLog.info("request.start", {
      method: req.method,
      path: req.originalUrl || req.url,
      usernamePresent: Boolean(req.body?.username),
      emailPresent: Boolean(req.body?.email)
    });

    requireJson(req);

    const username = String(req.body.username || "").trim();
    const email = String(req.body.email || "").trim();
    const password = String(req.body.password || "");

    if (!username) {
      routeLog.warn("validation.failed", { reason: "missing-username" });
      res.status(400).json({ error: "Username is required" });
      return;
    }
    if (!password) {
      routeLog.warn("validation.failed", { reason: "missing-password" });
      res.status(400).json({ error: "Password is required" });
      return;
    }
    if (password.length < 8) {
      routeLog.warn("validation.failed", { reason: "password-too-short", length: password.length });
      res.status(400).json({ error: "Password must be at least 8 characters" });
      return;
    }

    const jwtSecret = requireJwtSecret();

    routeLog.info("registration.attempt", {
      username,
      emailPresent: Boolean(email)
    });

    const passwordHash = await hashPassword(password);
    const refreshToken = randomHex64();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const user = await db.transaction(async (tx) => {
      routeLog.debug("registration.check-uniqueness.start", {
        username,
        emailPresent: Boolean(email)
      });
      const usernameExists = await db.users.existsByUsername(username, tx);

      if (usernameExists) {
        routeLog.warn("registration.conflict", { reason: "username-exists", username });
        const conflict = new Error("Username already exists");
        conflict.name = "ConflictError";
        throw conflict;
      }

      if (email) {
        const emailExists = await db.users.existsByEmail(email, tx);
        if (emailExists) {
          routeLog.warn("registration.conflict", { reason: "email-exists", emailPresent: true });
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

    const role = await resolveUserRole(db, user.id);

    routeLog.info("registration.success", {
      userId: user.id,
      role
    });

    res.status(201).json({
      message: "Account created successfully",
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role
      },
      accessToken,
      refreshToken
    });
  };

  const loginHandler = async (req, res) => {
    const routeLog = getRouteLogger(req, { route: "login" });
    routeLog.info("request.start", {
      method: req.method,
      path: req.originalUrl || req.url,
      usernameOrEmailPresent: Boolean(req.body?.usernameOrEmail)
    });

    requireJson(req);

    const usernameOrEmail = String(req.body.usernameOrEmail || "").trim();
    const password = String(req.body.password || "");

    if (!usernameOrEmail || !password) {
      routeLog.warn("validation.failed", { reason: "missing-credentials" });
      res.status(400).json({ error: "Missing credentials" });
      return;
    }

    const jwtSecret = requireJwtSecret();

    routeLog.info("login.lookup", {
      authType: usernameOrEmail.includes("@") ? "email" : "username"
    });

    const user = usernameOrEmail.includes("@")
      ? await db.users.getByEmail(usernameOrEmail)
      : await db.users.getByUsername(usernameOrEmail);

    if (!user) {
      routeLog.warn("login.denied", { reason: "user-not-found" });
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    const passwordHash = await db.userPasswords.getHashByUserId(user.id);
    const passwordMatches = await verifyPassword(password, passwordHash);
    if (!passwordMatches) {
      routeLog.warn("login.denied", { reason: "password-mismatch", userId: user.id });
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

    const role = await resolveUserRole(db, user.id);

    routeLog.info("login.success", {
      userId: user.id,
      role
    });

    res.json({
      message: "Login successful",
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role
      },
      accessToken,
      refreshToken
    });
  };

  const logoutHandler = async (req, res) => {
    const routeLog = getRouteLogger(req, { route: "logout" });
    routeLog.info("request.start", {
      method: req.method,
      path: req.originalUrl || req.url
    });

    requireJson(req);

    const refreshToken = String(req.body.refreshToken || "").trim();
    if (!refreshToken) {
      routeLog.warn("validation.failed", { reason: "missing-refresh-token" });
      res.status(400).json({ error: "Refresh token is required" });
      return;
    }

    routeLog.info("logout.attempt");
    await db.userSessions.deleteByToken(refreshToken);

    routeLog.info("logout.success");
    res.json({
      message: "Logout successful"
    });
  };

  router.post("/auth/register", asyncHandler(registerHandler));
  router.post("/register", asyncHandler(registerHandler));

  router.post("/auth/login", asyncHandler(loginHandler));
  router.post("/login", asyncHandler(loginHandler));

  router.post("/auth/logout", asyncHandler(logoutHandler));
  router.post("/logout", asyncHandler(logoutHandler));

  return router;
}

module.exports = {
  createAuthRoute
};
