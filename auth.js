const express = require('express');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { protect } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');
const bad = require('../utils/httpError');
const { makeToken, hashToken, signJwt } = require('../utils/token');
const { sendMail } = require('../utils/mailer');

const router = express.Router();
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const publicUser = (u) => ({ id: u._id, name: u.name, email: u.email, role: u.role });
const clean = (v) => String(v || '').trim();

async function sendVerificationEmail(user) {
  const { raw, hash } = makeToken();
  user.verifyTokenHash = hash;
  user.verifyTokenExpires = new Date(Date.now() + 24 * 3600 * 1000);
  await user.save();
  const link = `${process.env.CLIENT_URL}/verify-email/${raw}`;
  await sendMail({
    to: user.email,
    subject: 'Verify your email for Oasis Pizza',
    text: `Hi ${user.name},\n\nConfirm your email to start ordering:\n${link}\n\nThis link works for 24 hours.`,
    html: `<p>Hi ${user.name},</p><p>Confirm your email to start ordering:</p><p><a href="${link}">Verify my email</a></p><p>This link works for 24 hours.</p>`,
  });
}

router.post(
  '/register',
  asyncHandler(async (req, res) => {
    const name = clean(req.body.name);
    const email = clean(req.body.email).toLowerCase();
    const password = String(req.body.password || '');
    if (name.length < 2) throw bad(400, 'Enter your name');
    if (!EMAIL_RE.test(email)) throw bad(400, 'Enter a valid email address');
    if (password.length < 8) throw bad(400, 'Password must be at least 8 characters');
    if (await User.findOne({ email })) throw bad(409, 'An account with this email already exists');

    // role is never read from the request, so registration can only ever create customers
    const user = await User.create({ name, email, password: await bcrypt.hash(password, 12) });
    try {
      await sendVerificationEmail(user);
    } catch (e) {
      console.error('Verification email failed:', e.message);
    }
    res.status(201).json({ message: 'Account created. Check your email for the verification link.' });
  })
);

router.post(
  '/resend-verification',
  asyncHandler(async (req, res) => {
    const user = await User.findOne({ email: clean(req.body.email).toLowerCase(), role: 'user' });
    if (user && !user.isVerified) {
      try {
        await sendVerificationEmail(user);
      } catch (e) {
        console.error('Verification email failed:', e.message);
      }
    }
    res.json({ message: 'If that account needs verification, a new link is on its way.' });
  })
);

router.post(
  '/verify-email',
  asyncHandler(async (req, res) => {
    const user = await User.findOne({ verifyTokenHash: hashToken(clean(req.body.token)) });
    if (!user) throw bad(400, 'This verification link is invalid');
    if (!user.isVerified) {
      if (!user.verifyTokenExpires || user.verifyTokenExpires < Date.now()) {
        throw bad(400, 'This verification link has expired. Request a new one from the sign-in page');
      }
      user.isVerified = true;
      await user.save();
    }
    res.json({ message: 'Email verified. You can sign in now.' });
  })
);

router.post(
  '/login',
  asyncHandler(async (req, res) => {
    const email = clean(req.body.email).toLowerCase();
    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await bcrypt.compare(String(req.body.password || ''), user.password))) {
      throw bad(401, 'Incorrect email or password');
    }
    if (user.role !== 'user') throw bad(403, 'Staff accounts sign in through the admin portal');
    if (!user.isVerified) throw bad(403, 'Verify your email before signing in', { code: 'EMAIL_NOT_VERIFIED' });
    res.json({ token: signJwt(user), user: publicUser(user) });
  })
);

router.post(
  '/forgot-password',
  asyncHandler(async (req, res) => {
    const user = await User.findOne({ email: clean(req.body.email).toLowerCase(), role: 'user' });
    if (user) {
      const { raw, hash } = makeToken();
      user.resetTokenHash = hash;
      user.resetTokenExpires = new Date(Date.now() + 3600 * 1000);
      await user.save();
      const link = `${process.env.CLIENT_URL}/reset-password/${raw}`;
      try {
        await sendMail({
          to: user.email,
          subject: 'Reset your Oasis Pizza password',
          text: `Reset your password using this link (valid for 1 hour):\n${link}\n\nIf you did not ask for this, ignore this email.`,
          html: `<p>Reset your password using the link below (valid for 1 hour).</p><p><a href="${link}">Reset password</a></p><p>If you did not ask for this, ignore this email.</p>`,
        });
      } catch (e) {
        console.error('Reset email failed:', e.message);
      }
    }
    // Same response either way so emails cannot be enumerated
    res.json({ message: 'If an account exists for that email, a reset link is on its way.' });
  })
);

router.post(
  '/reset-password',
  asyncHandler(async (req, res) => {
    const password = String(req.body.password || '');
    if (password.length < 8) throw bad(400, 'Password must be at least 8 characters');
    const user = await User.findOne({
      resetTokenHash: hashToken(clean(req.body.token)),
      resetTokenExpires: { $gt: new Date() },
    });
    if (!user) throw bad(400, 'This reset link is invalid or has expired');
    user.password = await bcrypt.hash(password, 12);
    user.resetTokenHash = undefined;
    user.resetTokenExpires = undefined;
    await user.save();
    res.json({ message: 'Password updated. You can sign in now.' });
  })
);

router.get('/me', protect, (req, res) => res.json({ user: publicUser(req.user) }));

module.exports = router;
