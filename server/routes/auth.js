const express = require('express');
const bcrypt = require('bcryptjs');
const { z } = require('zod');
const crypto = require('crypto');
const db = require('../db');
const logger = require('../logger');

const router = express.Router();
const genId = () => crypto.randomUUID().replace(/-/g, '').slice(0, 12);

const RegisterSchema = z.object({
  username: z.string().min(3).max(50).regex(/^[a-zA-Z0-9_]+$/, 'Chỉ dùng chữ, số và dấu _'),
  email: z.string().email('Email không hợp lệ'),
  password: z.string().min(8, 'Mật khẩu tối thiểu 8 ký tự'),
  full_name: z.string().min(1).max(100).optional(),
  role: z.enum(['admin', 'manager', 'staff']).optional(),
});

const LoginSchema = z.object({ username: z.string().min(1), password: z.string().min(1) });
const ChangePasswordSchema = z.object({ current_password: z.string().min(1), new_password: z.string().min(8) });

// ── POST /api/auth/login ──────────────────────────────────────
router.post('/login', async (req, res, next) => {
  try {
    const body = LoginSchema.parse(req.body);
    const user = await db.get(
      'SELECT * FROM users WHERE (username = $1 OR email = $1) AND is_active = 1',
      [body.username]
    );
    if (!user || !(await bcrypt.compare(body.password, user.password_hash))) {
      logger.warn(`Failed login attempt for: ${body.username}`);
      return res.status(401).json({ error: 'Tên đăng nhập hoặc mật khẩu không đúng.' });
    }
    await db.run('UPDATE users SET last_login = NOW() WHERE id = $1', [user.id]);
    logger.info(`User logged in: ${user.username}`);
    res.json({ user: { id: user.id, username: user.username, email: user.email, full_name: user.full_name, role: user.role } });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: 'Dữ liệu không hợp lệ', details: err.errors });
    next(err);
  }
});

// ── POST /api/auth/register ───────────────────────────────────
router.post('/register', async (req, res, next) => {
  try {
    const body = RegisterSchema.parse(req.body);
    const exists = await db.get('SELECT id FROM users WHERE username = $1 OR email = $2', [body.username, body.email]);
    if (exists) return res.status(409).json({ error: 'Username hoặc email đã tồn tại.' });
    const hash = await bcrypt.hash(body.password, 12);
    const id = genId();
    await db.run(
      'INSERT INTO users (id, username, email, password_hash, full_name, role) VALUES ($1,$2,$3,$4,$5,$6)',
      [id, body.username, body.email, hash, body.full_name || null, body.role || 'staff']
    );
    logger.info(`New user registered: ${body.username}`);
    const user = await db.get('SELECT id, username, email, full_name, role, created_at FROM users WHERE id = $1', [id]);
    res.status(201).json({ user });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: 'Dữ liệu không hợp lệ', details: err.errors });
    next(err);
  }
});

// ── GET /api/auth/users ───────────────────────────────────────
router.get('/users', async (req, res, next) => {
  try {
    const users = await db.all('SELECT id, username, email, full_name, role, is_active, last_login, created_at FROM users ORDER BY created_at DESC');
    res.json(users);
  } catch (err) { next(err); }
});

// ── PUT /api/auth/users/:id/toggle ───────────────────────────
router.put('/users/:id/toggle', async (req, res, next) => {
  try {
    const user = await db.get('SELECT * FROM users WHERE id = $1', [req.params.id]);
    if (!user) return res.status(404).json({ error: 'Tài khoản không tồn tại.' });
    const newStatus = user.is_active ? 0 : 1;
    await db.run('UPDATE users SET is_active = $1, updated_at = NOW() WHERE id = $2', [newStatus, req.params.id]);
    res.json({ success: true, is_active: !!newStatus });
  } catch (err) { next(err); }
});

// ── PUT /api/auth/change-password ────────────────────────────
router.put('/change-password', async (req, res, next) => {
  try {
    const body = ChangePasswordSchema.parse(req.body);
    const { user_id } = req.body;
    if (!user_id) return res.status(400).json({ error: 'Thiếu user_id' });
    const user = await db.get('SELECT * FROM users WHERE id = $1', [user_id]);
    if (!user || !(await bcrypt.compare(body.current_password, user.password_hash))) {
      return res.status(401).json({ error: 'Mật khẩu hiện tại không đúng.' });
    }
    const newHash = await bcrypt.hash(body.new_password, 12);
    await db.run('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [newHash, user.id]);
    res.json({ success: true, message: 'Đổi mật khẩu thành công.' });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: 'Dữ liệu không hợp lệ', details: err.errors });
    next(err);
  }
});

module.exports = router;
