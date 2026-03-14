const express = require("express");
const authenticateToken = require("../middleware/auth");
const db = require("../db");

const router = express.Router();

router.get("/me", authenticateToken, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT id, username, email
       FROM users
       WHERE id = ?`,
      [req.user.userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    return res.json(rows[0]);
  } catch (error) {
    console.error("user-controller error:", error);
    return res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;