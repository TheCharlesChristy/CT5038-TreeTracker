const { requireAuthenticatedUser } = require('../api/utils/auth');

function createRequireVerified({ db }) {
  return async function requireVerified(req, res, next) {
    try {
      const auth = await requireAuthenticatedUser({ req, db });

      if (!auth?.user) {
        return res.status(401).json({ error: "Authentication required", code: "AuthError" });
      }

      if (!auth.user.verified_at) {
        return res.status(403).json({
          error: "Please verify your email address before performing this action",
          code: "UNVERIFIED"
        });
      }

      req.resolvedUser = auth.user;
      next();
    } catch (err) {
      return res.status(401).json({ 
        error: err.message || "Authentication required",
        code: err.name || "AuthError"
      });
    }
  };
}

module.exports = { createRequireVerified };