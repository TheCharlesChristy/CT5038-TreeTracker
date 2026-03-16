const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const db = require("../db");

const router = express.Router();

function determineRole(user) {
  if (user.is_admin) return "admin";
  if (user.is_guardian) return "guardian";
  return "registered_user";
}

router.post("/login", async (req, res) => {
  const { usernameOrEmail, password } = req.body;

  if (!usernameOrEmail?.trim() || !password) {
    return res.status(400).json({ error: "Missing credentials" });
  }

  try {
    const [rows] = await db.query(
      `SELECT 
         u.id,
         u.username,
         u.email,
         up.password_hash,
         CASE WHEN a.user_id IS NOT NULL THEN 1 ELSE 0 END AS is_admin,
         CASE WHEN g.user_id IS NOT NULL THEN 1 ELSE 0 END AS is_guardian
       FROM users u
       JOIN user_passwords up ON up.user_id = u.id
       LEFT JOIN admins a ON a.user_id = u.id
       LEFT JOIN guardians g ON g.user_id = u.id
       WHERE u.username = ? OR u.email = ?
       LIMIT 1`,
      [usernameOrEmail, usernameOrEmail]
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const user = rows[0];

    const passwordMatches = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatches) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const role = determineRole(user);

    const accessToken = jwt.sign(
      {
        userId: user.id,
        username: user.username,
        role,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "15m",
        algorithm: "HS256",
      }
    );

    const refreshToken = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7);

    await db.query(
      `INSERT INTO user_sessions (user_id, session_token, expires_at)
       VALUES (?, ?, ?)`,
      [user.id, refreshToken, expiresAt]
    );

    return res.json({
      message: "Login successful",
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role,
      },
      accessToken,
      refreshToken,
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ error: "Server error during login" });
  }
});

module.exports = router;