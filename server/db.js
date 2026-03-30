const { Pool } = require('pg');
const logger = require('./logger');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => logger.error('PostgreSQL pool error:', err));

// Convert ? placeholders to $1, $2, ...
function pgify(sql) {
  let i = 0;
  return sql.replace(/\?/g, () => `$${++i}`);
}

const db = {
  all: (sql, params = []) => pool.query(pgify(sql), params).then(r => r.rows),
  get: (sql, params = []) => pool.query(pgify(sql), params).then(r => r.rows[0]),
  run: (sql, params = []) => pool.query(pgify(sql), params),
  query: (sql, params = []) => pool.query(sql, params),
  transaction: async (fn) => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const clientDb = {
        run: (sql, params = []) => client.query(pgify(sql), params),
        get: (sql, params = []) => client.query(pgify(sql), params).then(r => r.rows[0]),
      };
      const result = await fn(clientDb);
      await client.query('COMMIT');
      return result;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },
  pool,
};

module.exports = db;
