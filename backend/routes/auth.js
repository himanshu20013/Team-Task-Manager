const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db/database');
const { auth, JWT_SECRET } = require('../middleware/auth');

const COLORS = ['#6366f1','#ec4899','#14b8a6','#f59e0b','#10b981','#ef4444','#8b5cf6','#06b6d4'];

// POST /api/auth/signup
router.post('/signup', (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password)
    return res.status(400).json({ error: 'Name, email, and password are required' });
  if (password.length < 6)
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return res.status(400).json({ error: 'Invalid email format' });

  try {
    const hashed = bcrypt.hashSync(password, 10);
    const color = COLORS[Math.floor(Math.random() * COLORS.length)];
    const result = db.prepare(
      'INSERT INTO users (name, email, password, avatar_color) VALUES (?, ?, ?, ?)'
    ).run(name.trim(), email.toLowerCase().trim(), hashed, color);

    const user = db.prepare('SELECT id, name, email, avatar_color FROM users WHERE id = ?').get(result.lastInsertRowid);
    const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ token, user });
  } catch (e) {
    if (e.message.includes('UNIQUE')) return res.status(409).json({ error: 'Email already in use' });
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ error: 'Email and password are required' });

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase().trim());
  if (!user || !bcrypt.compareSync(password, user.password))
    return res.status(401).json({ error: 'Invalid email or password' });

  const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '7d' });
  const { password: _, ...safeUser } = user;
  res.json({ token, user: safeUser });
});

// GET /api/auth/me
router.get('/me', auth, (req, res) => res.json(req.user));

// GET /api/auth/users/search
router.get('/users/search', auth, (req, res) => {
  const { q } = req.query;
  if (!q || q.length < 2) return res.json([]);
  const users = db.prepare(
    'SELECT id, name, email, avatar_color FROM users WHERE (name LIKE ? OR email LIKE ?) AND id != ? LIMIT 10'
  ).all(`%${q}%`, `%${q}%`, req.user.id);
  res.json(users);
});

module.exports = router;
