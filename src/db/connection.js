require('dotenv').config();
const mysql = require('mysql2/promise');

let pool;

function getPool() {
  if (!pool) {
    pool = mysql.createPool({
      host:              process.env.DB_HOST     || 'localhost',
      port:              process.env.DB_PORT     || 3306,
      database:          process.env.DB_NAME     || 'angelquant_db',
      user:              process.env.DB_USER     || 'aquser',
      password:          process.env.DB_PASS     || 'aqpass123',
      waitForConnections: true,
      connectionLimit:   10,
      queueLimit:        0,
    });
    console.log('[DB] Pool created -> angelquant_db');
  }
  return pool;
}

async function query(sql, params = []) {
  const db = getPool();
  const [rows] = await db.execute(sql, params);
  return rows;
}

async function testConnection() {
  try {
    await query('SELECT 1');
    console.log('[DB] Connection OK');
    return true;
  } catch (err) {
    console.error('[DB] Connection FAILED:', err.message);
    return false;
  }
}

module.exports = { getPool, query, testConnection };
