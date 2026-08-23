const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

function isPostgresUrl(raw) {
  return /^(postgres|postgresql):\/\//i.test(raw || '');
}

function isPostgres() {
  return isPostgresUrl(process.env.DATABASE_URL);
}

function sslForHost(host) {
  const flag = String(process.env.DB_SSL || '').toLowerCase();
  if (flag === 'false' || flag === '0' || flag === 'disable') return undefined;
  if (flag === 'true' || flag === '1' || flag === 'require') {
    return { rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false' };
  }
  const isLocal = host === '127.0.0.1' || host === 'localhost';
  if (!isLocal && process.env.NODE_ENV === 'production') {
    return { rejectUnauthorized: false };
  }
  return undefined;
}

function fromDatabaseUrl(raw) {
  const u = new URL(raw);
  const database = decodeURIComponent(u.pathname.replace(/^\//, '').split('/')[0] || '');
  const sslParam = u.searchParams.get('ssl') || u.searchParams.get('sslmode');
  const host = u.hostname;
  let ssl = sslForHost(host);
  if (sslParam === 'false' || sslParam === '0' || sslParam === 'disable') ssl = undefined;
  else if (sslParam && sslParam !== 'prefer' && sslParam !== 'disable') {
    ssl = { rejectUnauthorized: sslParam !== 'no-verify' };
  }
  return {
    host,
    port: Number(u.port || (isPostgresUrl(raw) ? 5432 : 3306)),
    user: decodeURIComponent(u.username),
    password: decodeURIComponent(u.password),
    database: database || process.env.DB_NAME || 'order_mgmt',
    ssl,
  };
}

function dbConfig(extra = {}) {
  if (process.env.DATABASE_URL) {
    return { ...fromDatabaseUrl(process.env.DATABASE_URL), ...extra };
  }

  const host = process.env.DB_HOST || '127.0.0.1';
  const password =
    process.env.DB_PASSWORD === undefined ? 'secret' : process.env.DB_PASSWORD;

  return {
    host,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password,
    database: process.env.DB_NAME || 'order_mgmt',
    ssl: sslForHost(host),
    ...extra,
  };
}

function printTarget() {
  const cfg = dbConfig();
  console.log(
    `[db] ${isPostgres() ? 'postgres' : 'mysql'} ${cfg.user}@${cfg.host}:${cfg.port} db=${cfg.database} password=${cfg.password ? 'YES' : 'NO'} ssl=${cfg.ssl ? 'YES' : 'NO'}`
  );
}

module.exports = { dbConfig, printTarget, isPostgres };
