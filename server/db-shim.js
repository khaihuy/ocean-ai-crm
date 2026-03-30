/**
 * db-shim.js — SQLite better-sqlite3 compatible API backed by PostgreSQL
 * Allows existing synchronous-style code to work with minimal changes:
 *   - db.prepare(sql).get(p1,p2)  → Promise (add await)
 *   - db.prepare(sql).all(p1,p2)  → Promise (add await)
 *   - db.prepare(sql).run(p1,p2)  → Promise (add await)
 *   - db.transaction(fn)()        → async, works via op-recording trick
 */
const pg = require('./db');

// Active transaction context (op-recording mode)
let _txOps = null;

function fixSql(sql) {
  const wasIgnore = /INSERT\s+OR\s+IGNORE\s+INTO/i.test(sql);
  let s = sql
    .replace(/\bINSERT\s+OR\s+IGNORE\s+INTO\b/gi, 'INSERT INTO')
    .replace(/\bINSERT\s+OR\s+REPLACE\s+INTO\b/gi, 'INSERT INTO')
    .replace(/\bdatetime\('now'\)/gi, 'NOW()')
    .replace(/\bdate\('now',\s*'\+(\d+)\s+days'\)/gi, (_, d) => `CURRENT_DATE + INTERVAL '${d} days'`)
    .replace(/\bdate\('now'\)/gi, 'CURRENT_DATE')
    .trimEnd().replace(/;$/, '');
  if (wasIgnore) s += ' ON CONFLICT DO NOTHING';
  return s;
}

function prepare(sql) {
  const fixed = fixSql(sql);
  return {
    get(...args) { return pg.get(fixed, args.flat()); },
    all(...args) { return pg.all(fixed, args.flat()); },
    run(...args) {
      if (_txOps) {
        // Inside transaction: record op synchronously
        _txOps.push({ sql: fixed, params: args.flat() });
        return { changes: 1 };
      }
      return pg.run(fixed, args.flat());
    },
  };
}

function transaction(fn) {
  // Returns async callable, compatible with: const tx = db.transaction(fn); tx();
  return async () => {
    const ops = [];
    const prev = _txOps;
    _txOps = ops;
    try { fn(); } finally { _txOps = prev; }

    await pg.transaction(async (t) => {
      for (const op of ops) await t.run(op.sql, op.params);
    });
  };
}

module.exports = { prepare, transaction, pool: pg.pool, get: pg.get, all: pg.all, run: pg.run, query: pg.query };
