const express = require('express');
const pool = require('../db');
const { httpError } = require('../middleware/errorHandler');
const cache = require('../services/cache');
const { authRequired, adminOnly } = require('../middleware/auth');

const router = express.Router();
router.use(authRequired);

const ALLOWED_STATUS = new Set(['pending', 'confirmed', 'shipped', 'delivered', 'cancelled']);

const TRANSITIONS = {
  pending: new Set(['confirmed', 'cancelled']),
  confirmed: new Set(['shipped', 'cancelled']),
  shipped: new Set(['delivered', 'cancelled']),
  delivered: new Set(),
  cancelled: new Set(),
};

router.get('/', async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const offset = (page - 1) * limit;
    const status = req.query.status;
    const q = (req.query.q || '').trim();

    const where = [];
    const params = [];

    if (req.user.role !== 'admin') {
      if (!req.user.customerId) throw httpError(403, 'No customer profile on this account');
      where.push('o.customer_id = ?');
      params.push(req.user.customerId);
    }

    if (status) {
      if (!ALLOWED_STATUS.has(status)) {
        throw httpError(400, 'Invalid status filter', { allowed: [...ALLOWED_STATUS] });
      }
      where.push('o.status = ?');
      params.push(status);
    }

    if (q) {
      if (/^\d+$/.test(q)) {
        where.push('(o.id = ? OR c.name LIKE ?)');
        params.push(Number(q), `%${q}%`);
      } else {
        where.push('c.name LIKE ?');
        params.push(`%${q}%`);
      }
    }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const countSql = `
      SELECT COUNT(*) AS total
      FROM orders o
      JOIN customers c ON c.id = o.customer_id
      ${whereSql}
    `;
    const listSql = `
      SELECT o.id, o.status, o.total, o.created_at, o.customer_id,
             c.name AS customer_name, c.city AS customer_city
      FROM orders o
      JOIN customers c ON c.id = o.customer_id
      ${whereSql}
      ORDER BY o.created_at DESC, o.id DESC
      LIMIT ? OFFSET ?
    `;

    const [[{ total }]] = await pool.query(countSql, params);
    const [rows] = await pool.query(listSql, [...params, limit, offset]);

    res.json({
      data: rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) throw httpError(400, 'Invalid order id');

    const [[order]] = await pool.query(
      `SELECT o.id, o.status, o.total, o.created_at, o.customer_id,
              c.name AS customer_name, c.phone AS customer_phone, c.city AS customer_city
       FROM orders o
       JOIN customers c ON c.id = o.customer_id
       WHERE o.id = ?`,
      [id]
    );
    if (!order) throw httpError(404, 'Order not found');
    if (req.user.role !== 'admin' && Number(order.customer_id) !== Number(req.user.customerId)) {
      throw httpError(404, 'Order not found');
    }

    const [items] = await pool.query(
      `SELECT oi.id, oi.product_id, p.name AS product_name, oi.quantity, oi.unit_price,
              (oi.quantity * oi.unit_price) AS line_total
       FROM order_items oi
       JOIN products p ON p.id = oi.product_id
       WHERE oi.order_id = ?`,
      [id]
    );

    res.json({ ...order, items });
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const body = req.body || {};
    const items = body.items;
    const idemKey = req.get('Idempotency-Key') || req.get('X-Idempotency-Key');

    let customerId = body.customerId;
    if (req.user.role !== 'admin') {
      if (!req.user.customerId) throw httpError(403, 'No customer profile on this account');
      customerId = req.user.customerId;
    }
    if (!customerId || !Number.isInteger(Number(customerId))) {
      throw httpError(400, 'customerId is required');
    }
    if (!Array.isArray(items) || items.length === 0) {
      throw httpError(400, 'items must be a non-empty array of { productId, quantity }');
    }
    for (const it of items) {
      if (!it.productId || !Number.isInteger(Number(it.quantity)) || Number(it.quantity) < 1) {
        throw httpError(400, 'Each item needs productId and quantity >= 1');
      }
    }

    await conn.beginTransaction();

    if (idemKey) {
      const [[existing]] = await conn.query(
        'SELECT order_id FROM idempotency_keys WHERE id_key = ? FOR UPDATE',
        [idemKey]
      );
      if (existing) {
        const [[order]] = await conn.query('SELECT * FROM orders WHERE id = ?', [existing.order_id]);
        await conn.commit();
        return res.status(200).json({ ...order, idempotentReplay: true });
      }
    }

    const [[customer]] = await conn.query('SELECT id FROM customers WHERE id = ?', [customerId]);
    if (!customer) throw httpError(400, 'Customer not found');

    const productIds = [...new Set(items.map((i) => Number(i.productId)))];
    const [products] = await conn.query(
      `SELECT id, price FROM products WHERE id IN (${productIds.map(() => '?').join(',')})`,
      productIds
    );
    if (products.length !== productIds.length) {
      throw httpError(400, 'One or more products were not found');
    }
    const priceById = Object.fromEntries(products.map((p) => [p.id, Number(p.price)]));

    let total = 0;
    const lines = items.map((it) => {
      const unit = priceById[Number(it.productId)];
      const qty = Number(it.quantity);
      total += unit * qty;
      return { productId: Number(it.productId), quantity: qty, unitPrice: unit };
    });

    const [ordRes] = await conn.query(
      'INSERT INTO orders (customer_id, status, total) VALUES (?, ?, ?)',
      [Number(customerId), 'pending', total.toFixed(2)]
    );
    const orderId = ordRes.insertId;

    for (const line of lines) {
      await conn.query(
        'INSERT INTO order_items (order_id, product_id, quantity, unit_price) VALUES (?, ?, ?, ?)',
        [orderId, line.productId, line.quantity, line.unitPrice]
      );
    }

    if (idemKey) {
      await conn.query(
        'INSERT INTO idempotency_keys (id_key, order_id) VALUES (?, ?)',
        [idemKey, orderId]
      );
    }

    await conn.commit();
    await cache.invalidateDashboard();

    const [[created]] = await pool.query(
      `SELECT o.id, o.status, o.total, o.created_at, o.customer_id, c.name AS customer_name
       FROM orders o JOIN customers c ON c.id = o.customer_id WHERE o.id = ?`,
      [orderId]
    );
    res.status(201).json(created);
  } catch (err) {
    try {
      await conn.rollback();
    } catch (_) {}
    if (err && err.code === 'ER_DUP_ENTRY') {
      return next(httpError(409, 'Duplicate submit rejected'));
    }
    next(err);
  } finally {
    conn.release();
  }
});

