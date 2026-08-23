const { dbConfig, isPostgres } = require('./dbConfig');

function toPgPlaceholders(sql) {
  let i = 0;
  return sql.replace(/\?/g, () => `$${++i}`);
}

function pgSql(sql) {
  let s = sql;
  s = s.replace(/DATE_SUB\(NOW\(\),\s*INTERVAL \? DAY\)/gi, "(NOW() - (?::int * INTERVAL '1 day'))");
  s = s.replace(/\bLIKE\b/gi, 'ILIKE');
  if (/^\s*INSERT\s+/i.test(s) && !/RETURNING/i.test(s)) {
    s = s.replace(/;?\s*$/, ' RETURNING *');
  }
  return toPgPlaceholders(s);
}

function wrapRows(result) {
  const rows = result.rows || [];
  if (result.rows && result.rows[0] && result.rows[0].id != null) {
    rows.insertId = result.rows[0].id;
  }
  return [rows];
}

function createPostgresPool() {
  const { Pool } = require('pg');
  const cfg = dbConfig();
  const pool = process.env.DATABASE_URL
    ? new Pool({
        connectionString: process.env.DATABASE_URL,
        max: 10,
        ssl: cfg.ssl || false,
      })
    : new Pool({
        host: cfg.host,
        port: cfg.port,
        user: cfg.user,
        password: cfg.password,
        database: cfg.database,
        max: 10,
        ssl: cfg.ssl || false,
      });

  async function query(sql, params) {
    const result = await pool.query(pgSql(sql), params || []);
    return wrapRows(result);
  }

  async function getConnection() {
    const client = await pool.connect();
    return {
      query: async (sql, params) => wrapRows(await client.query(pgSql(sql), params || [])),
      beginTransaction: () => client.query('BEGIN'),
      commit: () => client.query('COMMIT'),
      rollback: () => client.query('ROLLBACK'),
      release: () => client.release(),
    };
  }

  return { query, getConnection };
}

function createMysqlPool() {
  const mysql = require('mysql2/promise');
  return mysql.createPool({
    ...dbConfig(),
    waitForConnections: true,
    connectionLimit: 10,
  });
}

const pool = isPostgres() ? createPostgresPool() : createMysqlPool();

module.exports = pool;
