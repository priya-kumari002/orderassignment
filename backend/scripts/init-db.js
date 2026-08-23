/**
 * Creates schema and seeds ~5 customers, 8 products, 30 orders.
 * Usage: node scripts/init-db.js
 */
require('dotenv').config();
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

const STATUSES = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'];

async function main() {
  const admin = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'secret',
    multipleStatements: true,
  });

  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  await admin.query(schema);
  await admin.end();

  const pool = await mysql.createPool({
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'secret',
    database: process.env.DB_NAME || 'order_mgmt',
    multipleStatements: true,
  });

  const customers = [
    ['Aarav Sharma', '9876500001', 'Delhi'],
    ['Priya Nair', '9876500002', 'Bengaluru'],
    ['Rohit Mehta', '9876500003', 'Mumbai'],
    ['Ananya Iyer', '9876500004', 'Chennai'],
    ['Kabir Khan', '9876500005', 'Hyderabad'],
  ];
  for (const c of customers) {
    await pool.query(
      'INSERT INTO customers (name, phone, city) VALUES (?, ?, ?)',
      c
    );
  }

  const products = [
    ['Wireless Mouse', 799],
    ['Mechanical Keyboard', 3499],
    ['USB-C Hub', 1899],
    ['27" Monitor', 18999],
    ['Laptop Stand', 1299],
    ['Noise-Cancel Headphones', 5999],
    ['Webcam 1080p', 2499],
    ['Desk Mat XL', 899],
  ];
  for (const p of products) {
    await pool.query('INSERT INTO products (name, price) VALUES (?, ?)', p);
  }

  const [prodRows] = await pool.query('SELECT id, price FROM products');
  const [custRows] = await pool.query('SELECT id FROM customers');

  for (let i = 0; i < 30; i++) {
    const customerId = custRows[i % custRows.length].id;
    const status = STATUSES[i % STATUSES.length];
    const daysAgo = 30 - i;
    const itemCount = 1 + (i % 3);
    const items = [];
    let total = 0;
    for (let j = 0; j < itemCount; j++) {
      const prod = prodRows[(i + j) % prodRows.length];
      const qty = 1 + (j % 2);
      items.push({ productId: prod.id, quantity: qty, unitPrice: Number(prod.price) });
      total += Number(prod.price) * qty;
    }

    const [res] = await pool.query(
      'INSERT INTO orders (customer_id, status, total, created_at) VALUES (?, ?, ?, DATE_SUB(NOW(), INTERVAL ? DAY))',
      [customerId, status, total.toFixed(2), daysAgo]
    );
    for (const it of items) {
      await pool.query(
        'INSERT INTO order_items (order_id, product_id, quantity, unit_price) VALUES (?, ?, ?, ?)',
        [res.insertId, it.productId, it.quantity, it.unitPrice]
      );
    }
  }

  const [[c]] = await pool.query('SELECT COUNT(*) AS n FROM customers');
  const [[p]] = await pool.query('SELECT COUNT(*) AS n FROM products');
  const [[o]] = await pool.query('SELECT COUNT(*) AS n FROM orders');
  console.log(`Seeded customers=${c.n}, products=${p.n}, orders=${o.n}`);
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
