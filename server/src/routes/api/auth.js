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

function createAuthRoute({ db, frontendUrl }) {
  const router = express.Router();
  
  function getFrontendUrl() {           
    if (!frontendUrl) throw new Error("FRONTEND_URL not configured");
    return frontendUrl.replace(/\/+$/, "");
  }
  
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
    const emailConsent = Boolean(req.body.emailConsent);

    routeLog.info("register.attempt", { username, email });

    if (!username) {
      routeLog.warn("register.missing_username");
      return res.status(400).json({ error: "Username is required" });
    }

    if (!password) {
      routeLog.warn("register.missing_password");
      return res.status(400).json({ error: "Password is required" });
    }

    if (password.length < 8) {
      routeLog.warn("register.weak_password");
      return res.status(400).json({ error: "Password must be at least 8 characters" });
    }

    const jwtSecret = requireJwtSecret();

    try {
      const passwordHash = await hashPassword(password);
      const refreshToken = randomHex64();
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      const user = await db.transaction(async (tx) => {
        const usernameExists = await db.users.existsByUsername(username, tx);
        if (usernameExists) {
          routeLog.warn("register.username_exists", { username });
          throw new Error("Username already exists");
        }

        if (email) {
          const emailExists = await db.users.existsByEmail(email, tx);
          if (emailExists) {
            routeLog.warn("register.email_exists", { email });
            throw new Error("Email already exists");
          }
        }

        const createdUser = await db.users.create({ username, email: email || null, emailConsent }, tx);
        await db.userPasswords.setForUser(createdUser.id, passwordHash, tx);
        await db.userSessions.create({
          userId: createdUser.id,
          sessionToken: refreshToken,
          expiresAt
        }, tx);

        return createdUser;
      });

      if (user.email) {
        const verificationToken = signActionToken(
          { userId: user.id, purpose: "verify-email" },
          "1h"
        );

        const verifyUrl = `${getFrontendUrl()}/verify-email?token=${verificationToken}`;

        try {
          await sendEmail({
            to: user.email,
            subject: "Verify your email",
            html: `<h2>Welcome to TreeGuardians!</h2>
                   <p>Please verify your email:</p>
                   <a href="${verifyUrl}">Verify Email</a>`
          });
        } catch (emailError) {
          routeLog.warn("register.email_send_failed", {
            userId: user.id,
            error: emailError.message
          });
        }
      }

      const accessToken = signJwt(
        { userId: user.id, username: user.username },
        jwtSecret,
        15 * 60
      );

      const role = await resolveUserRole(db, user.id);

      routeLog.info("register.success", { userId: user.id });

      res.status(201).json({
        message: "Account created successfully",
        user: { id: user.id, username: user.username, email: user.email, role },
        accessToken,
        refreshToken
      });

    } catch (err) {
      routeLog.error("register.failed", { error: err.message });
      res.status(400).json({ error: err.message });
    }
  };

  const loginHandler = async (req, res) => {
    const routeLog = getRouteLogger(req, { route: "login" });
    requireJson(req);

    const usernameOrEmail = String(req.body.usernameOrEmail || "").trim();
    const password = String(req.body.password || "");

    routeLog.info("login.attempt", { usernameOrEmail });

    if (!usernameOrEmail || !password) {
      routeLog.warn("login.missing_credentials");
      return res.status(400).json({ error: "Missing credentials" });
    }

    const jwtSecret = requireJwtSecret();

    const user = usernameOrEmail.includes("@")
      ? await db.users.getByEmail(usernameOrEmail)
      : await db.users.getByUsername(usernameOrEmail);

    if (!user) {
      routeLog.warn("login.user_not_found", { usernameOrEmail });
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const passwordHash = await db.userPasswords.getHashByUserId(user.id);
    const passwordMatches = await verifyPassword(password, passwordHash);

    if (!passwordMatches) {
      routeLog.warn("login.invalid_password", { userId: user.id });
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
    routeLog.info("login.success", { userId: user.id });

    res.json({
      message: "Login successful",
      user: { id: user.id, username: user.username, email: user.email, role },
      accessToken,
      refreshToken
    });
  };

  const verifyEmailHandler = async (req, res) => {
    const routeLog = getRouteLogger(req, { route: "verify-email" });
    const token = String(req.query.token || "");

    try {
      const decoded = verifyActionToken(token);

      if (decoded.purpose !== "verify-email") {
        routeLog.warn("verify.invalid_purpose");
        return res.status(400).json({ error: "Invalid token" });
      }

      routeLog.info("verify.success", { userId: decoded.userId });
      res.json({ message: "Email verified successfully" });

    } catch (err) {
      routeLog.warn("verify.failed", { error: err.message });
      res.status(400).json({ error: "Invalid or expired token" });
    }
  };

  const forgotPasswordHandler = async (req, res) => {
    const routeLog = getRouteLogger(req, { route: "forgot-password" });

    try {
      requireJson(req);

      const email = String(req.body.email || "").trim();
      if (!email) {
        routeLog.warn("forgot.missing_email");
        return res.status(400).json({ error: "Email required" });
      }

      const user = await db.users.getByEmail(email);

      if (!user) {
        routeLog.info("forgot.user_not_found", { email });
        return res.json({ message: "If account exists, email sent" });
      }

      const resetToken = signActionToken(
        { userId: user.id, purpose: "reset-password" },
        "30m"
      );

      const resetUrl = `${getFrontendUrl()}/reset-password?token=${resetToken}`;

      await sendEmail({
        to: email,
        subject: "Reset your password",
        html: `<h3>Reset your password</h3>
               <a href="${resetUrl}">Reset Password</a>`
      });

      routeLog.info("forgot.email_sent", { userId: user.id });

      res.json({ message: "Reset link sent" });

    } catch (err) {
      routeLog.error("forgot.failed", { error: err.message });
      res.status(500).json({ error: "Internal server error" });
    }
  };

  const resetPasswordHandler = async (req, res) => {
    const routeLog = getRouteLogger(req, { route: "reset-password" });
    requireJson(req);

    const token = String(req.body.token || "");
    const newPassword = String(req.body.password || "");

    if (!token || !newPassword) {
      routeLog.warn("reset.missing_fields");
      return res.status(400).json({ error: "Missing fields" });
    }

    try {
      const decoded = verifyActionToken(token);

      if (decoded.purpose !== "reset-password") {
        routeLog.warn("reset.invalid_purpose");
        return res.status(400).json({ error: "Invalid token" });
      }

      const passwordHash = await hashPassword(newPassword);
      await db.userPasswords.setForUser(decoded.userId, passwordHash);

      routeLog.info("reset.success", { userId: decoded.userId });
      res.json({ message: "Password reset successful" });

    } catch (err) {
      routeLog.warn("reset.failed", { error: err.message });
      res.status(400).json({ error: "Invalid or expired token" });
    }
  };

  const logoutHandler = async (req, res) => {
    const routeLog = getRouteLogger(req, { route: "logout" });

    requireJson(req);
    
    const refreshToken = String(req.body.refreshToken || "").trim();

    if (!refreshToken) {
      routeLog.warn("logout.missing_token");
      return res.status(400).json({ error: "Refresh token is required" });
    }

    await db.userSessions.deleteByToken(refreshToken);

    routeLog.info("logout.success");

    res.json({ message: "Logout successful" });
  };

  router.post("/auth/register", asyncHandler(registerHandler));
  router.post("/auth/login", asyncHandler(loginHandler));
  router.post("/auth/logout", asyncHandler(logoutHandler));

  router.post("/register", asyncHandler(registerHandler));
  router.post("/login", asyncHandler(loginHandler));
  router.post("/logout", asyncHandler(logoutHandler));

  router.get("/auth/verify-email", asyncHandler(verifyEmailHandler));
  router.post("/auth/forgot-password", asyncHandler(forgotPasswordHandler));
  router.post("/auth/reset-password", asyncHandler(resetPasswordHandler));

  return router;
}

module.exports = {
  createAuthRoute
};