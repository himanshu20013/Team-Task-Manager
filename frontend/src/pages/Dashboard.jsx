import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { format, isPast, parseISO } from 'date-fns';
import './Dashboard.css';

const statusLabel = { todo: 'To Do', in_progress: 'In Progress', review: 'Review', done: 'Done' };
const priorityLabel = { low: 'Low', medium: 'Medium', high: 'High', urgent: 'Urgent' };

function StatCard({ label, value, color, icon }) {
  return (
    <div className="stat-card" style={{ '--c': color }}>
      <div className="stat-icon">{icon}</div>
      <div className="stat-value">{value ?? 0}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/dashboard').then(r => { setData(r.data); setLoading(false); });
  }, []);

  if (loading) return <div className="loading-screen"><div className="spinner"/></div>;

  const { myTasks = [], stats = {}, recentActivity = [] } = data || {};

  return (
    <div className="dashboard fade-in">
      <div className="page-header">
        <div>
          <h1>Good {getTimeOfDay()}, <span style={{ color: 'var(--accent2)' }}>{user?.name?.split(' ')[0]}</span> 👋</h1>
          <p className="subtitle">Here's what's happening with your tasks today</p>
        </div>
        <Link to="/projects" className="btn btn-primary">
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          New Project
        </Link>
      </div>

      <div className="stats-grid">
        <StatCard label="Total Tasks" value={stats.total} color="var(--accent)" icon="📋" />
        <StatCard label="In Progress" value={stats.in_progress} color="var(--blue)" icon="⚡" />
        <StatCard label="In Review" value={stats.review} color="var(--yellow)" icon="🔍" />
        <StatCard label="Completed" value={stats.done} color="var(--green)" icon="✅" />
        <StatCard label="Overdue" value={stats.overdue} color="var(--red)" icon="⚠️" />
      </div>

      <div className="dashboard-grid">
        <section className="tasks-section card">
          <h2>My Tasks</h2>
          {myTasks.length === 0 ? (
            <div className="empty-state">
              <div className="icon">🎉</div>
              <h3>All clear!</h3>
              <p>No tasks assigned to you right now</p>
            </div>
          ) : (
            <div className="task-list">
              {myTasks.map(task => (
                <Link to={`/projects/${task.project_id}`} key={task.id} className="task-row">
                  <div className={`status-dot dot-${task.status}`} />
                  <div className="task-row-info">
                    <span className="task-row-title">{task.title}</span>
                    <span className="task-row-project" style={{ color: task.project_color }}>
                      {task.project_name}
                    </span>
                  </div>
                  <div className="task-row-meta">
                    <span className={`badge badge-${task.priority}`}>{priorityLabel[task.priority]}</span>
                    {task.due_date && (
                      <span className={`due-date ${isPast(parseISO(task.due_date)) ? 'overdue' : ''}`}>
                        {format(parseISO(task.due_date), 'MMM d')}
                      </span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section className="activity-section card">
          <h2>Recent Activity</h2>
          {recentActivity.length === 0 ? (
            <div className="empty-state" style={{ padding: '40px 20px' }}>
              <div className="icon">🌱</div>
              <p>No activity yet</p>
            </div>
          ) : (
            <div className="activity-list">
              {recentActivity.map(item => (
                <Link to={`/projects/${item.project_id}`} key={item.id} className="activity-row">
                  <div className={`status-dot dot-${item.status}`} style={{ marginTop: 4 }} />
                  <div>
                    <p className="activity-title">{item.title}</p>
                    <p className="activity-meta">
                      <span style={{ color: item.project_color }}>{item.project_name}</span>
                      {' · '}
                      <span className={`badge badge-${item.status}`} style={{ padding: '1px 6px', fontSize: 11 }}>
                        {statusLabel[item.status]}
                      </span>
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function getTimeOfDay() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}
