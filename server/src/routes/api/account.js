const express = require("express");
const { asyncHandler } = require("../middleware/async-handler");
const { createLogger } = require("../../logging");
const { requireJson } = require("./utils/http");
const { requireAuthenticatedUser, resolveUserRole } = require("./utils/auth");
const { hashPassword, verifyPassword } = require("./utils/security");
const { sendEmail } = require("./utils/email");

const logger = createLogger("routes.api.account");

function getRouteLogger(req, extra = {}) {
  return req?.log?.scope ? req.log.scope("routes.api.account", extra) : logger.child(extra);
}

function createAccountRoute({ db, frontendUrl }) {
  const router = express.Router();

  function getFrontendUrl() {
    if (!frontendUrl) throw new Error("FRONTEND_URL not configured");
    return frontendUrl.replace(/\/+$/, "");
  }

  async function buildSafeUserResponse(userId, tx) {
    const user = await db.users.getById(userId, tx);
    const role = await resolveUserRole(db, userId, tx);

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      role,
      verified: !!user.verified_at,
    };
  }

  const updateUsernameHandler = async (req, res) => {
    const routeLog = getRouteLogger(req, { route: "update-username" });
    routeLog.info("request.start", {
      method: req.method,
      path: req.originalUrl || req.url,
    });

    requireJson(req);

    const auth = await requireAuthenticatedUser({ req, db, routeLog });
    const userId = auth.user.id;
    const username = String(req.body.username || "").trim();

    if (!username) {
      routeLog.warn("validation.failed", { reason: "missing-username" });
      res.status(400).json({ error: "Username is required" });
      return;
    }

    if (username.length < 3) {
      routeLog.warn("validation.failed", { reason: "username-too-short", length: username.length });
      res.status(400).json({ error: "Username must be at least 3 characters long" });
      return;
    }

    const existingUser = await db.users.getByUsername(username);
    if (existingUser && existingUser.id !== userId) {
      routeLog.warn("update.conflict", { reason: "username-exists", userId });
      res.status(409).json({ error: "Username already exists" });
      return;
    }

    const updatedUser = await db.transaction(async (tx) => {
      await db.users.updateById(userId, { username }, tx);
      return buildSafeUserResponse(userId, tx);
    });

    routeLog.info("request.success", { userId });

    res.json({
      message: "Username updated successfully",
      user: updatedUser,
    });
  };

  const updateEmailHandler = async (req, res) => {
    const routeLog = getRouteLogger(req, { route: "update-email" });
    routeLog.info("request.start", {
      method: req.method,
      path: req.originalUrl || req.url,
    });

    requireJson(req);

    const auth = await requireAuthenticatedUser({ req, db, routeLog });
    const userId = auth.user.id;
    const email = String(req.body.email || "").trim();

    if (!email) {
      routeLog.warn("validation.failed", { reason: "missing-email" });
      return res.status(400).json({ error: "Email is required" });
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email)) {
      routeLog.warn("validation.failed", { reason: "invalid-email-format" });
      return res.status(400).json({ error: "Valid email is required" });
    }

    const existingUser = await db.users.getByEmail(email);
    if (existingUser && existingUser.id !== userId) {
      routeLog.warn("update.conflict", { reason: "email-exists", userId });
      return res.status(409).json({ error: "Email already exists" });
    }

    let verificationToken = null;

    const updatedUser = await db.transaction(async (tx) => {
      await db.users.updateById(userId, { email }, tx);

      await db.users.clearVerifiedAt(userId, tx);

      await db.emailVerificationTokens.deleteByUserId(userId, tx);
      verificationToken = await db.emailVerificationTokens.create(userId, tx);

      return buildSafeUserResponse(userId, tx);
    });

    // Send verification email to the new address
    if (verificationToken) {
      const verifyUrl = `${getFrontendUrl()}/verify-email?token=${verificationToken}`;

      try {
        await sendEmail({
          to: email,
          subject: "Verify your new email – TreeGuardians",
          html: `<h2>Email Address Changed</h2>
                <p>Your email address has been updated. Please verify your new address:</p>
                <a href="${verifyUrl}">Verify Email</a>
                <p>This link expires in 1 hour.</p>
                <p>If you did not make this change, please contact support immediately.</p>`
        });
      } catch (emailError) {
        routeLog.warn("email.send_failed", {
          userId,
          error: emailError.message
        });
      }
    }

    routeLog.info("request.success", { userId });

    res.json({
      message: "Email updated successfully. Please check your inbox to verify your new address.",
      user: updatedUser,
    });
  };

  const updatePasswordHandler = async (req, res) => {
    const routeLog = getRouteLogger(req, { route: "update-password" });
    routeLog.info("request.start", {
      method: req.method,
      path: req.originalUrl || req.url,
    });

    requireJson(req);

    const auth = await requireAuthenticatedUser({ req, db, routeLog });
    const userId = auth.user.id;

    const currentPassword = String(req.body.currentPassword || "");
    const newPassword = String(req.body.newPassword || "");

    if (!currentPassword) {
      routeLog.warn("validation.failed", { reason: "missing-current-password", userId });
      res.status(400).json({ error: "Current password is required" });
      return;
    }

    if (!newPassword) {
      routeLog.warn("validation.failed", { reason: "missing-new-password", userId });
      res.status(400).json({ error: "New password is required" });
      return;
    }

    if (newPassword.length < 8) {
      routeLog.warn("validation.failed", { reason: "new-password-too-short", userId, length: newPassword.length });
      res.status(400).json({ error: "New password must be at least 8 characters long" });
      return;
    }

    if (currentPassword === newPassword) {
      routeLog.warn("validation.failed", { reason: "same-password", userId });
      res.status(400).json({ error: "New password must be different from your current password" });
      return;
    }

    const existingHash = await db.userPasswords.getHashByUserId(userId);
    if (!existingHash) {
      routeLog.warn("password.missing", { userId });
      res.status(404).json({ error: "Password record not found" });
      return;
    }

    const passwordMatches = await verifyPassword(currentPassword, existingHash);
    if (!passwordMatches) {
      routeLog.warn("validation.failed", { reason: "incorrect-current-password", userId });
      res.status(401).json({ error: "Current password is incorrect" });
      return;
    }

    const newHash = await hashPassword(newPassword);

    await db.transaction(async (tx) => {
      await db.userPasswords.setForUser(userId, newHash, tx);
    });

    routeLog.info("request.success", { userId });

    res.json({
      message: "Password updated successfully",
    });
  };

  router.put("/account/username", asyncHandler(updateUsernameHandler));
  router.put("/account/email", asyncHandler(updateEmailHandler));
  router.put("/account/password", asyncHandler(updatePasswordHandler));

  return router;
}

module.exports = {
  createAccountRoute,
};