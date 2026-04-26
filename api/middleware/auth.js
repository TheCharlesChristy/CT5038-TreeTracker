const jwt = require("jsonwebtoken");

// General token authentication for logged-in users
function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Access token required" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Optional: enforce token type
    if (decoded.type && decoded.type !== "auth") {
      return res.status(403).json({ error: "Invalid token type" });
    }

    req.user = decoded;
    next();
  } catch (error) {
    console.error("JWT verify error:", error);
    return res.status(403).json({ error: "Invalid or expired token" });
  }
}

// Password reset token verification
function verifyResetToken(req, res, next) {
  const { token } = req.body;

  if (!token) {
    return res.status(400).json({ error: "Reset token required" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Ensure it's a reset token
    if (decoded.type !== "reset") {
      return res.status(403).json({ error: "Invalid reset token" });
    }

    req.user = decoded; // contains userId
    next();
  } catch (error) {
    console.error("Reset token error:", error);
    return res.status(403).json({ error: "Invalid or expired reset token" });
  }
}

module.exports = {
  authenticateToken,
  verifyResetToken
};