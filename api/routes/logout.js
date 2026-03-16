const express = require("express");
const db = require("../db");

const router = express.Router();

router.post("/logout", async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(400).json({ error: "Refresh token required" });
  }

  try {
    await db.query(
      `DELETE FROM user_sessions WHERE session_token = ?`,
      [refreshToken]
    );

    return res.json({ message: "Logged out successfully" });
  } catch (error) {
    console.error("Logout error:", error);
    return res.status(500).json({ error: "Server error during logout" });
  }
});

module.exports = router;