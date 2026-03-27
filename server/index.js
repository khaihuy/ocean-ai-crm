require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const crypto = require('crypto');
const { parse: csvParseSync } = require('csv-parse/sync');
const db = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

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
app.get('/api/cosing/search', (req, res) => {
  const { q, annex, limit: lim } = req.query;
  if (!q || q.trim().length < 2) return res.json([]);
  const term = `%${q.trim()}%`;
  const maxRows = Math.min(parseInt(lim) || 50, 200);
  let sql = `SELECT * FROM cosing_ingredients WHERE (inci_name LIKE ? OR cas_no LIKE ? OR functions LIKE ?)`;
  const params = [term, term, term];
  if (annex && annex !== 'all') { sql += ' AND annex = ?'; params.push(annex); }
  sql += ' ORDER BY inci_name ASC LIMIT ?';
  params.push(maxRows);
  res.json(db.prepare(sql).all(...params));
});

app.get('/api/cosing/stats', (req, res) => {
  res.json({
    total: db.prepare('SELECT COUNT(*) as c FROM cosing_ingredients').get().c,
    by_annex: db.prepare("SELECT annex, COUNT(*) as count FROM cosing_ingredients GROUP BY annex ORDER BY count DESC").all(),
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

    const total = db.prepare('SELECT COUNT(*) as c FROM cosing_ingredients').get().c;
    send({ status: 'done', imported: totalImported, skipped: totalSkipped, total_in_db: total,
           msg: `Hoàn thành! ${totalImported.toLocaleString()} thành phần đã import. Tổng trong DB: ${total.toLocaleString()}` });
  } catch(e) {
    send({ status: 'error', msg: e.message });
  }

  res.end();
});

// ============================================================
// API: KOREAN MFDS INGREDIENT DATABASE
// ============================================================

// GET /api/kr/search?q=...
app.get('/api/kr/search', (req, res) => {
  const { q, limit: lim } = req.query;
  if (!q || q.trim().length < 2) return res.json([]);
  const term = `%${q.trim()}%`;
  const maxRows = Math.min(parseInt(lim) || 50, 200);
  const rows = db.prepare(`
    SELECT * FROM kr_ingredients
    WHERE inci_name LIKE ? OR kr_name LIKE ? OR cas_no LIKE ?
    ORDER BY inci_name ASC LIMIT ?
  `).all(term, term, term, maxRows);
  res.json(rows);
});

// GET /api/kr/stats
app.get('/api/kr/stats', (req, res) => {
  const total = db.prepare('SELECT COUNT(*) as c FROM kr_ingredients').get().c;
  res.json({ total });
});

// POST /api/kr/import-csv  { csv: "...", filename: "..." }
// Accepts MFDS CSV export — auto-detects columns
app.post('/api/kr/import-csv', (req, res) => {
  const { csv, filename } = req.body;
  if (!csv || typeof csv !== 'string') {
    return res.status(400).json({ error: 'Body must be { csv: "..." }' });
  }

  // Skip metadata lines
  const metaEnd = csv.search(/^[^\n]{0,80}(inci|성분명|원료명|name|cas)/im);
  const csvBody = metaEnd >= 0 ? csv.slice(metaEnd) : csv;

  let records;
  try {
    records = csvParseSync(csvBody, {
      columns: true,
      skip_empty_lines: true,
      relax_quotes: true,
      relax_column_count: true,
      trim: true,
    });
  } catch(e) {
    return res.status(400).json({ error: e.message });
  }

  if (!records.length) return res.status(400).json({ error: 'No data rows found' });

  // Map header → our column
  function mapKrHeader(h) {
    const n = h.toLowerCase().replace(/[\s.\-\/\(\)]+/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
    if (/inci|^name$|^ingredient/.test(n)) return 'inci_name';
    if (/한국|국문|kr_name|korean_name|성분명|원료명/.test(n)) return 'kr_name';
    if (/^cas/.test(n)) return 'cas_no';
    if (/function|기능|효능/.test(n)) return 'functions';
    if (/max|conc|농도|사용량|기준/.test(n)) return 'max_conc';
    if (/product|제형|제품/.test(n)) return 'product_type';
    if (/status|허용|금지|restrict/.test(n)) return 'status';
    if (/condition|조건|주의/.test(n)) return 'conditions';
    if (/note|비고|remark/.test(n)) return 'notes';
    return n;
  }

  const headers = Object.keys(records[0]);
  const colMap = {};
  for (const h of headers) colMap[h] = mapKrHeader(h);

  // Need at least one name column
  const hasMappedInci = Object.values(colMap).includes('inci_name');
  const hasMappedKr   = Object.values(colMap).includes('kr_name');
  if (!hasMappedInci && !hasMappedKr) {
    return res.status(400).json({
      error: 'No ingredient name column found. Add a column named "INCI Name", "성분명", or "원료명".',
      detected_columns: headers,
    });
  }

  const insert = db.prepare(`
    INSERT OR REPLACE INTO kr_ingredients
      (inci_name, kr_name, cas_no, status, max_conc, functions, product_type, conditions, notes, source, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'mfds_upload', datetime('now'))
  `);

  let imported = 0, skipped = 0;
  const tx = db.transaction(() => {
    for (const raw of records) {
      const row = {};
      for (const [h, v] of Object.entries(raw)) {
        const mapped = colMap[h];
        if (mapped && v) row[mapped] = v;
      }

      const inci = row.inci_name || null;
      const kr   = row.kr_name   || null;
      if (!inci && !kr) { skipped++; continue; }

      insert.run(
        inci, kr,
        row.cas_no    || null,
        row.status    || 'allowed',
        row.max_conc  || null,
        row.functions || null,
        row.product_type || null,
        row.conditions   || null,
        row.notes        || null,
      );
      imported++;
    }
  });
  tx();

  const total = db.prepare('SELECT COUNT(*) as c FROM kr_ingredients').get().c;
  res.json({ imported, skipped, total_in_db: total });
});

// DELETE /api/kr/clear
app.delete('/api/kr/clear', (req, res) => {
  db.prepare('DELETE FROM kr_ingredients').run();
  res.json({ total_in_db: 0 });
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

// Serve frontend for all non-API routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 OCEAN AI CRM running on port ${PORT}`);
  console.log(`📊 Dashboard: http://localhost:${PORT}`);
});

module.exports = app;
