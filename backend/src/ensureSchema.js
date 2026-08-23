const pool = require('./db');
const { hashPassword } = require('./services/auth');
const { isPostgres } = require('./dbConfig');

const STATUSES = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'];

const CUSTOMERS = [
  ['Aarav Sharma', '9876500001', 'Delhi'],
  ['Priya Nair', '9876500002', 'Bengaluru'],
  ['Rohit Mehta', '9876500003', 'Mumbai'],
  ['Ananya Iyer', '9876500004', 'Chennai'],
  ['Kabir Khan', '9876500005', 'Hyderabad'],
];

const PRODUCTS = [
  ['Wireless Mouse', 799],
  ['Mechanical Keyboard', 3499],
  ['USB-C Hub', 1899],
  ['27" Monitor', 18999],
  ['Laptop Stand', 1299],
  ['Noise-Cancel Headphones', 5999],
  ['Webcam 1080p', 2499],
  ['Desk Mat XL', 899],
];

async function tryIndex(sql) {
  try {
    await pool.query(sql);
  } catch (err) {
    if (err && err.code !== 'ER_DUP_KEYNAME' && err.code !== '42P07') throw err;
  }
}

async function createMysqlTables() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS customers (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(120) NOT NULL,
      phone VARCHAR(20),
      city VARCHAR(80),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS products (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(120) NOT NULL,
      price DECIMAL(10,2) NOT NULL
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS orders (
      id INT AUTO_INCREMENT PRIMARY KEY,
      customer_id INT NOT NULL,
      status ENUM('pending','confirmed','shipped','delivered','cancelled') NOT NULL DEFAULT 'pending',
      total DECIMAL(12,2) NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_orders_customer FOREIGN KEY (customer_id) REFERENCES customers(id)
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS order_items (
      id INT AUTO_INCREMENT PRIMARY KEY,
      order_id INT NOT NULL,
      product_id INT NOT NULL,
      quantity INT NOT NULL,
      unit_price DECIMAL(10,2) NOT NULL,
      CONSTRAINT fk_items_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
      CONSTRAINT fk_items_product FOREIGN KEY (product_id) REFERENCES products(id)
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS idempotency_keys (
      id_key VARCHAR(128) PRIMARY KEY,
      order_id INT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_idem_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(120) NOT NULL,
      email VARCHAR(160) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      role ENUM('admin','customer') NOT NULL DEFAULT 'customer',
      customer_id INT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await tryIndex('CREATE INDEX idx_orders_status ON orders(status)');
  await tryIndex('CREATE INDEX idx_orders_created ON orders(created_at)');
  await tryIndex('CREATE INDEX idx_orders_customer ON orders(customer_id)');
  await tryIndex('CREATE INDEX idx_customers_name ON customers(name)');
}

async function createPostgresTables() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS customers (
      id SERIAL PRIMARY KEY,
      name VARCHAR(120) NOT NULL,
      phone VARCHAR(20),
      city VARCHAR(80),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS products (
      id SERIAL PRIMARY KEY,
      name VARCHAR(120) NOT NULL,
      price DECIMAL(10,2) NOT NULL
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS orders (
      id SERIAL PRIMARY KEY,
      customer_id INT NOT NULL REFERENCES customers(id),
      status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending','confirmed','shipped','delivered','cancelled')),
      total DECIMAL(12,2) NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS order_items (
      id SERIAL PRIMARY KEY,
      order_id INT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      product_id INT NOT NULL REFERENCES products(id),
      quantity INT NOT NULL,
      unit_price DECIMAL(10,2) NOT NULL
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS idempotency_keys (
      id_key VARCHAR(128) PRIMARY KEY,
      order_id INT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name VARCHAR(120) NOT NULL,
      email VARCHAR(160) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      role VARCHAR(20) NOT NULL DEFAULT 'customer'
        CHECK (role IN ('admin','customer')),
      customer_id INT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await tryIndex('CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status)');
  await tryIndex('CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at)');
  await tryIndex('CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id)');
  await tryIndex('CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name)');
}

async function seedIfEmpty() {
  const [[custCount]] = await pool.query('SELECT COUNT(*) AS n FROM customers');
  if (Number(custCount.n) === 0) {
    for (const c of CUSTOMERS) {
      await pool.query('INSERT INTO customers (name, phone, city) VALUES (?, ?, ?)', c);
    }
    for (const p of PRODUCTS) {
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
    console.log('[schema] seeded sample customers, products, and orders');
  }

  const [[admin]] = await pool.query("SELECT id FROM users WHERE email = 'admin@orderdesk.local'");
  if (!admin) {
    await pool.query(
      `INSERT INTO users (name, email, password_hash, role, customer_id)
       VALUES (?, ?, ?, 'admin', NULL)`,
      ['Admin', 'admin@orderdesk.local', hashPassword('admin123')]
    );
    console.log('[auth] seed admin  admin@orderdesk.local / admin123');
  }
}

async function ensureSchema() {
  if (isPostgres()) {
    await createPostgresTables();
  } else {
    await createMysqlTables();
  }
  await seedIfEmpty();
}

module.exports = { ensureSchema };
