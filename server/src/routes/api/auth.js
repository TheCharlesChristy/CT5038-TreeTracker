const express = require("express");
const jwt = require("jsonwebtoken");
const { asyncHandler } = require("../middleware/async-handler");
const { createLogger } = require("../../logging");
const { requireJson } = require("./utils/http");
const { hashPassword, randomHex64, signJwt, verifyPassword } = require("./utils/security");
const { requireJwtSecret, resolveUserRole } = require("./utils/auth");
const { sendEmail } = require("./utils/email");

const logger = createLogger("routes.api.auth");

function getRouteLogger(req, extra = {}) {
  return req?.log?.scope ? req.log.scope("routes.api.auth", extra) : logger.child(extra);
}

function createAuthRoute({ db }) {
  const router = express.Router();

  // JWT helpers for actions
  function signActionToken(payload, expiresIn) {
    return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn });
  }

  function verifyActionToken(token) {
    return jwt.verify(token, process.env.JWT_SECRET);
  }

  const registerHandler = async (req, res) => {
    const routeLog = getRouteLogger(req, { route: "register" });

    requireJson(req);

    const username = String(req.body.username || "").trim();
    const email = String(req.body.email || "").trim();
    const password = String(req.body.password || "");

    if (!username) return res.status(400).json({ error: "Username is required" });
    if (!password) return res.status(400).json({ error: "Password is required" });
    if (password.length < 8) {
      return res.status(400).json({ error: "Password must be at least 8 characters" });
    }

    const jwtSecret = requireJwtSecret();

    const passwordHash = await hashPassword(password);
    const refreshToken = randomHex64();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const user = await db.transaction(async (tx) => {
      const usernameExists = await db.users.existsByUsername(username, tx);
      if (usernameExists) throw new Error("Username already exists");

      if (email) {
        const emailExists = await db.users.existsByEmail(email, tx);
        if (emailExists) throw new Error("Email already exists");
      }

      const createdUser = await db.users.create({ username, email: email || null }, tx);
      await db.userPasswords.setForUser(createdUser.id, passwordHash, tx);
      await db.userSessions.create({ userId: createdUser.id, sessionToken: refreshToken, expiresAt }, tx);

      return createdUser;
    });

    if (user.email && user.email.trim().length > 0) {
      const verificationToken = signActionToken(
        { userId: user.id, purpose: "verify-email" },
        "1h"
      );

      const verifyUrl = `https://s4316157-ctxxxx.uogs.co.uk/verify-email?token=${verificationToken}`;

      await sendEmail({
        to: user.email,
        subject: "Verify your email",
        html: `
          <h2>Welcome to TreeGuardians!</h2>
          <p>Please verify your email with this link:</p>
          <a href="${verifyUrl}">Verify Email</a>
        `
      });
    }

    const accessToken = signJwt(
      { userId: user.id, username: user.username },
      jwtSecret,
      15 * 60
    );

    const role = await resolveUserRole(db, user.id);

    res.status(201).json({
      message: "Account created successfully",
      user: { id: user.id, username: user.username, email: user.email, role },
      accessToken,
      refreshToken
    });
  };

  const loginHandler = async (req, res) => {
    requireJson(req);

    const usernameOrEmail = String(req.body.usernameOrEmail || "").trim();
    const password = String(req.body.password || "");

    if (!usernameOrEmail || !password) {
      return res.status(400).json({ error: "Missing credentials" });
    }

    const jwtSecret = requireJwtSecret();

    const user = usernameOrEmail.includes("@")
      ? await db.users.getByEmail(usernameOrEmail)
      : await db.users.getByUsername(usernameOrEmail);

    if (!user) return res.status(401).json({ error: "Invalid credentials" });

    const passwordHash = await db.userPasswords.getHashByUserId(user.id);
    const passwordMatches = await verifyPassword(password, passwordHash);

    if (!passwordMatches) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const refreshToken = randomHex64();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await db.userSessions.create({ userId: user.id, sessionToken: refreshToken, expiresAt });

    const accessToken = signJwt(
      { userId: user.id, username: user.username },
      jwtSecret,
      15 * 60
    );

    const role = await resolveUserRole(db, user.id);

    res.json({
      message: "Login successful",
      user: { id: user.id, username: user.username, email: user.email, role },
      accessToken,
      refreshToken
    });
  };

  // verify email
  const verifyEmailHandler = async (req, res) => {
    const token = String(req.query.token || "");

    try {
      const decoded = verifyActionToken(token);

      if (decoded.purpose !== "verify-email") {
        return res.status(400).json({ error: "Invalid token" });
      }

      res.json({ message: "Email verified successfully" });

    } catch (err) {
      res.status(400).json({ error: "Invalid or expired token" });
    }
  };

  // forgot password
  const forgotPasswordHandler = async (req, res) => {
    try {
      requireJson(req);

      const email = String(req.body.email || "").trim();
      if (!email) return res.status(400).json({ error: "Email required" });

      const user = await db.users.getByEmail(email);

      if (!user) {
        return res.json({ message: "If account exists, email sent" });
      }

      const resetToken = signActionToken(
        { userId: user.id, purpose: "reset-password" },
        "30m"
      );

      const resetUrl = `https://s4316157-ctxxxx.uogs.co.uk/reset-password?token=${resetToken}`;

      await sendEmail({
        to: email,
        subject: "Reset your password",
        html: `
        <h3>Resetting your password</h3>
        <p>Please reset your password by following this link:</p>
        <a href="${resetUrl}">Reset Password</a>
        `
      });

      res.json({ message: "Reset link sent" });

    } catch (err) {
      // returning the error to the frontend
      res.status(500).json({
        error: err.message,
        stack: err.stack
      });
    }
  };

  // reset password
  const resetPasswordHandler = async (req, res) => {
    requireJson(req);

    const token = String(req.body.token || "");
    const newPassword = String(req.body.password || "");

    if (!token || !newPassword) {
      return res.status(400).json({ error: "Missing fields" });
    }

    try {
      const decoded = verifyActionToken(token);

      if (decoded.purpose !== "reset-password") {
        return res.status(400).json({ error: "Invalid token" });
      }

      const passwordHash = await hashPassword(newPassword);
      await db.userPasswords.setForUser(decoded.userId, passwordHash);

      res.json({ message: "Password reset successful" });

    } catch (err) {
      res.status(400).json({ error: "Invalid or expired token" });
    }
  };

  const logoutHandler = async (req, res) => {
    requireJson(req);

    const refreshToken = String(req.body.refreshToken || "").trim();
    if (!refreshToken) {
      return res.status(400).json({ error: "Refresh token is required" });
    }

    await db.userSessions.deleteByToken(refreshToken);

    res.json({ message: "Logout successful" });
  };

  router.post("/auth/register", asyncHandler(registerHandler));
  router.post("/auth/login", asyncHandler(loginHandler));
  router.post("/auth/logout", asyncHandler(logoutHandler));

  router.get("/auth/verify-email", asyncHandler(verifyEmailHandler));
  router.post("/auth/forgot-password", asyncHandler(forgotPasswordHandler));
  router.post("/auth/reset-password", asyncHandler(resetPasswordHandler));

  return router;
}

module.exports = {
  createAuthRoute
};