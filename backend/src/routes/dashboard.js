const express = require('express');
const pool = require('../db');
const cache = require('../services/cache');
const { adminOnly } = require('../middleware/auth');

const router = express.Router();

router.get('/summary', adminOnly, async (req, res, next) => {
  try {
    const cached = await cache.getJson(cache.SUMMARY_KEY);
    if (cached) {
      return res.json({ ...cached, cached: true });
    }

    const totalOrdersQ = pool.query('SELECT COUNT(*) AS total_orders FROM orders');
    const revenueQ = pool.query(
      `SELECT COALESCE(SUM(total), 0) AS total_revenue
       FROM orders
       WHERE status <> 'cancelled'`
    );
    const byStatusQ = pool.query(
      `SELECT status, COUNT(*) AS count
       FROM orders
       GROUP BY status`
    );
    const topCustomersQ = pool.query(
      `SELECT c.id, c.name, c.city, COALESCE(SUM(o.total), 0) AS total_spend
       FROM customers c
       JOIN orders o ON o.customer_id = c.id AND o.status <> 'cancelled'
       GROUP BY c.id, c.name, c.city
       ORDER BY total_spend DESC
       LIMIT 5`
    );

    // Independent queries run concurrently — do not await them one-by-one.
    const [ordersRes, revenueRes, statusRes, topRes] = await Promise.all([
      totalOrdersQ,
      revenueQ,
      byStatusQ,
      topCustomersQ,
    ]);

    const countByStatus = {
      pending: 0,
      confirmed: 0,
      shipped: 0,
      delivered: 0,
      cancelled: 0,
    };
    for (const row of statusRes[0]) {
      countByStatus[row.status] = Number(row.count);
    }

    const payload = {
      totalOrders: Number(ordersRes[0][0].total_orders),
      totalRevenue: Number(revenueRes[0][0].total_revenue),
      countByStatus,
      topCustomers: topRes[0].map((r) => ({
        id: r.id,
        name: r.name,
        city: r.city,
        totalSpend: Number(r.total_spend),
      })),
    };

    await cache.setJson(cache.SUMMARY_KEY, payload, cache.SUMMARY_TTL_SEC);
    res.json({ ...payload, cached: false });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
