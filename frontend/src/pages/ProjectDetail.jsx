import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { format, isPast, parseISO } from 'date-fns';
import './ProjectDetail.css';

const STATUSES = ['todo', 'in_progress', 'review', 'done'];
const STATUS_LABELS = { todo: 'To Do', in_progress: 'In Progress', review: 'Review', done: 'Done' };
const PRIORITIES = ['low', 'medium', 'high', 'urgent'];
const PRIORITY_LABELS = { low: 'Low', medium: 'Medium', high: 'High', urgent: 'Urgent' };
const PROJECT_COLORS = ['#6366f1','#ec4899','#14b8a6','#f59e0b','#10b981','#ef4444','#8b5cf6','#06b6d4','#f97316','#84cc16'];

function Avatar({ name, color, size = 'sm' }) {
  const initials = name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?';
  return (
    <div className={`avatar ${size === 'lg' ? 'avatar-lg' : ''}`} style={{ background: color }}>
      {initials}
    </div>
  );
}

// ─── Task Modal ────────────────────────────────────────────────────────────────
function TaskModal({ task, projectId, members, onClose, onSaved, onDeleted, isAdmin }) {
  const { user } = useAuth();
  const isEdit = !!task;
  const [form, setForm] = useState({
    title: task?.title || '',
    description: task?.description || '',
    status: task?.status || 'todo',
    priority: task?.priority || 'medium',
    assignee_id: task?.assignee_id || '',
    due_date: task?.due_date || ''
  });
  const [comments, setComments] = useState(task?.comments || []);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (isEdit) {
      api.get(`/tasks/${task.id}`).then(r => {
        setComments(r.data.comments || []);
      });
    }
  }, []);

  const handleSave = async () => {
    if (!form.title.trim()) { toast.error('Task title is required'); return; }
    setLoading(true);
    try {
      const payload = { ...form, assignee_id: form.assignee_id || null, due_date: form.due_date || null };
      if (isEdit) {
        const res = await api.put(`/tasks/${task.id}`, payload);
        onSaved(res.data, 'update');
      } else {
        const res = await api.post(`/projects/${projectId}/tasks`, payload);
        onSaved(res.data, 'create');
      }
      toast.success(isEdit ? 'Task updated' : 'Task created');
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error saving task');
    } finally { setLoading(false); }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this task?')) return;
    setDeleting(true);
    try {
      await api.delete(`/tasks/${task.id}`);
      onDeleted(task.id);
      toast.success('Task deleted');
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error deleting task');
      setDeleting(false);
    }
  };

  const handleComment = async () => {
    if (!newComment.trim()) return;
    try {
      const res = await api.post(`/tasks/${task.id}/comments`, { content: newComment.trim() });
      setComments([...comments, res.data]);
      setNewComment('');
    } catch { toast.error('Error posting comment'); }
  };

  const canDelete = isAdmin || task?.creator_id === user?.id;

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal task-modal">
        <div className="modal-header">
          <h2>{isEdit ? 'Edit Task' : 'New Task'}</h2>
          <div style={{ display: 'flex', gap: 8 }}>
            {isEdit && canDelete && (
              <button className="btn btn-sm btn-danger" onClick={handleDelete} disabled={deleting}>
                {deleting ? '...' : 'Delete'}
              </button>
            )}
            <button className="btn btn-icon btn-ghost" onClick={onClose}>✕</button>
          </div>
        </div>
        <div className="modal-body">
          <div className="form-group">
            <label>Title *</label>
            <input className="input" placeholder="Task title" value={form.title} onChange={e => setForm({...form, title: e.target.value})} />
          </div>
          <div className="form-group">
            <label>Description</label>
            <textarea className="input" placeholder="Add details..." value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
          </div>
          <div className="task-form-row">
            <div className="form-group">
              <label>Status</label>
              <select className="input" value={form.status} onChange={e => setForm({...form, status: e.target.value})}>
                {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Priority</label>
              <select className="input" value={form.priority} onChange={e => setForm({...form, priority: e.target.value})}>
                {PRIORITIES.map(p => <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>)}
              </select>
            </div>
          </div>
          <div className="task-form-row">
            <div className="form-group">
              <label>Assignee</label>
              <select className="input" value={form.assignee_id} onChange={e => setForm({...form, assignee_id: e.target.value})}>
                <option value="">Unassigned</option>
                {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Due Date</label>
              <input className="input" type="date" value={form.due_date} onChange={e => setForm({...form, due_date: e.target.value})} />
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={loading}>
            {loading ? 'Saving...' : (isEdit ? 'Update' : 'Create Task')}
          </button>
        </div>

        {isEdit && (
          <div className="comments-section">
            <h3>Comments ({comments.length})</h3>
            <div className="comments-list">
              {comments.map(c => (
                <div key={c.id} className="comment">
                  <Avatar name={c.user_name} color={c.avatar_color} />
                  <div className="comment-body">
                    <div className="comment-header">
                      <span className="comment-author">{c.user_name}</span>
                      <span className="comment-time">{format(new Date(c.created_at), 'MMM d, h:mm a')}</span>
                    </div>
                    <p className="comment-content">{c.content}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="comment-input">
              <textarea
                className="input"
                placeholder="Add a comment..."
                value={newComment}
                onChange={e => setNewComment(e.target.value)}
                rows={2}
                onKeyDown={e => { if (e.key === 'Enter' && e.ctrlKey) handleComment(); }}
              />
              <button className="btn btn-primary btn-sm" onClick={handleComment} disabled={!newComment.trim()}>
                Comment
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Members Modal ─────────────────────────────────────────────────────────────
function MembersModal({ project, members, onClose, onUpdated }) {
  const [search, setSearch] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);

  const searchUsers = async (q) => {
    setSearch(q);
    if (q.length < 2) { setResults([]); return; }
    setSearching(true);
    try {
      const res = await api.get(`/auth/users/search?q=${q}`);
      const memberIds = members.map(m => m.id);
      setResults(res.data.filter(u => !memberIds.includes(u.id)));
    } finally { setSearching(false); }
  };

  const addMember = async (userId, role = 'member') => {
    try {
      await api.post(`/projects/${project.id}/members`, { user_id: userId, role });
      toast.success('Member added');
      setSearch(''); setResults([]);
      onUpdated();
    } catch (err) { toast.error(err.response?.data?.error || 'Error adding member'); }
  };

  const changeRole = async (userId, role) => {
    try {
      await api.put(`/projects/${project.id}/members/${userId}`, { role });
      toast.success('Role updated');
      onUpdated();
    } catch (err) { toast.error(err.response?.data?.error || 'Error updating role'); }
  };

  const removeMember = async (userId) => {
    if (!confirm('Remove this member?')) return;
    try {
      await api.delete(`/projects/${project.id}/members/${userId}`);
      toast.success('Member removed');
      onUpdated();
    } catch (err) { toast.error(err.response?.data?.error || 'Error removing member'); }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 560 }}>
        <div className="modal-header">
          <h2>Team Members</h2>
          <button className="btn btn-icon btn-ghost" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div className="form-group">
            <label>Add Member</label>
            <input className="input" placeholder="Search by name or email..." value={search} onChange={e => searchUsers(e.target.value)} />
            {results.length > 0 && (
              <div className="search-results">
                {results.map(u => (
                  <div key={u.id} className="search-result-item">
                    <Avatar name={u.name} color={u.avatar_color} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 500 }}>{u.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--text3)' }}>{u.email}</div>
                    </div>
                    <button className="btn btn-sm btn-secondary" onClick={() => addMember(u.id)}>Add</button>
                    <button className="btn btn-sm btn-primary" onClick={() => addMember(u.id, 'admin')}>+Admin</button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="divider" />
          <div className="members-list">
            {members.map(m => (
              <div key={m.id} className="member-item">
                <Avatar name={m.name} color={m.avatar_color} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>{m.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text3)' }}>{m.email}</div>
                </div>
                {m.id !== project.owner_id ? (
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <select
                      className="input"
                      style={{ width: 'auto', padding: '4px 8px', fontSize: 12 }}
                      value={m.role}
                      onChange={e => changeRole(m.id, e.target.value)}
                    >
                      <option value="member">Member</option>
                      <option value="admin">Admin</option>
                    </select>
                    <button className="btn btn-sm btn-danger" onClick={() => removeMember(m.id)}>✕</button>
                  </div>
                ) : (
                  <span className="badge badge-admin">Owner</span>
                )}
              </div>
            ))}
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  );
}

// ─── Project Settings Modal ────────────────────────────────────────────────────
function SettingsModal({ project, onClose, onSaved, onDeleted }) {
  const [form, setForm] = useState({ name: project.name, description: project.description || '', color: project.color });
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Name required'); return; }
    setLoading(true);
    try {
      await api.put(`/projects/${project.id}`, form);
      toast.success('Project updated');
      onSaved(form);
      onClose();
    } catch (err) { toast.error(err.response?.data?.error || 'Error'); setLoading(false); }
  };

  const handleDelete = async () => {
    if (!confirm(`Delete "${project.name}"? This is irreversible.`)) return;
    try {
      await api.delete(`/projects/${project.id}`);
      toast.success('Project deleted');
      onDeleted();
    } catch (err) { toast.error(err.response?.data?.error || 'Error'); }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h2>Project Settings</h2>
          <button className="btn btn-icon btn-ghost" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div className="form-group"><label>Name *</label>
            <input className="input" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
          </div>
          <div className="form-group"><label>Description</label>
            <textarea className="input" value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
          </div>
          <div className="form-group"><label>Color</label>
            <div className="color-picker">
              {PROJECT_COLORS.map(c => (
                <button key={c} className={`color-swatch ${form.color === c ? 'selected' : ''}`}
                  style={{ background: c }} onClick={() => setForm({...form, color: c})} />
              ))}
            </div>
          </div>
        </div>
        <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
          <button className="btn btn-danger btn-sm" onClick={handleDelete}>Delete Project</button>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSave} disabled={loading}>
              {loading ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Task Card ─────────────────────────────────────────────────────────────────
function TaskCard({ task, onClick }) {
  const isOverdue = task.due_date && isPast(parseISO(task.due_date)) && task.status !== 'done';
  return (
    <div className="task-card" onClick={() => onClick(task)}>
      <div className="task-card-header">
        <span className={`badge badge-${task.priority}`}>{PRIORITY_LABELS[task.priority]}</span>
      </div>
      <p className="task-card-title">{task.title}</p>
      {task.description && <p className="task-card-desc">{task.description}</p>}
      <div className="task-card-footer">
        {task.assignee_id ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Avatar name={task.assignee_name} color={task.assignee_color} size="xs" />
            <span style={{ fontSize: 12, color: 'var(--text2)' }}>{task.assignee_name}</span>
          </div>
        ) : <span style={{ fontSize: 12, color: 'var(--text3)' }}>Unassigned</span>}
        {task.due_date && (
          <span className={`due-chip ${isOverdue ? 'overdue' : ''}`}>
            📅 {format(parseISO(task.due_date), 'MMM d')}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function ProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('board'); // board | list
  const [filters, setFilters] = useState({ status: '', priority: '', assignee: '' });
  const [activeModal, setActiveModal] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);
  const [filterOpen, setFilterOpen] = useState(false);

  const isAdmin = project?.my_role === 'admin';

  const load = useCallback(async () => {
    try {
      const [projRes, tasksRes] = await Promise.all([
        api.get(`/projects/${id}`),
        api.get(`/projects/${id}/tasks`)
      ]);
      setProject(projRes.data);
      setMembers(projRes.data.members || []);
      setTasks(tasksRes.data);
    } catch (err) {
      if (err.response?.status === 403 || err.response?.status === 404) navigate('/projects');
    } finally { setLoading(false); }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const loadTasks = async () => {
    const params = new URLSearchParams();
    if (filters.status) params.append('status', filters.status);
    if (filters.priority) params.append('priority', filters.priority);
    if (filters.assignee) params.append('assignee', filters.assignee);
    const res = await api.get(`/projects/${id}/tasks?${params}`);
    setTasks(res.data);
  };

  useEffect(() => { if (project) loadTasks(); }, [filters]);

  const handleTaskSaved = (task, type) => {
    if (type === 'create') setTasks(prev => [task, ...prev]);
    else setTasks(prev => prev.map(t => t.id === task.id ? task : t));
  };

  const handleTaskDeleted = (taskId) => setTasks(prev => prev.filter(t => t.id !== taskId));

  const openTask = (task) => { setSelectedTask(task); setActiveModal('task'); };

  if (loading) return <div className="loading-screen"><div className="spinner"/></div>;
  if (!project) return null;

  const tasksByStatus = STATUSES.reduce((acc, s) => ({
    ...acc, [s]: tasks.filter(t => t.status === s)
  }), {});

  const progress = tasks.length > 0 ? Math.round((tasks.filter(t => t.status === 'done').length / tasks.length) * 100) : 0;

  return (
    <div className="project-detail fade-in">
      {/* Header */}
      <div className="project-header" style={{ borderColor: project.color + '44' }}>
        <div className="project-header-left">
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/projects')}>← Back</button>
          <div className="project-header-title">
            <div className="project-dot" style={{ background: project.color }} />
            <h1>{project.name}</h1>
            <span className={`badge badge-${project.my_role}`}>{project.my_role}</span>
          </div>
          {project.description && <p className="project-header-desc">{project.description}</p>}
        </div>
        <div className="project-header-right">
          <div className="member-stack">
            {members.slice(0, 4).map(m => <Avatar key={m.id} name={m.name} color={m.avatar_color} />)}
            {members.length > 4 && <div className="avatar" style={{ background: 'var(--border2)', fontSize: 11 }}>+{members.length - 4}</div>}
          </div>
          {isAdmin && (
            <>
              <button className="btn btn-secondary btn-sm" onClick={() => setActiveModal('members')}>
                👥 Team
              </button>
              <button className="btn btn-secondary btn-sm" onClick={() => setActiveModal('settings')}>
                ⚙️
              </button>
            </>
          )}
          {!isAdmin && (
            <button className="btn btn-secondary btn-sm" onClick={() => setActiveModal('members')}>
              👥 Team
            </button>
          )}
        </div>
      </div>

      {/* Progress */}
      <div className="project-progress-bar">
        <div className="progress-bar" style={{ height: 6 }}>
          <div className="progress-fill" style={{ width: `${progress}%`, background: project.color }} />
        </div>
        <span style={{ fontSize: 12, color: 'var(--text3)' }}>{progress}% complete · {tasks.length} tasks</span>
      </div>

      {/* Toolbar */}
      <div className="tasks-toolbar">
        <div style={{ display: 'flex', gap: 8 }}>
          <button className={`btn btn-sm ${view === 'board' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setView('board')}>
            ▦ Board
          </button>
          <button className={`btn btn-sm ${view === 'list' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setView('list')}>
            ≡ List
          </button>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className={`btn btn-sm btn-secondary ${filterOpen ? 'active' : ''}`} onClick={() => setFilterOpen(!filterOpen)}>
            ⚡ Filters {(filters.status || filters.priority || filters.assignee) ? '•' : ''}
          </button>
          <button className="btn btn-sm btn-primary" onClick={() => { setSelectedTask(null); setActiveModal('task'); }}>
            + New Task
          </button>
        </div>
      </div>

      {/* Filters */}
      {filterOpen && (
        <div className="filters-bar card" style={{ margin: '0 32px 16px', padding: 16 }}>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            <select className="input" style={{ width: 'auto' }} value={filters.status} onChange={e => setFilters({...filters, status: e.target.value})}>
              <option value="">All Statuses</option>
              {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
            </select>
            <select className="input" style={{ width: 'auto' }} value={filters.priority} onChange={e => setFilters({...filters, priority: e.target.value})}>
              <option value="">All Priorities</option>
              {PRIORITIES.map(p => <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>)}
            </select>
            <select className="input" style={{ width: 'auto' }} value={filters.assignee} onChange={e => setFilters({...filters, assignee: e.target.value})}>
              <option value="">All Members</option>
              {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
            <button className="btn btn-sm btn-ghost" onClick={() => setFilters({ status: '', priority: '', assignee: '' })}>
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Board View */}
      {view === 'board' && (
        <div className="board">
          {STATUSES.map(status => (
            <div key={status} className="board-column">
              <div className="board-column-header">
                <div className="column-title">
                  <div className={`status-dot dot-${status}`} />
                  <span>{STATUS_LABELS[status]}</span>
                  <span className="column-count">{tasksByStatus[status].length}</span>
                </div>
                <button className="btn btn-icon btn-ghost btn-sm" title="Add task"
                  onClick={() => { setSelectedTask(null); setActiveModal('task'); }}>+</button>
              </div>
              <div className="board-cards">
                {tasksByStatus[status].length === 0 ? (
                  <div className="empty-column">No tasks</div>
                ) : (
                  tasksByStatus[status].map(task => (
                    <TaskCard key={task.id} task={task} onClick={openTask} />
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* List View */}
      {view === 'list' && (
        <div className="task-list-view">
          {tasks.length === 0 ? (
            <div className="empty-state card" style={{ margin: '0 32px' }}>
              <div className="icon">📋</div>
              <h3>No tasks yet</h3>
              <p>Add your first task to get started</p>
            </div>
          ) : (
            <table className="task-table">
              <thead>
                <tr>
                  <th>Task</th>
                  <th>Status</th>
                  <th>Priority</th>
                  <th>Assignee</th>
                  <th>Due Date</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map(task => {
                  const isOverdue = task.due_date && isPast(parseISO(task.due_date)) && task.status !== 'done';
                  return (
                    <tr key={task.id} onClick={() => openTask(task)} className="task-table-row">
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div className={`status-dot dot-${task.status}`} />
                          <span style={{ fontWeight: 500 }}>{task.title}</span>
                        </div>
                      </td>
                      <td><span className={`badge badge-${task.status}`}>{STATUS_LABELS[task.status]}</span></td>
                      <td><span className={`badge badge-${task.priority}`}>{PRIORITY_LABELS[task.priority]}</span></td>
                      <td>
                        {task.assignee_id ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Avatar name={task.assignee_name} color={task.assignee_color} />
                            <span style={{ fontSize: 13 }}>{task.assignee_name}</span>
                          </div>
                        ) : <span style={{ color: 'var(--text3)', fontSize: 13 }}>—</span>}
                      </td>
                      <td>
                        {task.due_date
                          ? <span className={isOverdue ? 'overdue' : ''} style={{ fontSize: 13 }}>
                              {format(parseISO(task.due_date), 'MMM d, yyyy')}
                            </span>
                          : <span style={{ color: 'var(--text3)', fontSize: 13 }}>—</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Modals */}
      {activeModal === 'task' && (
        <TaskModal
          task={selectedTask}
          projectId={id}
          members={members}
          onClose={() => setActiveModal(null)}
          onSaved={handleTaskSaved}
          onDeleted={handleTaskDeleted}
          isAdmin={isAdmin}
        />
      )}
      {activeModal === 'members' && (
        <MembersModal
          project={project}
          members={members}
          onClose={() => setActiveModal(null)}
          onUpdated={load}
        />
      )}
      {activeModal === 'settings' && (
        <SettingsModal
          project={project}
          onClose={() => setActiveModal(null)}
          onSaved={(updates) => setProject({...project, ...updates})}
          onDeleted={() => navigate('/projects')}
        />
      )}
    </div>
  );
}
