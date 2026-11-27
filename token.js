const crypto = require('crypto');
const jwt = require('jsonwebtoken');

const hashToken = (raw) => crypto.createHash('sha256').update(raw).digest('hex');

// Random token for emailed links. Only the hash is stored in the database.
const makeToken = () => {
  const raw = crypto.randomBytes(32).toString('hex');
  return { raw, hash: hashToken(raw) };
};

const signJwt = (user) =>
  jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });

module.exports = { hashToken, makeToken, signJwt };
