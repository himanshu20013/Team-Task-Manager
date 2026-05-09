import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import toast from 'react-hot-toast';
import './ProjectsPage.css';

const PROJECT_COLORS = [
  '#6366f1','#ec4899','#14b8a6','#f59e0b','#10b981','#ef4444','#8b5cf6','#06b6d4','#f97316','#84cc16'
];

function ProjectModal({ project, onClose, onSaved }) {
  const [form, setForm] = useState({ name: project?.name || '', description: project?.description || '', color: project?.color || '#6366f1' });
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Project name is required'); return; }
    setLoading(true);
    try {
      if (project) {
        await api.put(`/projects/${project.id}`, form);
        toast.success('Project updated');
      } else {
        const res = await api.post('/projects', form);
        onSaved(res.data);
        toast.success('Project created!');
      }
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error saving project');
    } finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h2>{project ? 'Edit Project' : 'New Project'}</h2>
          <button className="btn btn-icon btn-ghost" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div className="form-group">
            <label>Project Name *</label>
            <input className="input" placeholder="e.g. Website Redesign" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
          </div>
          <div className="form-group">
            <label>Description</label>
            <textarea className="input" placeholder="What's this project about?" value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
          </div>
          <div className="form-group">
            <label>Color</label>
            <div className="color-picker">
              {PROJECT_COLORS.map(c => (
                <button key={c} className={`color-swatch ${form.color === c ? 'selected' : ''}`}
                  style={{ background: c }}
                  onClick={() => setForm({...form, color: c})}
                />
              ))}
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={loading}>
            {loading ? 'Saving...' : (project ? 'Save Changes' : 'Create Project')}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    api.get('/projects').then(r => { setProjects(r.data); setLoading(false); });
  }, []);

  if (loading) return <div className="loading-screen"><div className="spinner"/></div>;

  return (
    <div className="projects-page fade-in">
      <div className="page-header">
        <div>
          <h1>Projects</h1>
          <p className="subtitle">{projects.length} project{projects.length !== 1 ? 's' : ''} total</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          New Project
        </button>
      </div>

      {projects.length === 0 ? (
        <div className="empty-state card">
          <div className="icon">🚀</div>
          <h3>No projects yet</h3>
          <p>Create your first project to get started</p>
          <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => setShowModal(true)}>
            Create Project
          </button>
        </div>
      ) : (
        <div className="projects-grid">
          {projects.map(p => {
            const progress = p.task_count > 0 ? Math.round((p.done_count / p.task_count) * 100) : 0;
            return (
              <Link to={`/projects/${p.id}`} key={p.id} className="project-card">
                <div className="project-card-accent" style={{ background: p.color }} />
                <div className="project-card-body">
                  <div className="project-card-header">
                    <div className="project-icon" style={{ background: p.color + '22', color: p.color }}>
                      📁
                    </div>
                    <span className={`badge badge-${p.my_role}`}>{p.my_role}</span>
                  </div>
                  <h3 className="project-name">{p.name}</h3>
                  {p.description && <p className="project-desc">{p.description}</p>}
                  <div className="project-stats">
                    <span>👥 {p.member_count}</span>
                    <span>📋 {p.task_count} tasks</span>
                  </div>
                  {p.task_count > 0 && (
                    <div style={{ marginTop: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text3)', marginBottom: 6 }}>
                        <span>Progress</span>
                        <span>{progress}%</span>
                      </div>
                      <div className="progress-bar">
                        <div className="progress-fill" style={{ width: `${progress}%`, background: p.color }} />
                      </div>
                    </div>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {showModal && (
        <ProjectModal
          onClose={() => setShowModal(false)}
          onSaved={p => setProjects([p, ...projects])}
        />
      )}
    </div>
  );
}