router.patch('/:id/status', adminOnly, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const nextStatus = req.body && req.body.status;
    if (!Number.isInteger(id) || id < 1) throw httpError(400, 'Invalid order id');
    if (!ALLOWED_STATUS.has(nextStatus)) {
      throw httpError(400, 'Invalid status', { allowed: [...ALLOWED_STATUS] });
    }

    const [[order]] = await pool.query('SELECT id, status FROM orders WHERE id = ?', [id]);
    if (!order) throw httpError(404, 'Order not found');

    if (order.status === nextStatus) {
      return res.json({ id: order.id, status: order.status, unchanged: true });
    }
    if (!TRANSITIONS[order.status].has(nextStatus)) {
      throw httpError(409, `Cannot transition from ${order.status} to ${nextStatus}`, {
        from: order.status,
        to: nextStatus,
        allowed: [...TRANSITIONS[order.status]],
      });
    }

    await pool.query('UPDATE orders SET status = ? WHERE id = ?', [nextStatus, id]);
    await cache.invalidateDashboard();

    const [[updated]] = await pool.query(
      `SELECT o.id, o.status, o.total, o.created_at, o.customer_id, c.name AS customer_name
       FROM orders o JOIN customers c ON c.id = o.customer_id WHERE o.id = ?`,
      [id]
    );
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
