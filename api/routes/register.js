const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const db = require("../db");

const router = express.Router();

router.post("/register", async (req, res) => {
  const { username, email, password } = req.body;

  if (!username?.trim()) {
    return res.status(400).json({ error: "Username is required" });
  }

  if (!email?.trim()) {
    return res.status(400).json({ error: "Email is required" });
  }

  if (!password) {
    return res.status(400).json({ error: "Password is required" });
  }

  if (password.length < 8) {
    return res.status(400).json({ error: "Password must be at least 8 characters" });
  }

  let connection;
  try {
    connection = await db.getConnection();
    await connection.beginTransaction();

    // Check existing username or email
    const [existingUsers] = await connection.query(
      `SELECT id, username, email
       FROM users
       WHERE username = ? OR email = ?`,
      [username, email]
    );

    if (existingUsers.length > 0) {
      await connection.rollback();
      return res.status(409).json({
        error: "Username or email already exists",
      });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Create user
    const [userResult] = await connection.query(
      `INSERT INTO users (username, email)
       VALUES (?, ?)`,
      [username, email]
    );

    const userId = userResult.insertId;

    // Store password hash
    await connection.query(
      `INSERT INTO user_passwords (user_id, password_hash)
       VALUES (?, ?)`,
      [userId, passwordHash]
    );

    // Create short-lived access token
    const accessToken = jwt.sign(
      {
        userId,
        username,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "15m",
        algorithm: "HS256",
      }
    );

    // Create refresh/session token for DB storage
    const refreshToken = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7); // 7 days

    await connection.query(
      `INSERT INTO user_sessions (user_id, session_token, expires_at)
       VALUES (?, ?, ?)`,
      [userId, refreshToken, expiresAt]
    );

    await connection.commit();

    return res.status(201).json({
      message: "Account created successfully",
      user: {
        id: userId,
        username,
        email,
      },
      accessToken,
      refreshToken,
    });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error("Register error:", error);
    return res.status(500).json({ error: "Server error during registration" });
  } finally {
    if (connection) connection.release();
  }
});

module.exports = router;