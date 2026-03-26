const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'crm.db');

// Ensure data directory exists
const fs = require('fs');
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ============================================================
// DATABASE SCHEMA
// ============================================================
db.exec(`
  -- Khách hàng FDI
  CREATE TABLE IF NOT EXISTS clients (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    country TEXT,
    industry TEXT,
    representative TEXT,
    email TEXT,
    phone TEXT,
    investment_capital REAL DEFAULT 0,
    address TEXT,
    notes TEXT,
    status TEXT DEFAULT 'Tiềm năng',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  -- Hợp đồng
  CREATE TABLE IF NOT EXISTS contracts (
    id TEXT PRIMARY KEY,
    client_id TEXT NOT NULL,
    contract_no TEXT UNIQUE,
    service_type TEXT,
    value REAL DEFAULT 0,
    start_date TEXT,
    end_date TEXT,
    status TEXT DEFAULT 'Dự thảo',
    payment_status TEXT DEFAULT 'Chưa thanh toán',
    paid_amount REAL DEFAULT 0,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
  );

  -- Hồ sơ / Giấy phép
  CREATE TABLE IF NOT EXISTS cases (
    id TEXT PRIMARY KEY,
    contract_id TEXT,
    case_name TEXT NOT NULL,
    service_type TEXT,
    status TEXT DEFAULT 'Tiếp nhận',
    priority TEXT DEFAULT 'Trung bình',
    assignee TEXT,
    start_date TEXT,
    deadline TEXT,
    notes TEXT,
    progress INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE SET NULL
  );

  -- Thanh toán
  CREATE TABLE IF NOT EXISTS payments (
    id TEXT PRIMARY KEY,
    contract_id TEXT NOT NULL,
    amount REAL NOT NULL,
    payment_date TEXT,
    method TEXT,
    reference_no TEXT,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE CASCADE
  );

  -- Hoạt động / Lịch sử
  CREATE TABLE IF NOT EXISTS activities (
    id TEXT PRIMARY KEY,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    action TEXT NOT NULL,
    description TEXT,
    user_name TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  -- Indexes
  CREATE INDEX IF NOT EXISTS idx_clients_country ON clients(country);
  CREATE INDEX IF NOT EXISTS idx_clients_status ON clients(status);
  CREATE INDEX IF NOT EXISTS idx_contracts_client ON contracts(client_id);
  CREATE INDEX IF NOT EXISTS idx_contracts_status ON contracts(status);
  CREATE INDEX IF NOT EXISTS idx_cases_contract ON cases(contract_id);
  CREATE INDEX IF NOT EXISTS idx_cases_status ON cases(status);
  CREATE INDEX IF NOT EXISTS idx_cases_deadline ON cases(deadline);
  CREATE INDEX IF NOT EXISTS idx_payments_contract ON payments(contract_id);
  CREATE INDEX IF NOT EXISTS idx_activities_entity ON activities(entity_type, entity_id);
`);

