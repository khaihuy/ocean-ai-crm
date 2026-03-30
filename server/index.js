require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const crypto = require('crypto');
const { parse: csvParseSync } = require('csv-parse/sync');
const db = require('./database');
const logger = require('./logger');
const { errorHandler, notFound } = require('./middleware/errorHandler');
const { authenticate } = require('./middleware/auth');
const authRouter = require('./routes/auth');
const aiRouter = require('./routes/ai');

const app = express();
const PORT = process.env.PORT || 3000;

// ── Security middleware ──────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: false, // Allow inline scripts in SPA
  crossOriginEmbedderPolicy: false,
}));

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['http://localhost:3000', 'http://localhost:5173'];

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error(`CORS policy blocked: ${origin}`));
  },
  credentials: true,
}));

// ── Rate limiting ────────────────────────────────────────────
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Quá nhiều yêu cầu, vui lòng thử lại sau.' },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Quá nhiều lần đăng nhập, vui lòng thử lại sau 15 phút.' },
});

app.use('/api/', apiLimiter);
app.use('/api/auth/login', authLimiter);

// ── Body parsing ─────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, '..', 'public')));

// ── Request logging ──────────────────────────────────────────
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const ms = Date.now() - start;
    if (req.path.startsWith('/api/')) {
      logger.debug(`${req.method} ${req.path} ${res.statusCode} ${ms}ms`);
    }
  });
  next();
});

// ── Health check ─────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  const clientCount = db.prepare('SELECT COUNT(*) as c FROM clients').get().c;
  res.json({ status: 'ok', version: '2.0.0', db_clients: clientCount, timestamp: new Date().toISOString() });
});

// ── Auth & AI routes (no global auth required) ───────────────
app.use('/api/auth', authRouter);
app.use('/api/ai', aiRouter);

const genId = () => crypto.randomUUID().replace(/-/g, '').slice(0, 12);
const now = () => new Date().toISOString();

// ============================================================
// API: CLIENTS
// ============================================================
app.get('/api/clients', (req, res) => {
  const { country, industry, status, search } = req.query;
  let sql = 'SELECT * FROM clients WHERE 1=1';
  const params = [];
  if (country) { sql += ' AND country = ?'; params.push(country); }
  if (industry) { sql += ' AND industry = ?'; params.push(industry); }
  if (status) { sql += ' AND status = ?'; params.push(status); }
  if (search) { sql += ' AND (name LIKE ? OR representative LIKE ? OR email LIKE ?)'; params.push(`%${search}%`, `%${search}%`, `%${search}%`); }
  sql += ' ORDER BY created_at DESC';
  res.json(db.prepare(sql).all(...params));
});

app.get('/api/clients/:id', (req, res) => {
  const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(req.params.id);
  if (!client) return res.status(404).json({ error: 'Not found' });
  const contracts = db.prepare('SELECT * FROM contracts WHERE client_id = ? ORDER BY created_at DESC').all(req.params.id);
  res.json({ ...client, contracts });
});

