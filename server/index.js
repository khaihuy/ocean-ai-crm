require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const crypto = require('crypto');
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

// Serve frontend for all non-API routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 OCEAN AI CRM running on port ${PORT}`);
  console.log(`📊 Dashboard: http://localhost:${PORT}`);
});

module.exports = app;
