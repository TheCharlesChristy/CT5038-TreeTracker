const express = require("express");
const jwt = require("jsonwebtoken");

const router = express.Router();

function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Access token required" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

router.get("/validate-session", authenticateToken, (req, res) => {
  return res.json({
    success: true,
    user: req.user,
  });
});

module.exports = router;