app.post('/api/clients', (req, res) => {
  const id = genId();
  const { name, country, industry, representative, email, phone, investment_capital, address, notes, status } = req.body;
  db.prepare('INSERT INTO clients (id, name, country, industry, representative, email, phone, investment_capital, address, notes, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(id, name, country, industry, representative, email, phone, investment_capital || 0, address, notes, status || 'Tiềm năng');
  db.prepare('INSERT INTO activities (id, entity_type, entity_id, action, description) VALUES (?, ?, ?, ?, ?)').run(genId(), 'client', id, 'create', `Tạo khách hàng: ${name}`);
  res.status(201).json(db.prepare('SELECT * FROM clients WHERE id = ?').get(id));
});

app.put('/api/clients/:id', (req, res) => {
  const { name, country, industry, representative, email, phone, investment_capital, address, notes, status } = req.body;
  db.prepare('UPDATE clients SET name=?, country=?, industry=?, representative=?, email=?, phone=?, investment_capital=?, address=?, notes=?, status=?, updated_at=? WHERE id=?').run(name, country, industry, representative, email, phone, investment_capital, address, notes, status, now(), req.params.id);
  res.json(db.prepare('SELECT * FROM clients WHERE id = ?').get(req.params.id));
});

app.delete('/api/clients/:id', (req, res) => {
  db.prepare('DELETE FROM clients WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// ============================================================
// API: CONTRACTS
// ============================================================
app.get('/api/contracts', (req, res) => {
  const { status, service_type, client_id, search } = req.query;
  let sql = `SELECT c.*, cl.name as client_name FROM contracts c LEFT JOIN clients cl ON c.client_id = cl.id WHERE 1=1`;
  const params = [];
  if (status) { sql += ' AND c.status = ?'; params.push(status); }
  if (service_type) { sql += ' AND c.service_type = ?'; params.push(service_type); }
  if (client_id) { sql += ' AND c.client_id = ?'; params.push(client_id); }
  if (search) { sql += ' AND (c.contract_no LIKE ? OR cl.name LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
  sql += ' ORDER BY c.created_at DESC';
  res.json(db.prepare(sql).all(...params));
});

app.post('/api/contracts', (req, res) => {
  const id = genId();
  const { client_id, contract_no, service_type, value, start_date, end_date, status, payment_status, paid_amount, notes } = req.body;
  db.prepare('INSERT INTO contracts (id, client_id, contract_no, service_type, value, start_date, end_date, status, payment_status, paid_amount, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(id, client_id, contract_no, service_type, value || 0, start_date, end_date, status || 'Dự thảo', payment_status || 'Chưa thanh toán', paid_amount || 0, notes);
  db.prepare('INSERT INTO activities (id, entity_type, entity_id, action, description) VALUES (?, ?, ?, ?, ?)').run(genId(), 'contract', id, 'create', `Tạo hợp đồng: ${contract_no}`);
  res.status(201).json(db.prepare('SELECT c.*, cl.name as client_name FROM contracts c LEFT JOIN clients cl ON c.client_id = cl.id WHERE c.id = ?').get(id));
});

app.put('/api/contracts/:id', (req, res) => {
  const { client_id, contract_no, service_type, value, start_date, end_date, status, payment_status, paid_amount, notes } = req.body;
  db.prepare('UPDATE contracts SET client_id=?, contract_no=?, service_type=?, value=?, start_date=?, end_date=?, status=?, payment_status=?, paid_amount=?, notes=?, updated_at=? WHERE id=?').run(client_id, contract_no, service_type, value, start_date, end_date, status, payment_status, paid_amount, notes, now(), req.params.id);
  res.json(db.prepare('SELECT c.*, cl.name as client_name FROM contracts c LEFT JOIN clients cl ON c.client_id = cl.id WHERE c.id = ?').get(req.params.id));
});

app.delete('/api/contracts/:id', (req, res) => {
  db.prepare('DELETE FROM contracts WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// ============================================================
// API: CASES
// ============================================================
app.get('/api/cases', (req, res) => {
  const { status, priority, assignee, search } = req.query;
  let sql = `SELECT cs.*, ct.contract_no, cl.name as client_name FROM cases cs LEFT JOIN contracts ct ON cs.contract_id = ct.id LEFT JOIN clients cl ON ct.client_id = cl.id WHERE 1=1`;
  const params = [];
  if (status) { sql += ' AND cs.status = ?'; params.push(status); }
  if (priority) { sql += ' AND cs.priority = ?'; params.push(priority); }
  if (assignee) { sql += ' AND cs.assignee = ?'; params.push(assignee); }
  if (search) { sql += ' AND (cs.case_name LIKE ? OR cl.name LIKE ? OR cs.assignee LIKE ?)'; params.push(`%${search}%`, `%${search}%`, `%${search}%`); }
  sql += ' ORDER BY cs.deadline ASC';
  res.json(db.prepare(sql).all(...params));
});

app.post('/api/cases', (req, res) => {
  const id = genId();
  const { contract_id, case_name, service_type, status, priority, assignee, start_date, deadline, notes, progress } = req.body;
  db.prepare('INSERT INTO cases (id, contract_id, case_name, service_type, status, priority, assignee, start_date, deadline, notes, progress) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(id, contract_id, case_name, service_type, status || 'Tiếp nhận', priority || 'Trung bình', assignee, start_date, deadline, notes, progress || 0);
  res.status(201).json(db.prepare('SELECT cs.*, ct.contract_no, cl.name as client_name FROM cases cs LEFT JOIN contracts ct ON cs.contract_id = ct.id LEFT JOIN clients cl ON ct.client_id = cl.id WHERE cs.id = ?').get(id));
});

app.put('/api/cases/:id', (req, res) => {
  const { contract_id, case_name, service_type, status, priority, assignee, start_date, deadline, notes, progress } = req.body;
  db.prepare('UPDATE cases SET contract_id=?, case_name=?, service_type=?, status=?, priority=?, assignee=?, start_date=?, deadline=?, notes=?, progress=?, updated_at=? WHERE id=?').run(contract_id, case_name, service_type, status, priority, assignee, start_date, deadline, notes, progress, now(), req.params.id);
  res.json(db.prepare('SELECT cs.*, ct.contract_no, cl.name as client_name FROM cases cs LEFT JOIN contracts ct ON cs.contract_id = ct.id LEFT JOIN clients cl ON ct.client_id = cl.id WHERE cs.id = ?').get(req.params.id));
});

app.delete('/api/cases/:id', (req, res) => {
  db.prepare('DELETE FROM cases WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// ============================================================
// API: PAYMENTS
// ============================================================
app.get('/api/payments', (req, res) => {
  const { contract_id } = req.query;
  let sql = `SELECT p.*, ct.contract_no, cl.name as client_name FROM payments p LEFT JOIN contracts ct ON p.contract_id = ct.id LEFT JOIN clients cl ON ct.client_id = cl.id WHERE 1=1`;
  const params = [];
  if (contract_id) { sql += ' AND p.contract_id = ?'; params.push(contract_id); }
  sql += ' ORDER BY p.payment_date DESC';
  res.json(db.prepare(sql).all(...params));
});

app.post('/api/payments', (req, res) => {
  const id = genId();
  const { contract_id, amount, payment_date, method, reference_no, notes } = req.body;
  db.prepare('INSERT INTO payments (id, contract_id, amount, payment_date, method, reference_no, notes) VALUES (?, ?, ?, ?, ?, ?, ?)').run(id, contract_id, amount, payment_date, method, reference_no, notes);
  // Update contract paid amount
  const total = db.prepare('SELECT SUM(amount) as total FROM payments WHERE contract_id = ?').get(contract_id).total || 0;
  const contract = db.prepare('SELECT value FROM contracts WHERE id = ?').get(contract_id);
  const paymentStatus = total >= contract.value ? 'Đã thanh toán' : total > 0 ? 'Thanh toán một phần' : 'Chưa thanh toán';
  db.prepare('UPDATE contracts SET paid_amount = ?, payment_status = ? WHERE id = ?').run(total, paymentStatus, contract_id);
  res.status(201).json(db.prepare('SELECT * FROM payments WHERE id = ?').get(id));
});

// ============================================================
// API: DASHBOARD / STATISTICS
// ============================================================
app.get('/api/dashboard', (req, res) => {
  const stats = {
    clients: {
      total: db.prepare('SELECT COUNT(*) as c FROM clients').get().c,
      active: db.prepare("SELECT COUNT(*) as c FROM clients WHERE status = 'Đang hoạt động'").get().c,
      potential: db.prepare("SELECT COUNT(*) as c FROM clients WHERE status = 'Tiềm năng'").get().c,
      by_country: db.prepare('SELECT country, COUNT(*) as count FROM clients GROUP BY country ORDER BY count DESC').all(),
      by_industry: db.prepare('SELECT industry, COUNT(*) as count FROM clients GROUP BY industry ORDER BY count DESC').all(),
    },
    contracts: {
      total: db.prepare('SELECT COUNT(*) as c FROM contracts').get().c,
      active: db.prepare("SELECT COUNT(*) as c FROM contracts WHERE status = 'Đang thực hiện'").get().c,
      total_value: db.prepare('SELECT COALESCE(SUM(value), 0) as v FROM contracts').get().v,
      total_paid: db.prepare('SELECT COALESCE(SUM(paid_amount), 0) as v FROM contracts').get().v,
      by_service: db.prepare('SELECT service_type, COUNT(*) as count, SUM(value) as total_value FROM contracts GROUP BY service_type ORDER BY count DESC').all(),
      by_status: db.prepare('SELECT status, COUNT(*) as count FROM contracts GROUP BY status').all(),
    },
    cases: {
      total: db.prepare('SELECT COUNT(*) as c FROM cases').get().c,
      active: db.prepare("SELECT COUNT(*) as c FROM cases WHERE status NOT IN ('Đã cấp phép', 'Từ chối')").get().c,
      urgent: db.prepare("SELECT COUNT(*) as c FROM cases WHERE priority = 'Cao' AND status NOT IN ('Đã cấp phép', 'Từ chối')").get().c,
      by_status: db.prepare('SELECT status, COUNT(*) as count FROM cases GROUP BY status').all(),
      upcoming_deadlines: db.prepare("SELECT cs.*, ct.contract_no, cl.name as client_name FROM cases cs LEFT JOIN contracts ct ON cs.contract_id = ct.id LEFT JOIN clients cl ON ct.client_id = cl.id WHERE cs.deadline IS NOT NULL AND cs.status NOT IN ('Đã cấp phép', 'Từ chối') AND cs.deadline >= date('now') AND cs.deadline <= date('now', '+30 days') ORDER BY cs.deadline ASC").all(),
    },
    recent_activities: db.prepare('SELECT * FROM activities ORDER BY created_at DESC LIMIT 20').all(),
  };
  res.json(stats);
});


// ============================================================
// API: SEARCH
// ============================================================
app.get('/api/search', (req, res) => {
  const { q } = req.query;
  if (!q || q.length < 2) return res.json({ clients: [], contracts: [], cases: [] });
  const term = `%${q}%`;
  res.json({
    clients: db.prepare('SELECT * FROM clients WHERE name LIKE ? OR representative LIKE ? OR email LIKE ? OR country LIKE ? LIMIT 20').all(term, term, term, term),
    contracts: db.prepare('SELECT c.*, cl.name as client_name FROM contracts c LEFT JOIN clients cl ON c.client_id = cl.id WHERE c.contract_no LIKE ? OR cl.name LIKE ? OR c.service_type LIKE ? LIMIT 20').all(term, term, term),
    cases: db.prepare('SELECT cs.*, ct.contract_no, cl.name as client_name FROM cases cs LEFT JOIN contracts ct ON cs.contract_id = ct.id LEFT JOIN clients cl ON ct.client_id = cl.id WHERE cs.case_name LIKE ? OR cl.name LIKE ? OR cs.assignee LIKE ? LIMIT 20').all(term, term, term),
  });
});

// ============================================================
// API: REFERENCE DATA
// ============================================================
app.get('/api/reference/countries', (req, res) => {
  res.json(["Nhật Bản", "Hàn Quốc", "Trung Quốc", "Đài Loan", "Singapore", "Thái Lan", "Hoa Kỳ", "Đức", "Pháp", "Anh", "Hà Lan", "Úc", "Canada", "Ấn Độ", "Hồng Kông", "Malaysia"]);
});

app.get('/api/reference/industries', (req, res) => {
  res.json(["Sản xuất", "Thương mại", "Dịch vụ", "Công nghệ thông tin", "Thực phẩm & Đồ uống", "Mỹ phẩm", "Hóa chất", "Dược phẩm", "Bất động sản", "Logistics", "Giáo dục", "Y tế", "Nông nghiệp", "Năng lượng"]);
});

app.get('/api/reference/services', (req, res) => {
  res.json(["Giấy chứng nhận đầu tư (IRC)", "Giấy chứng nhận đăng ký doanh nghiệp (ERC)", "Giấy phép con - An ninh mạng", "Giấy phép con - Giáo dục", "Giấy phép con - Kinh doanh hóa chất", "Công bố chất lượng thực phẩm nhập khẩu", "Công bố mỹ phẩm nhập khẩu", "Giấy phép lao động (Work Permit)", "Thẻ tạm trú (TRC)", "Thay đổi nội dung đăng ký đầu tư", "Thay đổi nội dung đăng ký doanh nghiệp", "Giấy phép kinh doanh nhập khẩu", "Đăng ký thuế & kê khai thuế ban đầu", "Tư vấn pháp lý đầu tư", "Mở tài khoản vốn đầu tư"]);
});

// ============================================================
// API: COSING INGREDIENTS
// ============================================================

// In-memory cache for fuzzy search
let _inciNamesCache = null;
function getInciNamesCache() {
  if (!_inciNamesCache) {
    _inciNamesCache = db.prepare('SELECT inci_name FROM cosing_ingredients').all().map(r => r.inci_name);
  }
  return _inciNamesCache;
}
function invalidateInciCache() { _inciNamesCache = null; }

function levenshtein(a, b) {
  const la = a.length, lb = b.length;
  if (la === 0) return lb;
  if (lb === 0) return la;
  // Use two rows to save memory
  let prev = Array.from({ length: lb + 1 }, (_, i) => i);
  let curr = new Array(lb + 1);
  for (let i = 1; i <= la; i++) {
    curr[0] = i;
    for (let j = 1; j <= lb; j++) {
      curr[j] = a[i - 1] === b[j - 1]
        ? prev[j - 1]
        : 1 + Math.min(prev[j - 1], prev[j], curr[j - 1]);
    }
    [prev, curr] = [curr, prev];
  }
  return prev[lb];
}

function fuzzySearchNames(query, maxDist) {
  const q = query.toLowerCase();
  const names = getInciNamesCache();
  const results = [];
  for (const name of names) {
    const n = name.toLowerCase();
    if (Math.abs(n.length - q.length) > maxDist + 1) continue;
    const dist = levenshtein(q, n);
    if (dist <= maxDist) results.push({ name, dist });
  }
  results.sort((a, b) => a.dist - b.dist);
  return results.slice(0, 8).map(r => r.name);
}

app.get('/api/cosing/search', (req, res) => {
  const { q, annex, limit: lim } = req.query;
  if (!q || q.trim().length < 2) return res.json([]);
  const trimmed = q.trim();
  const term = `%${trimmed}%`;
  const maxRows = Math.min(parseInt(lim) || 50, 200);
  let sql = `SELECT * FROM cosing_ingredients WHERE (inci_name LIKE ? OR cas_no LIKE ? OR functions LIKE ?)`;
  const params = [term, term, term];
  if (annex && annex !== 'all') { sql += ' AND annex = ?'; params.push(annex); }
  sql += ' ORDER BY inci_name ASC LIMIT ?';
  params.push(maxRows);
  const results = db.prepare(sql).all(...params);

  // Fuzzy fallback when no exact/LIKE match
  if (results.length === 0 && trimmed.length >= 3) {
    const maxDist = Math.max(1, Math.floor(trimmed.length / 4));
    const fuzzyNames = fuzzySearchNames(trimmed, maxDist);
    if (fuzzyNames.length > 0) {
      const placeholders = fuzzyNames.map(() => '?').join(',');
      const fuzzyResults = db.prepare(
        `SELECT * FROM cosing_ingredients WHERE inci_name IN (${placeholders}) ORDER BY inci_name ASC`
      ).all(...fuzzyNames);
      return res.json(fuzzyResults.map(r => ({ ...r, _fuzzy: true, _query: trimmed })));
    }
  }

  res.json(results);
});

app.get('/api/cosing/stats', (req, res) => {
  res.json({
    total: db.prepare('SELECT COUNT(*) as c FROM cosing_ingredients').get().c,
    by_annex: db.prepare("SELECT annex, COUNT(*) as count FROM cosing_ingredients GROUP BY annex ORDER BY count DESC").all(),
  });
});

// GET /api/ingredients/total — tổng số thành phần toàn hệ thống
app.get('/api/ingredients/total', (req, res) => {
  const cosing     = db.prepare('SELECT COUNT(*) as c FROM cosing_ingredients').get().c;
  const countryReg = db.prepare('SELECT COUNT(DISTINCT LOWER(TRIM(inci_name))) as c FROM country_regs').get().c;
  const countryDb  = db.prepare('SELECT COUNT(*) as c FROM country_ingredients').get().c;
  const byCountry  = db.prepare('SELECT country, COUNT(*) as count FROM country_ingredients GROUP BY country ORDER BY count DESC').all();
  res.json({
    cosing_eu: cosing,
    country_regs: countryReg,
    country_db: countryDb,
    total: cosing + countryDb,
    by_country: byCountry,
  });
});

// GET /api/country-regs?inci=POLYSILICONE-15
app.get('/api/country-regs', (req, res) => {
  const { inci } = req.query;
  if (!inci) return res.json([]);
  const rows = db.prepare(`
    SELECT country, status, max_conc, conditions, source_ref
    FROM country_regs
    WHERE LOWER(TRIM(inci_name)) = LOWER(TRIM(?))
    ORDER BY country
  `).all(inci);
  res.json(rows);
});

// POST /api/country-regs/batch — { incis: ["NAME1", "NAME2", ...] }
app.post('/api/country-regs/batch', (req, res) => {
  const { incis } = req.body;
  if (!Array.isArray(incis) || incis.length === 0) return res.json({});
  const result = {};
  const stmt = db.prepare(`
    SELECT country, status, max_conc, conditions, source_ref
    FROM country_regs
    WHERE LOWER(TRIM(inci_name)) = LOWER(TRIM(?))
    ORDER BY country
  `);
  for (const inci of incis) {
    result[inci] = stmt.all(inci);
  }
  res.json(result);
});

app.post('/api/cosing/import', (req, res) => {
  // Accept array of ingredient objects (full field names)
  const rows = req.body;
  if (!Array.isArray(rows) || rows.length === 0) return res.status(400).json({ error: 'Body must be a non-empty array' });
  const insert = db.prepare(`
    INSERT OR IGNORE INTO cosing_ingredients
      (cosing_ref_no, inci_name, cas_no, ec_no, functions, annex, max_conc, origin, uv_range, sccs_assessment, sccs_ref, source, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
  `);
  let count = 0;
  const tx = db.transaction(() => {
    for (const r of rows) {
      if (!r.inci_name) continue;
      insert.run(r.cosing_ref_no||null, r.inci_name, r.cas_no||null, r.ec_no||null, r.functions||null, r.annex||null, r.max_conc||null, r.origin||null, r.uv_range||null, r.sccs_assessment||null, r.sccs_ref||null, r.source||'import');
      count++;
    }
  });
  tx();
  res.json({ imported: count });
});

// ============================================================
// API: COSING CSV IMPORT
// POST /api/cosing/import-csv  { csv: "<raw csv text>" }
// ============================================================

// Detect delimiter from header row (semicolon or comma)
function detectDelimiter(headerLine) {
  const semicolons = (headerLine.match(/;/g) || []).length;
  const commas    = (headerLine.match(/,/g) || []).length;
  return semicolons >= commas ? ';' : ',';
}

// Parse one CSV line respecting double-quoted fields
function parseCsvLine(line, delim) {
  const fields = [];
  let cur = '', inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQ && line[i+1] === '"') { cur += '"'; i++; }
      else inQ = !inQ;
    } else if (ch === delim && !inQ) {
      fields.push(cur.trim()); cur = '';
    } else {
      cur += ch;
    }
  }
  fields.push(cur.trim());
  return fields;
}

// Map CosIng CSV header → our column name
// Handles both:
//   - Official CosIng Annex export (Annex III/V/VI from Open Beauty Facts)
//     cols: "Name of Common Ingredients Glossary", "Maximum concentration in
//           ready for use preparation", "SCCS opinions", "Regulation", etc.
//   - Fragrance Inventory export: "INCI Name", "Function", "Restriction", "Annex"
//   - Custom/simplified CSVs
function mapHeaders(headers) {
  return headers.map(h => {
    const n = h.toLowerCase().replace(/[\s.\-\/\(\)]+/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
    // INCI name — "Name of Common Ingredients Glossary" or "INCI Name"
    if (/reference_number|cosing_ref|^ref_no$/.test(n)) return 'cosing_ref_no';
    // "INCI name" / "INCI Name" / "Name of Common Ingredients Glossary" / "Chemical name / INN" (Annex II)
    if (/common_ingredients_glossary|^inci_name$|^inci_name_|^inci$|^chemical_name/.test(n)) return 'inci_name';
    // CAS
    if (/^cas/.test(n)) return 'cas_no';
    // EC / EINECS/ELINCS
    if (/^ec_no$|^ec_number$|^ec$|einecs|elincs/.test(n)) return 'ec_no';
    // Functions
    if (/^function/.test(n)) return 'functions';
    // Max concentration
    if (/maximum_concentration|max_conc|^conc/.test(n)) return 'max_conc';
    // Annex / Restriction / Regulation
    if (/^regulation$|^restriction$|^annex$/.test(n)) return 'annex_raw';
    // SCCS / Description — "Chem/IUPAC Name / Description" from Fragrance Inventory
    if (/sccs_opinion|sccs_ref/.test(n)) return 'sccs_ref';
    if (/sccs|assessment/.test(n)) return 'sccs_assessment';
    if (/chem.*iupac|iupac.*name|^description$/.test(n)) return 'sccs_assessment';
    // Origin / UV (custom CSVs)
    if (/origin/.test(n)) return 'origin';
    if (/uv_range|uv_filter/.test(n)) return 'uv_range';
    return n;
  });
}

// Extract annex code from restriction text
// e.g. "Annex VI - UV Filters" → "VI"
function parseAnnex(raw) {
  if (!raw) return null;
  const m = raw.match(/annex\s+(I{1,3}V?|VI?|IV|V)/i);
  return m ? m[1].toUpperCase() : null;
}

app.post('/api/cosing/import-csv', (req, res) => {
  const { csv, filename } = req.body;
  if (!csv || typeof csv !== 'string') {
    return res.status(400).json({ error: 'Body must be { csv: "...", filename: "..." }' });
  }

  // Skip metadata lines before real CSV header
  const metaEnd = csv.search(/^["']?(COSING\s+Ref|INCI\s*name|INCI\s*Name)/im);
  const csvBody = metaEnd > 0 ? csv.slice(metaEnd) : csv;

  // Infer annex from filename if rows have no Regulation/Restriction column
  // e.g. COSING_Annex.V_v2.csv → "V"
  const filenameAnnex = filename ? parseAnnex(filename) : null;

  let records, rawHdrsRef = [];
  try {
    records = csvParseSync(csvBody, {
      columns: (rawHdrs) => {
        rawHdrsRef = rawHdrs;
        return mapHeaders(rawHdrs);
      },
      skip_empty_lines: true,
      relax_quotes: true,
      relax_column_count: true,
      trim: true,
    });
  } catch (parseErr) {
    return res.status(400).json({ error: parseErr.message });
  }

  if (!records.length || !Object.keys(records[0]).includes('inci_name')) {
    return res.status(400).json({ error: 'No INCI Name column found', headers: rawHdrsRef });
  }

  const insert = db.prepare(`
    INSERT OR IGNORE INTO cosing_ingredients
      (cosing_ref_no, inci_name, cas_no, ec_no, functions, annex, max_conc, origin, uv_range, sccs_assessment, sccs_ref, source, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'cosing_csv', datetime('now'))
  `);

  let imported = 0, skipped = 0;
  const tx = db.transaction(() => {
    for (const row of records) {
      const inci = row.inci_name;
      if (!inci || inci === 'INCI Name') { skipped++; continue; }

      const annex = parseAnnex(row.annex_raw) || row.annex || filenameAnnex || null;
      insert.run(
        row.cosing_ref_no || null,
        inci,
        row.cas_no   || null,
        row.ec_no    || null,
        row.functions|| null,
        annex,
        row.max_conc || null,
        row.origin   || null,
        row.uv_range || null,
        row.sccs_assessment || null,
        row.sccs_ref || null,
      );
      imported++;
    }
  });
  tx();

  invalidateInciCache();
  const total = db.prepare('SELECT COUNT(*) as c FROM cosing_ingredients').get().c;
  res.json({ imported, skipped, total_in_db: total });
});

// ============================================================
// API: COSING AUTO-IMPORT — all available CosIng datasets
// GET /api/cosing/auto-import
// Downloads all CSV files from Open Beauty Facts GitHub
// ============================================================
const COSING_BASE_URL = 'https://raw.githubusercontent.com/openfoodfacts/openbeautyfacts/develop/cosing/';
const COSING_CSV_FILES = [
  { file: 'COSING_Ingredients-Fragrance.Inventory_v2.csv', label: 'Fragrance Inventory', defaultAnnex: null },
  { file: 'COSING_Annex.II_v2.csv',  label: 'Annex II',  defaultAnnex: 'II'  },
  { file: 'COSING_Annex.III_v2.csv', label: 'Annex III', defaultAnnex: 'III' },
  { file: 'COSING_Annex.IV_v2.csv',  label: 'Annex IV',  defaultAnnex: 'IV'  },
  { file: 'COSING_Annex.V_v2.csv',   label: 'Annex V',   defaultAnnex: 'V'   },
  { file: 'COSING_Annex.VI_v2.csv',  label: 'Annex VI',  defaultAnnex: 'VI'  },
];

function parseCosIngCsv(csv) {
  // Skip metadata lines before real CSV header (e.g. "File creation date:", title rows)
  const metaEnd = csv.search(/^["']?(COSING\s+Ref|INCI\s*name|Reference\s+[Nn]umber|Chemical\s+name)/im);
  const csvBody = metaEnd > 0 ? csv.slice(metaEnd) : csv;

  return csvParseSync(csvBody, {
    columns: (rawHdrs) => mapHeaders(rawHdrs),
    skip_empty_lines: true,
    relax_quotes: true,
    relax_column_count: true,
    trim: true,
  });
}

app.get('/api/cosing/auto-import', async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const send = (data) => res.write(`data: ${JSON.stringify(data)}\n\n`);

  const insert = db.prepare(`
    INSERT OR IGNORE INTO cosing_ingredients
      (cosing_ref_no, inci_name, cas_no, ec_no, functions, annex, max_conc,
       origin, uv_range, sccs_assessment, sccs_ref, source, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'cosing_full', datetime('now'))
  `);

  let totalImported = 0, totalSkipped = 0;

  try {
    for (let fi = 0; fi < COSING_CSV_FILES.length; fi++) {
      const { file, label, defaultAnnex } = COSING_CSV_FILES[fi];
      send({ status: 'downloading', msg: `[${fi+1}/${COSING_CSV_FILES.length}] Đang tải ${label}...` });

      let response;
      try { response = await fetch(COSING_BASE_URL + file); }
      catch(e) { send({ status: 'warning', msg: `Bỏ qua ${label}: ${e.message}` }); continue; }
      if (!response.ok) { send({ status: 'warning', msg: `Bỏ qua ${label}: HTTP ${response.status}` }); continue; }

      const csv = await response.text();
      send({ status: 'parsing', msg: `${label}: ${(csv.length/1024).toFixed(0)} KB, đang parse...` });

      let records;
      try { records = parseCosIngCsv(csv); }
      catch(e) { send({ status: 'warning', msg: `Bỏ qua ${label}: ${e.message}` }); continue; }

      if (!records.length || !Object.prototype.hasOwnProperty.call(records[0], 'inci_name')) {
        send({ status: 'warning', msg: `Bỏ qua ${label}: không tìm thấy cột INCI` }); continue;
      }

      let fileImported = 0;
      const BATCH = 500;
      for (let start = 0; start < records.length; start += BATCH) {
        const batch = records.slice(start, start + BATCH);
        const tx = db.transaction(() => {
          for (const row of batch) {
            const inci = row.inci_name;
            if (!inci) { totalSkipped++; return; }
            const annex = parseAnnex(row.annex_raw) || row.annex || defaultAnnex || null;
            insert.run(
              row.cosing_ref_no || null, inci,
              row.cas_no || null, row.ec_no || null,
              row.functions || null, annex,
              row.max_conc || null, null, null,
              row.sccs_assessment || null, row.sccs_ref || null,
            );
            fileImported++;
            totalImported++;
          }
        });
        tx();
      }

      const overallPct = Math.round(((fi + 1) / COSING_CSV_FILES.length) * 100);
      send({ status: 'progress', imported: totalImported, skipped: totalSkipped, pct: overallPct,
             msg: `${label}: ${fileImported} thành phần. Tổng: ${totalImported.toLocaleString()}` });
    }

    invalidateInciCache();
    const total = db.prepare('SELECT COUNT(*) as c FROM cosing_ingredients').get().c;
    send({ status: 'done', imported: totalImported, skipped: totalSkipped, total_in_db: total,
           msg: `Hoàn thành! ${totalImported.toLocaleString()} thành phần đã import. Tổng trong DB: ${total.toLocaleString()}` });
  } catch(e) {
    send({ status: 'error', msg: e.message });
  }

  res.end();
});

// ============================================================
// API: MULTI-COUNTRY INGREDIENT DATABASE
// ============================================================

// Column name mappings per country (local language → our field)
const COUNTRY_HEADER_PATTERNS = {
  KR: { local_name: /성분명|원료명|국문|korean_name|한국어/ },
  JP: { local_name: /成分名|原料名|japanese_name|日本語/ },
  CN: { local_name: /成分名称|原料名称|中文名|chinese_name/ },
  VN: { local_name: /tên thành phần|tên nguyên liệu|vietnamese_name|tiếng việt/ },
  US: { local_name: /common_name|trade_name/ },
};

function mapCountryHeader(h, country) {
  const n = h.toLowerCase().replace(/[\s.\-\/\(\)]+/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
  if (/^inci|^name$|^ingredient_name/.test(n)) return 'inci_name';
  if (/^cas/.test(n)) return 'cas_no';
  if (/^ec_no|^ec$|^ec_number/.test(n)) return 'ec_no';
  if (/function|기능|효능|機能|功能/.test(n)) return 'functions';
  if (/max|conc|농도|사용량|기준|最大|浓度|濃度/.test(n)) return 'max_conc';
  if (/product.type|제형|제품|剤型|製品|产品类型/.test(n)) return 'product_type';
  if (/status|허용|금지|restrict|許可|禁止|允许|禁止/.test(n)) return 'status';
  if (/condition|조건|주의|条件|条件|điều kiện/.test(n)) return 'conditions';
  if (/note|비고|remark|備考|备注|ghi chú/.test(n)) return 'notes';
  // Local language name — check per-country patterns first
  const patterns = COUNTRY_HEADER_PATTERNS[country] || {};
  for (const [field, rx] of Object.entries(patterns)) {
    if (rx.test(h.toLowerCase())) return field;
  }
  // Generic local name fallback
  if (/local_name|local name|名称|명칭|tên/.test(n)) return 'local_name';
  return n;
}

// GET /api/country-db/search?country=KR&q=...
app.get('/api/country-db/search', (req, res) => {
  const { q, country, limit: lim } = req.query;
  if (!q || q.trim().length < 2) return res.json([]);
  const term = `%${q.trim()}%`;
  const maxRows = Math.min(parseInt(lim) || 50, 200);
  let sql = `SELECT * FROM country_ingredients WHERE (inci_name LIKE ? OR local_name LIKE ? OR cas_no LIKE ?)`;
  const params = [term, term, term];
  if (country && country !== 'ALL') { sql += ' AND country = ?'; params.push(country); }
  sql += ' ORDER BY country, inci_name ASC LIMIT ?';
  params.push(maxRows);
  res.json(db.prepare(sql).all(...params));
});

// GET /api/country-db/stats — count per country
app.get('/api/country-db/stats', (req, res) => {
  const rows = db.prepare(`
    SELECT country, COUNT(*) as count FROM country_ingredients GROUP BY country ORDER BY country
  `).all();
  res.json(rows);
});

// POST /api/country-db/import  { country: "KR", csv: "...", filename: "..." }
app.post('/api/country-db/import', (req, res) => {
  const { csv, country, filename } = req.body;
  if (!csv || typeof csv !== 'string') return res.status(400).json({ error: 'Missing csv' });
  if (!country) return res.status(400).json({ error: 'Missing country code (e.g. KR, JP, CN, VN, US)' });

  // Skip leading metadata lines
  const metaEnd = csv.search(/^[^\n]{0,120}(inci|성분명|원료명|成分名|名称|name|cas|tên)/im);
  const csvBody = metaEnd >= 0 ? csv.slice(metaEnd) : csv;

  let records;
  try {
    records = csvParseSync(csvBody, {
      columns: true, skip_empty_lines: true,
      relax_quotes: true, relax_column_count: true, trim: true,
    });
  } catch(e) { return res.status(400).json({ error: e.message }); }
  if (!records.length) return res.status(400).json({ error: 'No data rows found' });

  const headers = Object.keys(records[0]);
  const colMap = {};
  for (const h of headers) colMap[h] = mapCountryHeader(h, country);

  const mapped = Object.values(colMap);
  if (!mapped.includes('inci_name') && !mapped.includes('local_name')) {
    return res.status(400).json({
      error: 'No ingredient name column found',
      tip: 'Column must be named "INCI Name", "성분명", "成分名", "tên thành phần", etc.',
      detected_columns: headers,
    });
  }

  const insert = db.prepare(`
    INSERT INTO country_ingredients
      (country, inci_name, local_name, cas_no, ec_no, status, max_conc, functions, product_type, conditions, notes, source, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
  `);

  let imported = 0, skipped = 0;
  const src = filename ? `upload:${filename}` : 'user_upload';
  const tx = db.transaction(() => {
    for (const raw of records) {
      const row = {};
      for (const [h, v] of Object.entries(raw)) {
        const f = colMap[h]; if (f && v) row[f] = v;
      }
      if (!row.inci_name && !row.local_name) { skipped++; continue; }
      insert.run(
        country,
        row.inci_name    || null, row.local_name || null,
        row.cas_no       || null, row.ec_no      || null,
        row.status       || 'allowed',
        row.max_conc     || null, row.functions  || null,
        row.product_type || null, row.conditions || null,
        row.notes        || null, src,
      );
      imported++;
    }
  });
  tx();

  const total = db.prepare('SELECT COUNT(*) as c FROM country_ingredients WHERE country = ?').get(country).c;
  res.json({ imported, skipped, total_in_db: total, country });
});

// DELETE /api/country-db/clear?country=KR  (omit country to clear all)
app.delete('/api/country-db/clear', (req, res) => {
  const { country } = req.query;
  if (country) {
    db.prepare('DELETE FROM country_ingredients WHERE country = ?').run(country);
  } else {
    db.prepare('DELETE FROM country_ingredients').run();
  }
  const rows = db.prepare('SELECT country, COUNT(*) as count FROM country_ingredients GROUP BY country').all();
  res.json({ cleared: country || 'ALL', remaining: rows });
});

// Legacy KR aliases
app.get('/api/kr/search', (req, res) => res.redirect(`/api/country-db/search?country=KR&${new URLSearchParams(req.query)}`));
app.get('/api/kr/stats',  (req, res) => {
  const c = db.prepare("SELECT COUNT(*) as c FROM country_ingredients WHERE country='KR'").get().c;
  res.json({ total: c });
});

app.delete('/api/cosing/clear', (req, res) => {
  const { keep_seed } = req.query;
  if (keep_seed === '1') {
    db.prepare("DELETE FROM cosing_ingredients WHERE source = 'cosing_csv'").run();
  } else {
    db.prepare('DELETE FROM cosing_ingredients').run();
  }
  const total = db.prepare('SELECT COUNT(*) as c FROM cosing_ingredients').get().c;
  res.json({ total_in_db: total });
});

// ============================================================
// NOTEBOOK AI — NotebookLM-style RAG with OpenAI
// ============================================================
const multer  = require('multer');
const OpenAI  = require('openai');
const pdfParse = require('pdf-parse');
const os = require('os');

const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

// Split text into overlapping chunks (~600 chars, 80 char overlap)
function chunkText(text, size = 600, overlap = 80) {
  const chunks = [];
  let start = 0;
  while (start < text.length) {
    chunks.push(text.slice(start, start + size));
    start += size - overlap;
  }
  return chunks;
}

// Extract text from uploaded file buffer
async function extractText(buffer, mimetype, originalname) {
  const ext = originalname.split('.').pop().toLowerCase();
  if (mimetype === 'application/pdf' || ext === 'pdf') {
    const data = await pdfParse(buffer);
    return data.text;
  }
  // txt, md, csv, etc.
  return buffer.toString('utf-8');
}

// Index source chunks into FTS5
function indexSourceChunks(sourceId, notebookId, text) {
  db.prepare('DELETE FROM notebook_chunks_fts WHERE source_id = ?').run(sourceId);
  const chunks = chunkText(text);
  const ins = db.prepare('INSERT INTO notebook_chunks_fts (chunk_text, source_id, notebook_id, chunk_index) VALUES (?, ?, ?, ?)');
  const tx = db.transaction(() => chunks.forEach((c, i) => ins.run(c, sourceId, notebookId, i)));
  tx();
  return chunks.length;
}

// Retrieve top-K relevant chunks for a query
function retrieveChunks(notebookId, query, k = 8) {
  const rows = db.prepare(`
    SELECT f.chunk_text, f.source_id, f.chunk_index,
           s.original_name as source_name
    FROM notebook_chunks_fts f
    JOIN notebook_sources s ON s.id = f.source_id
    WHERE f.notebook_id = ? AND notebook_chunks_fts MATCH ?
    ORDER BY rank
    LIMIT ?
  `).all(notebookId, query.replace(/[^a-zA-ZÀ-ỹ0-9 ]/g, ' ').trim() || '""', k);
  return rows;
}

// ── CRUD Notebooks ──────────────────────────────────────────
app.get('/api/notebooks', (req, res) => {
  const rows = db.prepare(`
    SELECT n.*, COUNT(s.id) as source_count,
           (SELECT COUNT(*) FROM notebook_chats WHERE notebook_id = n.id) as chat_count
    FROM notebooks n
    LEFT JOIN notebook_sources s ON s.notebook_id = n.id
    GROUP BY n.id ORDER BY n.updated_at DESC
  `).all();
  res.json(rows);
});

app.post('/api/notebooks', (req, res) => {
  const id = genId();
  const { title, description } = req.body;
  if (!title) return res.status(400).json({ error: 'title required' });
  db.prepare('INSERT INTO notebooks (id, title, description) VALUES (?, ?, ?)').run(id, title, description || '');
  res.status(201).json(db.prepare('SELECT * FROM notebooks WHERE id = ?').get(id));
});

app.put('/api/notebooks/:id', (req, res) => {
  const { title, description } = req.body;
  db.prepare('UPDATE notebooks SET title=?, description=?, updated_at=? WHERE id=?').run(title, description || '', now(), req.params.id);
  res.json(db.prepare('SELECT * FROM notebooks WHERE id = ?').get(req.params.id));
});

app.delete('/api/notebooks/:id', (req, res) => {
  db.prepare('DELETE FROM notebooks WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// ── Sources ──────────────────────────────────────────────────
app.get('/api/notebooks/:id/sources', (req, res) => {
  const rows = db.prepare('SELECT id, notebook_id, original_name, file_type, file_size, summary, created_at FROM notebook_sources WHERE notebook_id = ? ORDER BY created_at ASC').all(req.params.id);
  res.json(rows);
});

app.post('/api/notebooks/:id/sources', upload.single('file'), async (req, res) => {
  const nb = db.prepare('SELECT id FROM notebooks WHERE id = ?').get(req.params.id);
  if (!nb) return res.status(404).json({ error: 'Notebook not found' });
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  try {
    const text = await extractText(req.file.buffer, req.file.mimetype, req.file.originalname);
    if (!text || text.trim().length < 10) return res.status(400).json({ error: 'Không thể đọc nội dung file' });

    const srcId = genId();
    db.prepare('INSERT INTO notebook_sources (id, notebook_id, filename, original_name, file_type, file_size, content_text) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(srcId, req.params.id, req.file.originalname, req.file.originalname, req.file.mimetype, req.file.size, text);

    const chunkCount = indexSourceChunks(srcId, req.params.id, text);
    db.prepare('UPDATE notebooks SET updated_at=? WHERE id=?').run(now(), req.params.id);

    // Auto-summarize with OpenAI (async, don't block response)
    res.status(201).json({
      id: srcId, notebook_id: req.params.id,
      original_name: req.file.originalname,
      file_type: req.file.mimetype,
      file_size: req.file.size,
      chunks: chunkCount,
    });

    if (process.env.OPENAI_API_KEY) {
      const excerpt = text.slice(0, 3000);
      openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'Tóm tắt ngắn gọn nội dung tài liệu bằng tiếng Việt, tối đa 3 câu.' },
          { role: 'user', content: excerpt },
        ],
        max_tokens: 200,
      }).then(r => {
        const summary = r.choices[0]?.message?.content || '';
        db.prepare('UPDATE notebook_sources SET summary=? WHERE id=?').run(summary, srcId);
      }).catch(() => {});
    }
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/notebooks/:id/sources/:sid', (req, res) => {
  db.prepare('DELETE FROM notebook_chunks_fts WHERE source_id = ?').run(req.params.sid);
  db.prepare('DELETE FROM notebook_sources WHERE id = ? AND notebook_id = ?').run(req.params.sid, req.params.id);
  res.json({ success: true });
});

// ── Chat history ─────────────────────────────────────────────
app.get('/api/notebooks/:id/chats', (req, res) => {
  const rows = db.prepare('SELECT * FROM notebook_chats WHERE notebook_id = ? ORDER BY created_at ASC').all(req.params.id);
  res.json(rows);
});

app.delete('/api/notebooks/:id/chats', (req, res) => {
  db.prepare('DELETE FROM notebook_chats WHERE notebook_id = ?').run(req.params.id);
  res.json({ success: true });
});

// ── Chat (RAG) — SSE streaming ────────────────────────────────
app.post('/api/notebooks/:id/chat', async (req, res) => {
  const { message } = req.body;
  if (!message) return res.status(400).json({ error: 'message required' });
  if (!process.env.OPENAI_API_KEY) return res.status(503).json({ error: 'OPENAI_API_KEY chưa được cấu hình' });

  const nb = db.prepare('SELECT * FROM notebooks WHERE id = ?').get(req.params.id);
  if (!nb) return res.status(404).json({ error: 'Notebook not found' });

  const sourceCount = db.prepare('SELECT COUNT(*) as c FROM notebook_sources WHERE notebook_id = ?').get(req.params.id).c;

  // Save user message
  db.prepare('INSERT INTO notebook_chats (id, notebook_id, role, content) VALUES (?, ?, ?, ?)')
    .run(genId(), req.params.id, 'user', message);

  // Retrieve relevant chunks via FTS
  const chunks = sourceCount > 0 ? retrieveChunks(req.params.id, message) : [];

  // If FTS returns nothing, fall back to first chunks of all sources
  let contextChunks = chunks;
  if (contextChunks.length === 0 && sourceCount > 0) {
    contextChunks = db.prepare(`
      SELECT f.chunk_text, f.source_id, f.chunk_index, s.original_name as source_name
      FROM notebook_chunks_fts f
      JOIN notebook_sources s ON s.id = f.source_id
      WHERE f.notebook_id = ?
      LIMIT 8
    `).all(req.params.id);
  }

  const contextText = contextChunks.length > 0
    ? contextChunks.map((c, i) => `[Nguồn: ${c.source_name}]\n${c.chunk_text}`).join('\n\n---\n\n')
    : '';

  const sourcesUsed = [...new Set(contextChunks.map(c => c.source_name))];

  const systemPrompt = contextText
    ? `Bạn là trợ lý AI phân tích tài liệu. Trả lời bằng tiếng Việt dựa trên các đoạn tài liệu được cung cấp. Nếu câu hỏi không liên quan đến tài liệu, hãy nói rõ.\n\nTài liệu tham khảo:\n${contextText}`
    : `Bạn là trợ lý AI. Notebook này chưa có tài liệu nào. Hãy nhắc người dùng upload tài liệu trước.`;

  // Previous chat (last 6 turns)
  const history = db.prepare('SELECT role, content FROM notebook_chats WHERE notebook_id = ? ORDER BY created_at DESC LIMIT 12').all(req.params.id).reverse();
  const messages = [
    { role: 'system', content: systemPrompt },
    ...history.slice(0, -1).map(h => ({ role: h.role, content: h.content })),
    { role: 'user', content: message },
  ];

  // Stream response via SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const send = (data) => res.write(`data: ${JSON.stringify(data)}\n\n`);

  try {
    const stream = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages,
      stream: true,
      max_tokens: 1500,
    });

    let fullContent = '';
    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content || '';
      if (delta) {
        fullContent += delta;
        send({ type: 'delta', content: delta });
      }
    }

    // Save assistant response
    db.prepare('INSERT INTO notebook_chats (id, notebook_id, role, content, sources_used) VALUES (?, ?, ?, ?, ?)')
      .run(genId(), req.params.id, 'assistant', fullContent, JSON.stringify(sourcesUsed));
    db.prepare('UPDATE notebooks SET updated_at=? WHERE id=?').run(now(), req.params.id);

    send({ type: 'done', sources: sourcesUsed });
    res.end();
  } catch (e) {
    send({ type: 'error', message: e.message });
    res.end();
  }
});

// ── Summary endpoint ─────────────────────────────────────────
app.post('/api/notebooks/:id/summarize', async (req, res) => {
  if (!process.env.OPENAI_API_KEY) return res.status(503).json({ error: 'OPENAI_API_KEY chưa được cấu hình' });
  const sources = db.prepare('SELECT original_name, content_text FROM notebook_sources WHERE notebook_id = ?').all(req.params.id);
  if (!sources.length) return res.status(400).json({ error: 'Chưa có tài liệu nào' });

  const combined = sources.map(s => `## ${s.original_name}\n${s.content_text?.slice(0, 2000)}`).join('\n\n');
  try {
    const r = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'Tóm tắt toàn bộ tài liệu bằng tiếng Việt. Liệt kê các điểm chính dưới dạng bullet points.' },
        { role: 'user', content: combined },
      ],
      max_tokens: 800,
    });
    res.json({ summary: r.choices[0]?.message?.content || '' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ============================================================
// SYSTEM CHAT — AI trả lời câu hỏi về dữ liệu CRM
// POST /api/system-chat  { message, history: [{role,content}] }
// ============================================================

// Tool definitions for OpenAI function calling
const CRM_TOOLS = [
  {
    type: 'function',
    function: {
      name: 'get_dashboard_stats',
      description: 'Lấy thống kê tổng quan hệ thống: số khách hàng, hợp đồng, hồ sơ, doanh thu',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'search_clients',
      description: 'Tìm kiếm khách hàng theo tên, quốc gia, ngành nghề, trạng thái',
      parameters: {
        type: 'object',
        properties: {
          search:   { type: 'string', description: 'Từ khóa tìm tên, người đại diện, email' },
          country:  { type: 'string', description: 'Quốc gia' },
          industry: { type: 'string', description: 'Ngành nghề' },
          status:   { type: 'string', description: 'Trạng thái: Tiềm năng, Đang hoạt động, Không hoạt động' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'search_contracts',
      description: 'Tìm kiếm hợp đồng theo số hợp đồng, loại dịch vụ, trạng thái, trạng thái thanh toán',
      parameters: {
        type: 'object',
        properties: {
          search:         { type: 'string', description: 'Từ khóa tìm số HĐ, tên khách hàng' },
          status:         { type: 'string', description: 'Trạng thái HĐ: Dự thảo, Đang thực hiện, Hoàn thành, Hủy' },
          service_type:   { type: 'string', description: 'Loại dịch vụ' },
          payment_status: { type: 'string', description: 'Thanh toán: Chưa thanh toán, Thanh toán một phần, Đã thanh toán' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'search_cases',
      description: 'Tìm kiếm hồ sơ/giấy phép theo tên, trạng thái, mức độ ưu tiên, người phụ trách',
      parameters: {
        type: 'object',
        properties: {
          search:   { type: 'string', description: 'Từ khóa tìm tên hồ sơ, khách hàng, người phụ trách' },
          status:   { type: 'string', description: 'Trạng thái: Tiếp nhận, Đang xử lý, Chờ bổ sung, Đã cấp phép, Từ chối' },
          priority: { type: 'string', description: 'Ưu tiên: Cao, Trung bình, Thấp' },
          assignee: { type: 'string', description: 'Tên người phụ trách' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_upcoming_deadlines',
      description: 'Lấy danh sách hồ sơ sắp đến hạn trong N ngày tới',
      parameters: {
        type: 'object',
        properties: {
          days: { type: 'integer', description: 'Số ngày tới (mặc định 30)', default: 30 },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_client_detail',
      description: 'Lấy thông tin chi tiết một khách hàng cùng danh sách hợp đồng',
      parameters: {
        type: 'object',
        properties: {
          client_id: { type: 'string', description: 'ID khách hàng' },
        },
        required: ['client_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_revenue_report',
      description: 'Báo cáo doanh thu: tổng giá trị HĐ, đã thu, còn nợ, theo dịch vụ / quốc gia',
      parameters: { type: 'object', properties: {} },
    },
  },
];

// Execute a CRM tool call
function executeCrmTool(name, args) {
  switch (name) {
    case 'get_dashboard_stats': {
      return {
        clients: {
          total:     db.prepare('SELECT COUNT(*) as c FROM clients').get().c,
          active:    db.prepare("SELECT COUNT(*) as c FROM clients WHERE status='Đang hoạt động'").get().c,
          potential: db.prepare("SELECT COUNT(*) as c FROM clients WHERE status='Tiềm năng'").get().c,
          by_country: db.prepare('SELECT country, COUNT(*) as count FROM clients GROUP BY country ORDER BY count DESC LIMIT 8').all(),
        },
        contracts: {
          total:       db.prepare('SELECT COUNT(*) as c FROM contracts').get().c,
          active:      db.prepare("SELECT COUNT(*) as c FROM contracts WHERE status='Đang thực hiện'").get().c,
          total_value: db.prepare('SELECT COALESCE(SUM(value),0) as v FROM contracts').get().v,
          total_paid:  db.prepare('SELECT COALESCE(SUM(paid_amount),0) as v FROM contracts').get().v,
          unpaid:      db.prepare("SELECT COUNT(*) as c FROM contracts WHERE payment_status='Chưa thanh toán'").get().c,
        },
        cases: {
          total:  db.prepare('SELECT COUNT(*) as c FROM cases').get().c,
          active: db.prepare("SELECT COUNT(*) as c FROM cases WHERE status NOT IN ('Đã cấp phép','Từ chối')").get().c,
          urgent: db.prepare("SELECT COUNT(*) as c FROM cases WHERE priority='Cao' AND status NOT IN ('Đã cấp phép','Từ chối')").get().c,
        },
      };
    }

    case 'search_clients': {
      let sql = 'SELECT id, name, country, industry, representative, email, phone, investment_capital, status FROM clients WHERE 1=1';
      const p = [];
      if (args.country)  { sql += ' AND country = ?';  p.push(args.country); }
      if (args.industry) { sql += ' AND industry = ?'; p.push(args.industry); }
      if (args.status)   { sql += ' AND status = ?';   p.push(args.status); }
      if (args.search)   { sql += ' AND (name LIKE ? OR representative LIKE ? OR email LIKE ?)'; p.push(`%${args.search}%`, `%${args.search}%`, `%${args.search}%`); }
      sql += ' ORDER BY created_at DESC LIMIT 20';
      return db.prepare(sql).all(...p);
    }

    case 'search_contracts': {
      let sql = `SELECT c.id, c.contract_no, c.service_type, c.value, c.paid_amount, c.status, c.payment_status, c.start_date, c.end_date, cl.name as client_name
                 FROM contracts c LEFT JOIN clients cl ON c.client_id = cl.id WHERE 1=1`;
      const p = [];
      if (args.status)         { sql += ' AND c.status = ?';         p.push(args.status); }
      if (args.service_type)   { sql += ' AND c.service_type = ?';   p.push(args.service_type); }
      if (args.payment_status) { sql += ' AND c.payment_status = ?'; p.push(args.payment_status); }
      if (args.search)         { sql += ' AND (c.contract_no LIKE ? OR cl.name LIKE ?)'; p.push(`%${args.search}%`, `%${args.search}%`); }
      sql += ' ORDER BY c.created_at DESC LIMIT 20';
      return db.prepare(sql).all(...p);
    }

    case 'search_cases': {
      let sql = `SELECT cs.id, cs.case_name, cs.service_type, cs.status, cs.priority, cs.assignee,
                        cs.start_date, cs.deadline, cs.progress, cl.name as client_name, ct.contract_no
                 FROM cases cs
                 LEFT JOIN contracts ct ON cs.contract_id = ct.id
                 LEFT JOIN clients cl ON ct.client_id = cl.id WHERE 1=1`;
      const p = [];
      if (args.status)   { sql += ' AND cs.status = ?';   p.push(args.status); }
      if (args.priority) { sql += ' AND cs.priority = ?'; p.push(args.priority); }
      if (args.assignee) { sql += ' AND cs.assignee LIKE ?'; p.push(`%${args.assignee}%`); }
      if (args.search)   { sql += ' AND (cs.case_name LIKE ? OR cl.name LIKE ? OR cs.assignee LIKE ?)'; p.push(`%${args.search}%`, `%${args.search}%`, `%${args.search}%`); }
      sql += ' ORDER BY cs.deadline ASC LIMIT 20';
      return db.prepare(sql).all(...p);
    }

    case 'get_upcoming_deadlines': {
      const days = args.days || 30;
      return db.prepare(`
        SELECT cs.case_name, cs.status, cs.priority, cs.assignee, cs.deadline, cs.progress,
               cl.name as client_name, ct.contract_no
        FROM cases cs
        LEFT JOIN contracts ct ON cs.contract_id = ct.id
        LEFT JOIN clients cl ON ct.client_id = cl.id
        WHERE cs.deadline IS NOT NULL
          AND cs.status NOT IN ('Đã cấp phép','Từ chối')
          AND cs.deadline >= date('now')
          AND cs.deadline <= date('now', '+' || ? || ' days')
        ORDER BY cs.deadline ASC
      `).all(days);
    }

    case 'get_client_detail': {
      const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(args.client_id);
      if (!client) return { error: 'Không tìm thấy khách hàng' };
      const contracts = db.prepare('SELECT id, contract_no, service_type, value, paid_amount, status, payment_status FROM contracts WHERE client_id = ? ORDER BY created_at DESC').all(args.client_id);
      return { ...client, contracts };
    }

    case 'get_revenue_report': {
      return {
        total_value:   db.prepare('SELECT COALESCE(SUM(value),0) as v FROM contracts').get().v,
        total_paid:    db.prepare('SELECT COALESCE(SUM(paid_amount),0) as v FROM contracts').get().v,
        total_debt:    db.prepare('SELECT COALESCE(SUM(value - paid_amount),0) as v FROM contracts WHERE status != \'Hủy\'').get().v,
        by_service:    db.prepare('SELECT service_type, COUNT(*) as count, SUM(value) as total, SUM(paid_amount) as paid FROM contracts GROUP BY service_type ORDER BY total DESC').all(),
        by_country:    db.prepare('SELECT cl.country, SUM(ct.value) as total, SUM(ct.paid_amount) as paid FROM contracts ct LEFT JOIN clients cl ON ct.client_id = cl.id GROUP BY cl.country ORDER BY total DESC').all(),
        by_status:     db.prepare('SELECT status, COUNT(*) as count, SUM(value) as total FROM contracts GROUP BY status').all(),
      };
    }

    default:
      return { error: `Unknown tool: ${name}` };
  }
}

app.post('/api/system-chat', async (req, res) => {
  const { message, history = [] } = req.body;
  if (!message) return res.status(400).json({ error: 'message required' });
  if (!openai)  return res.status(503).json({ error: 'OPENAI_API_KEY chưa được cấu hình' });

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  const send = d => res.write(`data: ${JSON.stringify(d)}\n\n`);

  const systemPrompt = `Bạn là trợ lý AI của OCEAN AI CRM — hệ thống quản lý khách hàng tư vấn đầu tư FDI vào Việt Nam.
Nhiệm vụ: trả lời nhanh các câu hỏi về khách hàng, hợp đồng, hồ sơ giấy phép, doanh thu trong hệ thống.
Luôn trả lời bằng tiếng Việt, ngắn gọn và có số liệu cụ thể.
Khi cần dữ liệu hãy gọi tool phù hợp. Có thể gọi nhiều tool liên tiếp nếu cần.
Hôm nay: ${new Date().toLocaleDateString('vi-VN')}.`;

  const messages = [
    { role: 'system', content: systemPrompt },
    ...history.slice(-10),
    { role: 'user', content: message },
  ];

  try {
    // Agentic loop: let AI call tools until it has enough data
    let loopMsgs = [...messages];
    for (let iter = 0; iter < 5; iter++) {
      const resp = await openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        messages: loopMsgs,
        tools: CRM_TOOLS,
        tool_choice: 'auto',
      });

      const choice = resp.choices[0];
      loopMsgs.push(choice.message);

      if (choice.finish_reason === 'tool_calls') {
        // Execute all tool calls
        for (const tc of choice.message.tool_calls) {
          const args = JSON.parse(tc.function.arguments || '{}');
          send({ type: 'tool', name: tc.function.name });
          const result = executeCrmTool(tc.function.name, args);
          loopMsgs.push({ role: 'tool', tool_call_id: tc.id, content: JSON.stringify(result) });
        }
        continue; // next iteration to get final answer
      }

      // Final answer — stream it
      const finalContent = choice.message.content || '';
      // Stream word by word for smoothness
      const words = finalContent.split(/(?<=\s)/);
      for (const w of words) {
        send({ type: 'delta', content: w });
        await new Promise(r => setTimeout(r, 8));
      }
      send({ type: 'done' });
      res.end();
      return;
    }

    send({ type: 'error', message: 'Quá nhiều bước xử lý, thử lại.' });
    res.end();
  } catch (e) {
    send({ type: 'error', message: e.message });
    res.end();
  }
});

// Serve frontend for all non-API routes
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) return notFound(req, res);
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// ── Global error handler (must be last) ─────────────────────
app.use(errorHandler);

app.listen(PORT, '0.0.0.0', () => {
  logger.info(`OCEAN AI CRM v2.0 running on port ${PORT}`);
  logger.info(`Dashboard: http://localhost:${PORT}`);
});

module.exports = app;
