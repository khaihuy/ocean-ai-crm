require('dotenv').config();
const db = require('./db');
const logger = require('./logger');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

const genId = () => crypto.randomUUID().replace(/-/g, '').slice(0, 12);

async function initSchema() {
  // Clients
  await db.run(`
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
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  // Contracts
  await db.run(`
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
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
    )
  `);

  // Cases
  await db.run(`
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
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE SET NULL
    )
  `);

  // Payments
  await db.run(`
    CREATE TABLE IF NOT EXISTS payments (
      id TEXT PRIMARY KEY,
      contract_id TEXT NOT NULL,
      amount REAL NOT NULL,
      payment_date TEXT,
      method TEXT,
      reference_no TEXT,
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE CASCADE
    )
  `);

  // Activities
  await db.run(`
    CREATE TABLE IF NOT EXISTS activities (
      id TEXT PRIMARY KEY,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      action TEXT NOT NULL,
      description TEXT,
      user_name TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  // Users
  await db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      full_name TEXT,
      role TEXT NOT NULL DEFAULT 'staff',
      is_active INTEGER NOT NULL DEFAULT 1,
      last_login TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  // CosIng EU ingredients
  await db.run(`
    CREATE TABLE IF NOT EXISTS cosing_ingredients (
      id SERIAL PRIMARY KEY,
      cosing_ref_no TEXT,
      inci_name TEXT NOT NULL,
      cas_no TEXT,
      ec_no TEXT,
      functions TEXT,
      annex TEXT,
      max_conc TEXT,
      origin TEXT,
      uv_range TEXT,
      sccs_assessment TEXT,
      sccs_ref TEXT,
      source TEXT DEFAULT 'offline_cache',
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  // Country regulations
  await db.run(`
    CREATE TABLE IF NOT EXISTS country_regs (
      id SERIAL PRIMARY KEY,
      inci_name TEXT NOT NULL,
      country TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'not_listed',
      max_conc TEXT,
      conditions TEXT,
      source_ref TEXT,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  // Multi-country ingredient database
  await db.run(`
    CREATE TABLE IF NOT EXISTS country_ingredients (
      id SERIAL PRIMARY KEY,
      country TEXT NOT NULL,
      inci_name TEXT,
      local_name TEXT,
      cas_no TEXT,
      ec_no TEXT,
      status TEXT DEFAULT 'allowed',
      max_conc TEXT,
      functions TEXT,
      product_type TEXT,
      conditions TEXT,
      notes TEXT,
      source TEXT DEFAULT 'user_upload',
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  // Notebooks
  await db.run(`
    CREATE TABLE IF NOT EXISTS notebooks (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await db.run(`
    CREATE TABLE IF NOT EXISTS notebook_sources (
      id TEXT PRIMARY KEY,
      notebook_id TEXT NOT NULL,
      filename TEXT NOT NULL,
      original_name TEXT NOT NULL,
      file_type TEXT,
      file_size INTEGER DEFAULT 0,
      content_text TEXT,
      summary TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      FOREIGN KEY (notebook_id) REFERENCES notebooks(id) ON DELETE CASCADE
    )
  `);

  await db.run(`
    CREATE TABLE IF NOT EXISTS notebook_chats (
      id TEXT PRIMARY KEY,
      notebook_id TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      sources_used TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      FOREIGN KEY (notebook_id) REFERENCES notebooks(id) ON DELETE CASCADE
    )
  `);

  // notebook_chunks: replaces FTS5 with tsvector + GIN index
  await db.run(`
    CREATE TABLE IF NOT EXISTS notebook_chunks (
      id SERIAL PRIMARY KEY,
      chunk_text TEXT,
      source_id TEXT,
      notebook_id TEXT,
      chunk_index INT,
      tsv tsvector GENERATED ALWAYS AS (to_tsvector('english', coalesce(chunk_text, ''))) STORED
    )
  `);

  // Indexes
  await db.run(`CREATE INDEX IF NOT EXISTS idx_clients_country ON clients(country)`);
  await db.run(`CREATE INDEX IF NOT EXISTS idx_clients_status ON clients(status)`);
  await db.run(`CREATE INDEX IF NOT EXISTS idx_contracts_client ON contracts(client_id)`);
  await db.run(`CREATE INDEX IF NOT EXISTS idx_contracts_status ON contracts(status)`);
  await db.run(`CREATE INDEX IF NOT EXISTS idx_cases_contract ON cases(contract_id)`);
  await db.run(`CREATE INDEX IF NOT EXISTS idx_cases_status ON cases(status)`);
  await db.run(`CREATE INDEX IF NOT EXISTS idx_cases_deadline ON cases(deadline)`);
  await db.run(`CREATE INDEX IF NOT EXISTS idx_payments_contract ON payments(contract_id)`);
  await db.run(`CREATE INDEX IF NOT EXISTS idx_activities_entity ON activities(entity_type, entity_id)`);
  await db.run(`CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)`);
  await db.run(`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`);
  await db.run(`CREATE INDEX IF NOT EXISTS idx_cosing_inci ON cosing_ingredients(inci_name)`);
  await db.run(`CREATE INDEX IF NOT EXISTS idx_cosing_cas ON cosing_ingredients(cas_no)`);
  await db.run(`CREATE UNIQUE INDEX IF NOT EXISTS idx_cosing_inci_unique ON cosing_ingredients(LOWER(TRIM(inci_name)))`);
  await db.run(`CREATE INDEX IF NOT EXISTS idx_creg_inci ON country_regs(LOWER(inci_name))`);
  await db.run(`CREATE UNIQUE INDEX IF NOT EXISTS idx_creg_unique ON country_regs(LOWER(TRIM(inci_name)), country)`);
  await db.run(`CREATE INDEX IF NOT EXISTS idx_cingr_country ON country_ingredients(country)`);
  await db.run(`CREATE INDEX IF NOT EXISTS idx_cingr_inci ON country_ingredients(country, LOWER(inci_name))`);
  await db.run(`CREATE INDEX IF NOT EXISTS idx_cingr_local ON country_ingredients(country, local_name)`);
  await db.run(`CREATE INDEX IF NOT EXISTS idx_nb_sources ON notebook_sources(notebook_id)`);
  await db.run(`CREATE INDEX IF NOT EXISTS idx_nb_chats ON notebook_chats(notebook_id)`);
  await db.run(`CREATE INDEX IF NOT EXISTS idx_nb_chunks_notebook ON notebook_chunks(notebook_id)`);
  await db.run(`CREATE INDEX IF NOT EXISTS idx_nb_chunks_source ON notebook_chunks(source_id)`);
  await db.run(`CREATE INDEX IF NOT EXISTS idx_nb_chunks_tsv ON notebook_chunks USING GIN(tsv)`);

  logger.info('Database schema initialized');
}

async function seedDefaultAdmin() {
  const row = await db.get('SELECT COUNT(*) as c FROM users');
  const count = parseInt(row.c, 10);
  if (count === 0) {
    const hash = await bcrypt.hash('Admin@123', 12);
    await db.run(
      'INSERT INTO users (id, username, email, password_hash, full_name, role) VALUES (?, ?, ?, ?, ?, ?)',
      [genId(), 'admin', 'admin@ocean-ai.vn', hash, 'Quản trị viên', 'admin']
    );
    logger.info('Default admin account created: admin / Admin@123');
  }
}

async function seedSampleData() {
  const row = await db.get('SELECT COUNT(*) as count FROM clients');
  const clientCount = parseInt(row.count, 10);
  if (clientCount > 0) return;

  await db.transaction(async (t) => {
    // Clients
    const c1 = 'cl_001';
    await t.run(
      `INSERT INTO clients (id, name, country, industry, representative, email, phone, investment_capital, address, notes, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [c1, 'ABC Technology Co., Ltd', 'Nhật Bản', 'Công nghệ thông tin', 'Tanaka Hiroshi', 'tanaka@abc-tech.jp', '+81-3-1234-5678', 5000000, 'Tokyo, Japan', 'Quan tâm mở VPĐD tại TP.HCM', 'Đang hoạt động', '2024-06-15']
    );

    const c2 = 'cl_002';
    await t.run(
      `INSERT INTO clients (id, name, country, industry, representative, email, phone, investment_capital, address, notes, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [c2, 'Korea Foods Import JSC', 'Hàn Quốc', 'Thực phẩm & Đồ uống', 'Park Joon', 'park@kfoods.kr', '+82-2-9876-5432', 2000000, 'Seoul, Korea', 'Cần công bố ATTP cho 15 sản phẩm', 'Đang hoạt động', '2024-08-20']
    );

    const c3 = 'cl_003';
    await t.run(
      `INSERT INTO clients (id, name, country, industry, representative, email, phone, investment_capital, address, notes, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [c3, 'Dragon Chemical Trading', 'Trung Quốc', 'Hóa chất', 'Wang Wei', 'wang@dragon-chem.cn', '+86-21-5555-1234', 8000000, 'Shanghai, China', 'GP nhập khẩu hóa chất + IRC', 'Tiềm năng', '2025-01-10']
    );

    const c4 = 'cl_004';
    await t.run(
      `INSERT INTO clients (id, name, country, industry, representative, email, phone, investment_capital, address, notes, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [c4, 'Singapore Beauty Pte Ltd', 'Singapore', 'Mỹ phẩm', 'Lim Mei Ling', 'lim@sgbeauty.sg', '+65-6789-0123', 1500000, 'Singapore', 'Công bố 30 sản phẩm mỹ phẩm nhập khẩu', 'Đang hoạt động', '2025-02-05']
    );

    const c5 = 'cl_005';
    await t.run(
      `INSERT INTO clients (id, name, country, industry, representative, email, phone, investment_capital, address, notes, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [c5, 'German Education GmbH', 'Đức', 'Giáo dục', 'Hans Mueller', 'mueller@ger-edu.de', '+49-30-1234-5678', 3000000, 'Berlin, Germany', 'Mở trung tâm giáo dục quốc tế tại Hà Nội', 'Tiềm năng', '2025-03-01']
    );

    const c6 = 'cl_006';
    await t.run(
      `INSERT INTO clients (id, name, country, industry, representative, email, phone, investment_capital, address, notes, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [c6, 'Taiwan Semiconductor VN', 'Đài Loan', 'Sản xuất', 'Chen Ming', 'chen@tw-semi.tw', '+886-2-8888-7777', 50000000, 'Taipei, Taiwan', 'Dự án nhà máy sản xuất tại KCN Long Hậu', 'Đang hoạt động', '2024-03-20']
    );

    // Contracts
    const ct1 = 'ct_001';
    await t.run(
      `INSERT INTO contracts (id, client_id, contract_no, service_type, value, start_date, end_date, status, payment_status, paid_amount, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [ct1, c1, 'HĐ-2024-001', 'Giấy chứng nhận đầu tư (IRC)', 85000000, '2024-07-01', '2024-12-31', 'Hoàn thành', 'Đã thanh toán', 85000000, 'IRC cho VPĐD tại TP.HCM']
    );

    const ct2 = 'ct_002';
    await t.run(
      `INSERT INTO contracts (id, client_id, contract_no, service_type, value, start_date, end_date, status, payment_status, paid_amount, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [ct2, c2, 'HĐ-2024-002', 'Công bố chất lượng thực phẩm nhập khẩu', 120000000, '2024-09-01', '2025-03-31', 'Đang thực hiện', 'Thanh toán một phần', 60000000, '15 sản phẩm thực phẩm nhập khẩu']
    );

    const ct3 = 'ct_003';
    await t.run(
      `INSERT INTO contracts (id, client_id, contract_no, service_type, value, start_date, end_date, status, payment_status, paid_amount, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [ct3, c3, 'HĐ-2025-003', 'Giấy phép con - Kinh doanh hóa chất', 150000000, '2025-01-15', '2025-06-30', 'Đang thực hiện', 'Thanh toán một phần', 75000000, 'GP kinh doanh hóa chất + tư vấn pháp lý']
    );

    const ct4 = 'ct_004';
    await t.run(
      `INSERT INTO contracts (id, client_id, contract_no, service_type, value, start_date, end_date, status, payment_status, paid_amount, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [ct4, c4, 'HĐ-2025-004', 'Công bố mỹ phẩm nhập khẩu', 200000000, '2025-02-10', '2025-08-10', 'Đang thực hiện', 'Chưa thanh toán', 0, '30 sản phẩm mỹ phẩm']
    );

    const ct5 = 'ct_005';
    await t.run(
      `INSERT INTO contracts (id, client_id, contract_no, service_type, value, start_date, end_date, status, payment_status, paid_amount, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [ct5, c5, 'HĐ-2025-005', 'Giấy phép con - Giáo dục', 180000000, '2025-03-05', '2025-09-05', 'Dự thảo', 'Chưa thanh toán', 0, 'GP trung tâm giáo dục quốc tế']
    );

    const ct6 = 'ct_006';
    await t.run(
      `INSERT INTO contracts (id, client_id, contract_no, service_type, value, start_date, end_date, status, payment_status, paid_amount, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [ct6, c6, 'HĐ-2024-006', 'Giấy chứng nhận đầu tư (IRC)', 350000000, '2024-04-01', '2025-04-01', 'Đang thực hiện', 'Thanh toán một phần', 250000000, 'IRC + ERC + GP xây dựng nhà máy']
    );

    // Cases
    await t.run(
      `INSERT INTO cases (id, contract_id, case_name, service_type, status, priority, assignee, start_date, deadline, notes, progress) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ['cs_001', ct2, 'Công bố SP Kimchi đóng hộp', 'Công bố chất lượng thực phẩm nhập khẩu', 'Đang xử lý', 'Cao', 'Nguyễn Văn A', '2024-09-15', '2025-01-15', 'Đã nộp hồ sơ, đang chờ kết quả kiểm nghiệm', 65]
    );
    await t.run(
      `INSERT INTO cases (id, contract_id, case_name, service_type, status, priority, assignee, start_date, deadline, notes, progress) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ['cs_002', ct2, 'Công bố SP Mì ăn liền Hàn Quốc', 'Công bố chất lượng thực phẩm nhập khẩu', 'Chờ bổ sung', 'Cao', 'Nguyễn Văn A', '2024-10-01', '2025-02-01', 'Cần bổ sung CoA và phiếu kiểm nghiệm', 40]
    );
    await t.run(
      `INSERT INTO cases (id, contract_id, case_name, service_type, status, priority, assignee, start_date, deadline, notes, progress) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ['cs_003', ct3, 'GP kinh doanh hóa chất nguy hiểm', 'Giấy phép con - Kinh doanh hóa chất', 'Đang xử lý', 'Cao', 'Trần Thị B', '2025-01-20', '2025-04-20', 'Đã nộp hồ sơ tại Bộ Công Thương', 50]
    );
    await t.run(
      `INSERT INTO cases (id, contract_id, case_name, service_type, status, priority, assignee, start_date, deadline, notes, progress) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ['cs_004', ct4, 'Công bố lô mỹ phẩm dưỡng da', 'Công bố mỹ phẩm nhập khẩu', 'Tiếp nhận', 'Trung bình', 'Lê Văn C', '2025-02-15', '2025-05-15', '10 sản phẩm serum và kem dưỡng', 15]
    );
    await t.run(
      `INSERT INTO cases (id, contract_id, case_name, service_type, status, priority, assignee, start_date, deadline, notes, progress) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ['cs_005', ct5, 'GP thành lập trung tâm GD quốc tế', 'Giấy phép con - Giáo dục', 'Tiếp nhận', 'Trung bình', 'Phạm Thị D', '2025-03-10', '2025-07-10', 'Đang chuẩn bị hồ sơ xin GP', 10]
    );
    await t.run(
      `INSERT INTO cases (id, contract_id, case_name, service_type, status, priority, assignee, start_date, deadline, notes, progress) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ['cs_006', ct6, 'IRC dự án nhà máy bán dẫn', 'Giấy chứng nhận đầu tư (IRC)', 'Đã cấp phép', 'Cao', 'Nguyễn Văn A', '2024-04-15', '2024-10-15', 'Đã nhận IRC, chuyển sang giai đoạn ERC', 100]
    );
  });

  logger.info('Database seeded with sample data');
}

async function seedCosingIngredients() {
  const row = await db.get('SELECT COUNT(*) as count FROM cosing_ingredients');
  const count = parseInt(row.count, 10);
  if (count > 0) return;

  let seed;
  try {
    seed = require('./cosing-seed');
  } catch (e) {
    logger.warn('cosing-seed.js not found, skipping CosIng seed');
    return;
  }

  await db.transaction(async (t) => {
    for (const r of seed) {
      await t.run(
        `INSERT INTO cosing_ingredients
          (inci_name, cas_no, ec_no, functions, annex, max_conc, origin, uv_range, sccs_assessment, sccs_ref)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT DO NOTHING`,
        [r.i, r.c, r.e, r.f, r.a, r.m, r.o, r.u, r.s, r.r]
      );
    }
  });
  logger.info(`CosIng database seeded with ${seed.length} ingredients`);
}

async function seedCountryRegs() {
  const row = await db.get('SELECT COUNT(*) as count FROM country_regs');
  const count = parseInt(row.count, 10);
  if (count > 0) return;

  let cregSeed;
  try {
    cregSeed = require('./country-regs-seed');
  } catch (e) {
    logger.warn('country-regs-seed.js not found, skipping country regs seed');
    return;
  }

  await db.transaction(async (t) => {
    for (const r of cregSeed) {
      await t.run(
        `INSERT INTO country_regs (inci_name, country, status, max_conc, conditions, source_ref)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT DO NOTHING`,
        [r.i, r.c, r.s, r.m || null, r.n || null, r.r || null]
      );
    }
  });
  logger.info(`Country regulations seeded with ${cregSeed.length} entries`);
}

async function initDatabase() {
  await initSchema();
  await seedDefaultAdmin();
  await seedSampleData();
  await seedCosingIngredients();
  await seedCountryRegs();
  logger.info('Database initialized');
}

module.exports = initDatabase;
