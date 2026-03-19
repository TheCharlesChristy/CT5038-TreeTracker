const express = require("express");
const authenticateToken = require("../middleware/auth");
const db = require("../db");

const router = express.Router();

function determineRole(user) {
  if (user.is_admin) return "admin";
  if (user.is_guardian) return "guardian";
  return "registered_user";
}

router.get("/me", authenticateToken, async (req, res) => {
  try {
    const [rows] = await db.query(
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
      [req.user.userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const user = rows[0];
    const role = determineRole(user);

    return res.json({
      id: user.id,
      username: user.username,
      email: user.email,
      role,
    });
  } catch (error) {
    console.error("user-controller error:", error);
    return res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;