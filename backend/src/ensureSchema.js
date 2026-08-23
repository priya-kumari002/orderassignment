const pool = require('./db');
const { hashPassword } = require('./services/auth');

async function ensureSchema() {
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

module.exports = { ensureSchema };
