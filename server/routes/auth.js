const express = require('express');
const bcrypt = require('bcryptjs');
const { z } = require('zod');
const crypto = require('crypto');
const db = require('../database');
const { signToken, authenticate } = require('../middleware/auth');
const logger = require('../logger');

const router = express.Router();
const genId = () => crypto.randomUUID().replace(/-/g, '').slice(0, 12);

// ── Validation schemas ───────────────────────────────────────
const RegisterSchema = z.object({
  username: z.string().min(3).max(50).regex(/^[a-zA-Z0-9_]+$/, 'Chỉ dùng chữ, số và dấu _'),
  email: z.string().email('Email không hợp lệ'),
  password: z.string().min(8, 'Mật khẩu tối thiểu 8 ký tự'),
  full_name: z.string().min(1).max(100).optional(),
  role: z.enum(['admin', 'manager', 'staff']).optional(),
});

const LoginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

const ChangePasswordSchema = z.object({
  current_password: z.string().min(1),
  new_password: z.string().min(8, 'Mật khẩu mới tối thiểu 8 ký tự'),
});

// ── Ensure at least one admin exists (initial setup) ─────────
function ensureDefaultAdmin() {
  const count = db.prepare('SELECT COUNT(*) as c FROM users').get().c;
  if (count === 0) {
    const hash = bcrypt.hashSync('Admin@123', 12);
    db.prepare(
      'INSERT INTO users (id, username, email, password_hash, full_name, role) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(genId(), 'admin', 'admin@ocean-ai.vn', hash, 'Quản trị viên', 'admin');
    logger.info('Default admin account created: admin / Admin@123');
  }
}
ensureDefaultAdmin();

// ── POST /api/auth/register ───────────────────────────────────
router.post('/register', (req, res, next) => {
  try {
    const body = RegisterSchema.parse(req.body);

    const exists = db.prepare('SELECT id FROM users WHERE username = ? OR email = ?').get(body.username, body.email);
    if (exists) {
      return res.status(409).json({ error: 'Username hoặc email đã tồn tại.' });
    }

    // Only admin can create admin/manager accounts
    const role = body.role || 'staff';

    const hash = bcrypt.hashSync(body.password, 12);
    const id = genId();
    db.prepare(
      'INSERT INTO users (id, username, email, password_hash, full_name, role) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(id, body.username, body.email, hash, body.full_name || null, role);

    logger.info(`New user registered: ${body.username} (${role})`);
    const user = db.prepare('SELECT id, username, email, full_name, role, created_at FROM users WHERE id = ?').get(id);
    const token = signToken({ id: user.id, username: user.username, role: user.role });
    res.status(201).json({ user, token });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Dữ liệu không hợp lệ', details: err.errors });
    }
    next(err);
  }
});

// ── POST /api/auth/login ──────────────────────────────────────
router.post('/login', (req, res, next) => {
  try {
    const body = LoginSchema.parse(req.body);

    const user = db.prepare(
      'SELECT * FROM users WHERE (username = ? OR email = ?) AND is_active = 1'
    ).get(body.username, body.username);

    if (!user || !bcrypt.compareSync(body.password, user.password_hash)) {
      logger.warn(`Failed login attempt for: ${body.username}`, { ip: req.ip });
      return res.status(401).json({ error: 'Tên đăng nhập hoặc mật khẩu không đúng.' });
    }

    db.prepare("UPDATE users SET last_login = datetime('now') WHERE id = ?").run(user.id);

    const token = signToken({ id: user.id, username: user.username, role: user.role });
    logger.info(`User logged in: ${user.username}`);
    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
      },
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Dữ liệu không hợp lệ', details: err.errors });
    }
    next(err);
  }
});

// ── GET /api/auth/me ──────────────────────────────────────────
router.get('/me', authenticate, (req, res) => {
  const user = db.prepare(
    'SELECT id, username, email, full_name, role, last_login, created_at FROM users WHERE id = ?'
  ).get(req.user.id);
  if (!user) return res.status(404).json({ error: 'Tài khoản không tồn tại.' });
  res.json(user);
});

// ── PUT /api/auth/change-password ────────────────────────────
router.put('/change-password', authenticate, (req, res, next) => {
  try {
    const body = ChangePasswordSchema.parse(req.body);
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
    if (!user || !bcrypt.compareSync(body.current_password, user.password_hash)) {
      return res.status(401).json({ error: 'Mật khẩu hiện tại không đúng.' });
    }
    const newHash = bcrypt.hashSync(body.new_password, 12);
    db.prepare("UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?").run(newHash, user.id);
    res.json({ success: true, message: 'Đổi mật khẩu thành công.' });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Dữ liệu không hợp lệ', details: err.errors });
    }
    next(err);
  }
});

// ── GET /api/auth/users (admin only) ─────────────────────────
router.get('/users', authenticate, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Chỉ admin mới có quyền xem danh sách người dùng.' });
  }
  const users = db.prepare(
    'SELECT id, username, email, full_name, role, is_active, last_login, created_at FROM users ORDER BY created_at DESC'
  ).all();
  res.json(users);
});

// ── PUT /api/auth/users/:id/toggle (admin only) ──────────────
router.put('/users/:id/toggle', authenticate, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Không có quyền.' });
  }
  if (req.params.id === req.user.id) {
    return res.status(400).json({ error: 'Không thể vô hiệu hóa tài khoản của chính mình.' });
  }
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'Tài khoản không tồn tại.' });
  const newStatus = user.is_active ? 0 : 1;
  db.prepare("UPDATE users SET is_active = ?, updated_at = datetime('now') WHERE id = ?").run(newStatus, req.params.id);
  res.json({ success: true, is_active: !!newStatus });
});

module.exports = router;
