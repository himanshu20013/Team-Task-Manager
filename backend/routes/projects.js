const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { auth, projectRole } = require('../middleware/auth');

// GET /api/projects - all projects for current user
router.get('/', auth, (req, res) => {
  const projects = db.prepare(`
    SELECT p.*, pm.role as my_role,
      (SELECT COUNT(*) FROM project_members WHERE project_id = p.id) as member_count,
      (SELECT COUNT(*) FROM tasks WHERE project_id = p.id) as task_count,
      (SELECT COUNT(*) FROM tasks WHERE project_id = p.id AND status = 'done') as done_count,
      u.name as owner_name
    FROM projects p
    JOIN project_members pm ON p.id = pm.project_id AND pm.user_id = ?
    JOIN users u ON p.owner_id = u.id
    ORDER BY p.created_at DESC
  `).all(req.user.id);
  res.json(projects);
});

// POST /api/projects - create project
router.post('/', auth, (req, res) => {
  const { name, description, color } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Project name is required' });

  const result = db.prepare(
    'INSERT INTO projects (name, description, color, owner_id) VALUES (?, ?, ?, ?)'
  ).run(name.trim(), description || '', color || '#6366f1', req.user.id);

  db.prepare(
    'INSERT INTO project_members (project_id, user_id, role) VALUES (?, ?, ?)'
  ).run(result.lastInsertRowid, req.user.id, 'admin');

  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json({ ...project, my_role: 'admin', member_count: 1, task_count: 0, done_count: 0 });
});

// GET /api/projects/:projectId
router.get('/:projectId', auth, projectRole('member'), (req, res) => {
  const project = db.prepare(`
    SELECT p.*, pm.role as my_role,
      u.name as owner_name
    FROM projects p
    JOIN project_members pm ON p.id = pm.project_id AND pm.user_id = ?
    JOIN users u ON p.owner_id = u.id
    WHERE p.id = ?
  `).get(req.user.id, req.params.projectId);

  const members = db.prepare(`
    SELECT u.id, u.name, u.email, u.avatar_color, pm.role, pm.joined_at
    FROM project_members pm JOIN users u ON pm.user_id = u.id
    WHERE pm.project_id = ? ORDER BY pm.role DESC, u.name
  `).all(req.params.projectId);

  res.json({ ...project, members });
});

// PUT /api/projects/:projectId
router.put('/:projectId', auth, projectRole('admin'), (req, res) => {
  const { name, description, color } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Project name is required' });
  db.prepare('UPDATE projects SET name = ?, description = ?, color = ? WHERE id = ?')
    .run(name.trim(), description || '', color || '#6366f1', req.params.projectId);
  res.json({ success: true });
});

// DELETE /api/projects/:projectId
router.delete('/:projectId', auth, projectRole('admin'), (req, res) => {
  const project = db.prepare('SELECT owner_id FROM projects WHERE id = ?').get(req.params.projectId);
  if (project.owner_id !== req.user.id)
    return res.status(403).json({ error: 'Only the owner can delete a project' });
  db.prepare('DELETE FROM projects WHERE id = ?').run(req.params.projectId);
  res.json({ success: true });
});

// POST /api/projects/:projectId/members
router.post('/:projectId/members', auth, projectRole('admin'), (req, res) => {
  const { user_id, role } = req.body;
  if (!user_id) return res.status(400).json({ error: 'user_id is required' });
  const validRole = ['admin', 'member'].includes(role) ? role : 'member';
  try {
    db.prepare('INSERT INTO project_members (project_id, user_id, role) VALUES (?, ?, ?)')
      .run(req.params.projectId, user_id, validRole);
    res.status(201).json({ success: true });
  } catch (e) {
    if (e.message.includes('UNIQUE')) return res.status(409).json({ error: 'User already a member' });
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/projects/:projectId/members/:userId
router.put('/:projectId/members/:userId', auth, projectRole('admin'), (req, res) => {
  const { role } = req.body;
  if (!['admin', 'member'].includes(role)) return res.status(400).json({ error: 'Invalid role' });
  db.prepare('UPDATE project_members SET role = ? WHERE project_id = ? AND user_id = ?')
    .run(role, req.params.projectId, req.params.userId);
  res.json({ success: true });
});

// DELETE /api/projects/:projectId/members/:userId
router.delete('/:projectId/members/:userId', auth, projectRole('admin'), (req, res) => {
  const project = db.prepare('SELECT owner_id FROM projects WHERE id = ?').get(req.params.projectId);
  if (parseInt(req.params.userId) === project.owner_id)
    return res.status(400).json({ error: 'Cannot remove the project owner' });
  db.prepare('DELETE FROM project_members WHERE project_id = ? AND user_id = ?')
    .run(req.params.projectId, req.params.userId);
  res.json({ success: true });
});

module.exports = router;
