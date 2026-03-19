const express = require("express");
const jwt = require("jsonwebtoken");
const db = require("../db");

const router = express.Router();

function determineRole(user) {
  if (user.is_admin) return "admin";
  if (user.is_guardian) return "guardian";
  return "registered_user";
}

router.post("/refresh", async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(401).json({ error: "Refresh token required" });
  }

  try {
    const [sessionRows] = await db.query(
      `SELECT user_id
       FROM user_sessions
       WHERE session_token = ? AND expires_at > NOW()
       LIMIT 1`,
      [refreshToken]
    );

    if (sessionRows.length === 0) {
      return res.status(403).json({ error: "Invalid or expired refresh token" });
    }

    const userId = sessionRows[0].user_id;

    const [userRows] = await db.query(
      `SELECT 
         u.id,
         u.username,
         u.email,
         CASE WHEN a.user_id IS NOT NULL THEN 1 ELSE 0 END AS is_admin,
         CASE WHEN g.user_id IS NOT NULL THEN 1 ELSE 0 END AS is_guardian
       FROM users u
       LEFT JOIN admins a ON a.user_id = u.id
       LEFT JOIN guardians g ON g.user_id = u.id
       WHERE u.id = ?
       LIMIT 1`,
      [userId]
    );

    if (userRows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const user = userRows[0];
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

    return res.json({
      accessToken,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role,
      },
    });
  } catch (error) {
    console.error("Refresh error:", error);
    return res.status(500).json({ error: "Server error during refresh" });
  }
});

module.exports = router;