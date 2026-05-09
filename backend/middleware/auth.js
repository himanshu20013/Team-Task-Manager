const jwt = require('jsonwebtoken');
const db = require('../db/database');

const JWT_SECRET = process.env.JWT_SECRET || 'taskflow-secret-key-change-in-production';

const auth = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = db.prepare('SELECT id, name, email, avatar_color FROM users WHERE id = ?').get(decoded.id);
    if (!user) return res.status(401).json({ error: 'User not found' });
    req.user = user;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
};

const projectRole = (requiredRole) => (req, res, next) => {
  const projectId = req.params.projectId || req.body.project_id;
  const member = db.prepare(
    'SELECT role FROM project_members WHERE project_id = ? AND user_id = ?'
  ).get(projectId, req.user.id);

  if (!member) return res.status(403).json({ error: 'Not a project member' });
  if (requiredRole === 'admin' && member.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  req.projectRole = member.role;
  next();
};

module.exports = { auth, projectRole, JWT_SECRET };
