require('dotenv').config();
const express = require('express');
const cors = require('cors');
const pool = require('./db');
const cache = require('./services/cache');
const ordersRouter = require('./routes/orders');
const dashboardRouter = require('./routes/dashboard');
const lookupsRouter = require('./routes/lookups');
const authRouter = require('./routes/auth');
const { notFound, errorHandler } = require('./middleware/errorHandler');
const { ensureSchema } = require('./ensureSchema');

const app = express();

const frontendOrigins = (process.env.FRONTEND_URL || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: frontendOrigins.length ? frontendOrigins : true,
  })
);
app.use(express.json({ limit: '100kb' }));

app.get('/', (_req, res) => {
  res.json({ ok: true, service: 'order-management-api' });
});

app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ ok: true, redis: cache.isEnabled() });
  } catch (err) {
    res.status(503).json({ ok: false, error: 'db_unreachable' });
  }
});

app.use('/api/auth', authRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api', lookupsRouter);

app.use(notFound);
app.use(errorHandler);

const port = Number(process.env.PORT || 4000);

async function start() {
  const { printTarget } = require('./dbConfig');
  printTarget();
  await cache.init();
  try {
    await ensureSchema();
  } catch (err) {
    console.warn('[schema] users table not ready:', err.message);
  }
  app.listen(port, '0.0.0.0', () => {
    console.log(`API listening on port ${port}`);
  });
}

if (require.main === module) {
  start();
}

module.exports = app;
