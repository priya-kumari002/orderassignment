const express = require('express');
const pool = require('../db');
const { httpError } = require('../middleware/errorHandler');
const { authRequired } = require('../middleware/auth');
const { hashPassword, verifyPassword, signToken, publicUser } = require('../services/auth');

const router = express.Router();

router.post('/signup', async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const name = String((req.body && req.body.name) || '').trim();
    const email = String((req.body && req.body.email) || '').trim().toLowerCase();
    const password = String((req.body && req.body.password) || '');
    const phone = String((req.body && req.body.phone) || '').trim();
    const city = String((req.body && req.body.city) || '').trim();

    if (name.length < 2) throw httpError(400, 'Name is required');
    if (!email.includes('@')) throw httpError(400, 'Valid email is required');
    if (password.length < 6) throw httpError(400, 'Password must be at least 6 characters');

    const [[existing]] = await conn.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing) throw httpError(409, 'Email already registered');

    await conn.beginTransaction();
    const [cust] = await conn.query(
      'INSERT INTO customers (name, phone, city) VALUES (?, ?, ?)',
      [name, phone || null, city || null]
    );
    const [userRes] = await conn.query(
      'INSERT INTO users (name, email, password_hash, role, customer_id) VALUES (?, ?, ?, ?, ?)',
      [name, email, hashPassword(password), 'customer', cust.insertId]
    );
    await conn.commit();

    const [[user]] = await pool.query('SELECT * FROM users WHERE id = ?', [userRes.insertId]);
    const pub = publicUser(user);
    res.status(201).json({ user: pub, token: signToken(pub) });
  } catch (err) {
    try { await conn.rollback(); } catch (_) {}
    next(err);
  } finally {
    conn.release();
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const email = String((req.body && req.body.email) || '').trim().toLowerCase();
    const password = String((req.body && req.body.password) || '');
    const [[user]] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    if (!user || !verifyPassword(password, user.password_hash)) {
      throw httpError(401, 'Invalid email or password');
    }
    const pub = publicUser(user);
    res.json({ user: pub, token: signToken(pub) });
  } catch (err) {
    next(err);
  }
});

router.get('/me', authRequired, async (req, res, next) => {
  try {
    const [[user]] = await pool.query('SELECT * FROM users WHERE id = ?', [req.user.id]);
    if (!user) throw httpError(401, 'User not found');
    res.json(publicUser(user));
  } catch (err) {
    next(err);
  }
});

module.exports = router;
