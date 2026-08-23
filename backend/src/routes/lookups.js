const express = require('express');
const pool = require('../db');
const { httpError } = require('../middleware/errorHandler');
const { authRequired, adminOnly } = require('../middleware/auth');

const router = express.Router();

router.get('/customers', adminOnly, async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, name, phone, city FROM customers ORDER BY name'
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

router.post('/customers', adminOnly, async (req, res, next) => {
  try {
    const name = String((req.body && req.body.name) || '').trim();
    const phone = String((req.body && req.body.phone) || '').trim();
    const city = String((req.body && req.body.city) || '').trim();
    if (name.length < 2) throw httpError(400, 'Customer name is required');
    const [result] = await pool.query(
      'INSERT INTO customers (name, phone, city) VALUES (?, ?, ?)',
      [name, phone || null, city || null]
    );
    const [[row]] = await pool.query(
      'SELECT id, name, phone, city FROM customers WHERE id = ?',
      [result.insertId]
    );
    res.status(201).json(row);
  } catch (err) {
    next(err);
  }
});

router.get('/products', authRequired, async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, name, price FROM products ORDER BY name'
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

router.post('/products', adminOnly, async (req, res, next) => {
  try {
    const name = String((req.body && req.body.name) || '').trim();
    const price = Number(req.body && req.body.price);
    if (name.length < 2) throw httpError(400, 'Product name is required');
    if (!Number.isFinite(price) || price < 0) throw httpError(400, 'Valid price is required');
    const [result] = await pool.query(
      'INSERT INTO products (name, price) VALUES (?, ?)',
      [name, price.toFixed(2)]
    );
    const [[row]] = await pool.query(
      'SELECT id, name, price FROM products WHERE id = ?',
      [result.insertId]
    );
    res.status(201).json(row);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
