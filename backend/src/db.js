const mysql = require('mysql2/promise');
const { dbConfig } = require('./dbConfig');

const pool = mysql.createPool({
  ...dbConfig(),
  waitForConnections: true,
  connectionLimit: 10,
});

module.exports = pool;
