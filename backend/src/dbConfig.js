const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

function dbConfig(extra = {}) {
  const password =
    process.env.DB_PASSWORD === undefined ? 'secret' : process.env.DB_PASSWORD;

  return {
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password,
    database: process.env.DB_NAME || 'order_mgmt',
    ...extra,
  };
}

function printTarget() {
  const cfg = dbConfig();
  console.log(
    `[db] ${cfg.user}@${cfg.host}:${cfg.port} db=${cfg.database} password=${cfg.password ? 'YES' : 'NO'}`
  );
}

module.exports = { dbConfig, printTarget };
