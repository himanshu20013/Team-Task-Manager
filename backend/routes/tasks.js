const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { auth, projectRole } = require('../middleware/auth');

const taskQuery = `
  SELECT t.*,
    u1.name as assignee_name, u1.avatar_color as assignee_color,
    u2.name as creator_name,
    p.name as project_name, p.color as project_color
  FROM tasks t
  LEFT JOIN users u1 ON t.assignee_id = u1.id
  LEFT JOIN users u2 ON t.creator_id = u2.id
  LEFT JOIN projects p ON t.project_id = p.id
`;

// GET /api/projects/:projectId/tasks
router.get('/projects/:projectId/tasks', auth, projectRole('member'), (req, res) => {
  const { status, priority, assignee } = req.query;
  let query = taskQuery + ' WHERE t.project_id = ?';
  const params = [req.params.projectId];
  if (status) { query += ' AND t.status = ?'; params.push(status); }
  if (priority) { query += ' AND t.priority = ?'; params.push(priority); }
  if (assignee) { query += ' AND t.assignee_id = ?'; params.push(assignee); }
  query += ' ORDER BY CASE t.priority WHEN "urgent" THEN 1 WHEN "high" THEN 2 WHEN "medium" THEN 3 ELSE 4 END, t.created_at DESC';
  res.json(db.prepare(query).all(...params));
});

// POST /api/projects/:projectId/tasks
router.post('/projects/:projectId/tasks', auth, projectRole('member'), (req, res) => {
  const { title, description, status, priority, assignee_id, due_date } = req.body;
  if (!title?.trim()) return res.status(400).json({ error: 'Task title is required' });

  const validStatuses = ['todo', 'in_progress', 'review', 'done'];
  const validPriorities = ['low', 'medium', 'high', 'urgent'];

  const result = db.prepare(`
    INSERT INTO tasks (title, description, status, priority, project_id, assignee_id, creator_id, due_date)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    title.trim(),
    description || '',
    validStatuses.includes(status) ? status : 'todo',
    validPriorities.includes(priority) ? priority : 'medium',
    req.params.projectId,
    assignee_id || null,
    req.user.id,
    due_date || null
  );

  const task = db.prepare(taskQuery + ' WHERE t.id = ?').get(result.lastInsertRowid);
  res.status(201).json(task);
});

// GET /api/tasks/:id
router.get('/tasks/:id', auth, (req, res) => {
  const task = db.prepare(taskQuery + ' WHERE t.id = ?').get(req.params.id);
  if (!task) return res.status(404).json({ error: 'Task not found' });

  const member = db.prepare('SELECT role FROM project_members WHERE project_id = ? AND user_id = ?')
    .get(task.project_id, req.user.id);
  if (!member) return res.status(403).json({ error: 'Access denied' });

  const comments = db.prepare(`
    SELECT c.*, u.name as user_name, u.avatar_color
    FROM comments c JOIN users u ON c.user_id = u.id
    WHERE c.task_id = ? ORDER BY c.created_at ASC
  `).all(task.id);

  res.json({ ...task, comments });
});

// PUT /api/tasks/:id
router.put('/tasks/:id', auth, (req, res) => {
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
  if (!task) return res.status(404).json({ error: 'Task not found' });

  const member = db.prepare('SELECT role FROM project_members WHERE project_id = ? AND user_id = ?')
    .get(task.project_id, req.user.id);
  if (!member) return res.status(403).json({ error: 'Access denied' });

  const { title, description, status, priority, assignee_id, due_date } = req.body;
  const validStatuses = ['todo', 'in_progress', 'review', 'done'];
  const validPriorities = ['low', 'medium', 'high', 'urgent'];

  db.prepare(`
    UPDATE tasks SET
      title = ?, description = ?, status = ?, priority = ?,
      assignee_id = ?, due_date = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(
    title?.trim() || task.title,
    description ?? task.description,
    validStatuses.includes(status) ? status : task.status,
    validPriorities.includes(priority) ? priority : task.priority,
    assignee_id !== undefined ? (assignee_id || null) : task.assignee_id,
    due_date !== undefined ? (due_date || null) : task.due_date,
    req.params.id
  );

  res.json(db.prepare(taskQuery + ' WHERE t.id = ?').get(req.params.id));
});

// DELETE /api/tasks/:id
router.delete('/tasks/:id', auth, (req, res) => {
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
  if (!task) return res.status(404).json({ error: 'Task not found' });

  const member = db.prepare('SELECT role FROM project_members WHERE project_id = ? AND user_id = ?')
    .get(task.project_id, req.user.id);
  if (!member) return res.status(403).json({ error: 'Access denied' });
  if (member.role !== 'admin' && task.creator_id !== req.user.id)
    return res.status(403).json({ error: 'Only admins or task creators can delete tasks' });

  db.prepare('DELETE FROM tasks WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// POST /api/tasks/:id/comments
router.post('/tasks/:id/comments', auth, (req, res) => {
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
  if (!task) return res.status(404).json({ error: 'Task not found' });

  const member = db.prepare('SELECT role FROM project_members WHERE project_id = ? AND user_id = ?')
    .get(task.project_id, req.user.id);
  if (!member) return res.status(403).json({ error: 'Access denied' });

  const { content } = req.body;
  if (!content?.trim()) return res.status(400).json({ error: 'Comment content is required' });

  const result = db.prepare('INSERT INTO comments (task_id, user_id, content) VALUES (?, ?, ?)')
    .run(task.id, req.user.id, content.trim());
  const comment = db.prepare(`
    SELECT c.*, u.name as user_name, u.avatar_color
    FROM comments c JOIN users u ON c.user_id = u.id WHERE c.id = ?
  `).get(result.lastInsertRowid);
  res.status(201).json(comment);
});

// GET /api/dashboard - summary for current user
router.get('/dashboard', auth, (req, res) => {
  const myTasks = db.prepare(`
    SELECT t.*, p.name as project_name, p.color as project_color,
      u.name as assignee_name
    FROM tasks t
    JOIN projects p ON t.project_id = p.id
    JOIN project_members pm ON t.project_id = pm.project_id AND pm.user_id = ?
    LEFT JOIN users u ON t.assignee_id = u.id
    WHERE t.assignee_id = ? AND t.status != 'done'
    ORDER BY t.due_date ASC NULLS LAST, t.created_at DESC
    LIMIT 20
  `).all(req.user.id, req.user.id);

  const stats = db.prepare(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN status = 'done' THEN 1 ELSE 0 END) as done,
      SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress,
      SUM(CASE WHEN status = 'todo' THEN 1 ELSE 0 END) as todo,
      SUM(CASE WHEN status = 'review' THEN 1 ELSE 0 END) as review,
      SUM(CASE WHEN due_date < date('now') AND status != 'done' THEN 1 ELSE 0 END) as overdue
    FROM tasks t
    JOIN project_members pm ON t.project_id = pm.project_id AND pm.user_id = ?
    WHERE t.assignee_id = ?
  `).get(req.user.id, req.user.id);

  const recentActivity = db.prepare(`
    SELECT t.id, t.title, t.status, t.updated_at, p.name as project_name, p.color as project_color
    FROM tasks t
    JOIN projects p ON t.project_id = p.id
    JOIN project_members pm ON t.project_id = pm.project_id AND pm.user_id = ?
    ORDER BY t.updated_at DESC LIMIT 10
  `).all(req.user.id);

  res.json({ myTasks, stats, recentActivity });
});

module.exports = router;
