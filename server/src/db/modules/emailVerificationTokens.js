const crypto = require('crypto');

async function create(userId, tx) {
  const token = crypto.randomBytes(32).toString('hex'); // 64 char hex
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await (tx || db).query(
    `INSERT INTO email_verification_tokens (user_id, token, expires_at)
     VALUES (?, ?, ?)`,
    [userId, token, expiresAt]
  );

  return token;
}

async function getByToken(token, tx) {
  const [rows] = await (tx || db).query(
    `SELECT * FROM email_verification_tokens
     WHERE token = ? AND expires_at > NOW()`,
    [token]
  );
  return rows[0] ?? null;
}

async function deleteByToken(token, tx) {
  await (tx || db).query(
    `DELETE FROM email_verification_tokens WHERE token = ?`,
    [token]
  );
}

async function deleteByUserId(userId, tx) {
  await (tx || db).query(
    `DELETE FROM email_verification_tokens WHERE user_id = ?`,
    [userId]
  );
}