// ============================================================
// SEED SAMPLE DATA
// ============================================================
const clientCount = db.prepare('SELECT COUNT(*) as count FROM clients').get().count;
if (clientCount === 0) {
  const insertClient = db.prepare(`INSERT INTO clients (id, name, country, industry, representative, email, phone, investment_capital, address, notes, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  const insertContract = db.prepare(`INSERT INTO contracts (id, client_id, contract_no, service_type, value, start_date, end_date, status, payment_status, paid_amount, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  const insertCase = db.prepare(`INSERT INTO cases (id, contract_id, case_name, service_type, status, priority, assignee, start_date, deadline, notes, progress) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);

  const tx = db.transaction(() => {
    // Clients
    const c1 = 'cl_001'; insertClient.run(c1, 'ABC Technology Co., Ltd', 'Nhật Bản', 'Công nghệ thông tin', 'Tanaka Hiroshi', 'tanaka@abc-tech.jp', '+81-3-1234-5678', 5000000, 'Tokyo, Japan', 'Quan tâm mở VPĐD tại TP.HCM', 'Đang hoạt động', '2024-06-15');
    const c2 = 'cl_002'; insertClient.run(c2, 'Korea Foods Import JSC', 'Hàn Quốc', 'Thực phẩm & Đồ uống', 'Park Joon', 'park@kfoods.kr', '+82-2-9876-5432', 2000000, 'Seoul, Korea', 'Cần công bố ATTP cho 15 sản phẩm', 'Đang hoạt động', '2024-08-20');
    const c3 = 'cl_003'; insertClient.run(c3, 'Dragon Chemical Trading', 'Trung Quốc', 'Hóa chất', 'Wang Wei', 'wang@dragon-chem.cn', '+86-21-5555-1234', 8000000, 'Shanghai, China', 'GP nhập khẩu hóa chất + IRC', 'Tiềm năng', '2025-01-10');
    const c4 = 'cl_004'; insertClient.run(c4, 'Singapore Beauty Pte Ltd', 'Singapore', 'Mỹ phẩm', 'Lim Mei Ling', 'lim@sgbeauty.sg', '+65-6789-0123', 1500000, 'Singapore', 'Công bố 30 sản phẩm mỹ phẩm nhập khẩu', 'Đang hoạt động', '2025-02-05');
    const c5 = 'cl_005'; insertClient.run(c5, 'German Education GmbH', 'Đức', 'Giáo dục', 'Hans Mueller', 'mueller@ger-edu.de', '+49-30-1234-5678', 3000000, 'Berlin, Germany', 'Mở trung tâm giáo dục quốc tế tại Hà Nội', 'Tiềm năng', '2025-03-01');
    const c6 = 'cl_006'; insertClient.run(c6, 'Taiwan Semiconductor VN', 'Đài Loan', 'Sản xuất', 'Chen Ming', 'chen@tw-semi.tw', '+886-2-8888-7777', 50000000, 'Taipei, Taiwan', 'Dự án nhà máy sản xuất tại KCN Long Hậu', 'Đang hoạt động', '2024-03-20');

    // Contracts
    const ct1 = 'ct_001'; insertContract.run(ct1, c1, 'HĐ-2024-001', 'Giấy chứng nhận đầu tư (IRC)', 85000000, '2024-07-01', '2024-12-31', 'Hoàn thành', 'Đã thanh toán', 85000000, 'IRC cho VPĐD tại TP.HCM');
    const ct2 = 'ct_002'; insertContract.run(ct2, c2, 'HĐ-2024-002', 'Công bố chất lượng thực phẩm nhập khẩu', 120000000, '2024-09-01', '2025-03-31', 'Đang thực hiện', 'Thanh toán một phần', 60000000, '15 sản phẩm thực phẩm nhập khẩu');
    const ct3 = 'ct_003'; insertContract.run(ct3, c3, 'HĐ-2025-003', 'Giấy phép con - Kinh doanh hóa chất', 150000000, '2025-01-15', '2025-06-30', 'Đang thực hiện', 'Thanh toán một phần', 75000000, 'GP kinh doanh hóa chất + tư vấn pháp lý');
    const ct4 = 'ct_004'; insertContract.run(ct4, c4, 'HĐ-2025-004', 'Công bố mỹ phẩm nhập khẩu', 200000000, '2025-02-10', '2025-08-10', 'Đang thực hiện', 'Chưa thanh toán', 0, '30 sản phẩm mỹ phẩm');
    const ct5 = 'ct_005'; insertContract.run(ct5, c5, 'HĐ-2025-005', 'Giấy phép con - Giáo dục', 180000000, '2025-03-05', '2025-09-05', 'Dự thảo', 'Chưa thanh toán', 0, 'GP trung tâm giáo dục quốc tế');
    const ct6 = 'ct_006'; insertContract.run(ct6, c6, 'HĐ-2024-006', 'Giấy chứng nhận đầu tư (IRC)', 350000000, '2024-04-01', '2025-04-01', 'Đang thực hiện', 'Thanh toán một phần', 250000000, 'IRC + ERC + GP xây dựng nhà máy');

    // Cases
    insertCase.run('cs_001', ct2, 'Công bố SP Kimchi đóng hộp', 'Công bố chất lượng thực phẩm nhập khẩu', 'Đang xử lý', 'Cao', 'Nguyễn Văn A', '2024-09-15', '2025-01-15', 'Đã nộp hồ sơ, đang chờ kết quả kiểm nghiệm', 65);
    insertCase.run('cs_002', ct2, 'Công bố SP Mì ăn liền Hàn Quốc', 'Công bố chất lượng thực phẩm nhập khẩu', 'Chờ bổ sung', 'Cao', 'Nguyễn Văn A', '2024-10-01', '2025-02-01', 'Cần bổ sung CoA và phiếu kiểm nghiệm', 40);
    insertCase.run('cs_003', ct3, 'GP kinh doanh hóa chất nguy hiểm', 'Giấy phép con - Kinh doanh hóa chất', 'Đang xử lý', 'Cao', 'Trần Thị B', '2025-01-20', '2025-04-20', 'Đã nộp hồ sơ tại Bộ Công Thương', 50);
    insertCase.run('cs_004', ct4, 'Công bố lô mỹ phẩm dưỡng da', 'Công bố mỹ phẩm nhập khẩu', 'Tiếp nhận', 'Trung bình', 'Lê Văn C', '2025-02-15', '2025-05-15', '10 sản phẩm serum và kem dưỡng', 15);
    insertCase.run('cs_005', ct5, 'GP thành lập trung tâm GD quốc tế', 'Giấy phép con - Giáo dục', 'Tiếp nhận', 'Trung bình', 'Phạm Thị D', '2025-03-10', '2025-07-10', 'Đang chuẩn bị hồ sơ xin GP', 10);
    insertCase.run('cs_006', ct6, 'IRC dự án nhà máy bán dẫn', 'Giấy chứng nhận đầu tư (IRC)', 'Đã cấp phép', 'Cao', 'Nguyễn Văn A', '2024-04-15', '2024-10-15', 'Đã nhận IRC, chuyển sang giai đoạn ERC', 100);
  });
  tx();
  console.log('✅ Database seeded with sample data');
}

module.exports = db;
