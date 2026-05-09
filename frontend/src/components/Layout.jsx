import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Layout.css';

const icons = {
  dashboard: (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
      <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
      <rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
    </svg>
  ),
  projects: (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
    </svg>
  ),
  logout: (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
      <polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
  ),
  menu: (
    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
      <line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/>
    </svg>
  )
};

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const initials = user?.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0,2) || '?';

  return (
    <div className={`layout ${collapsed ? 'collapsed' : ''}`}>
      <aside className="sidebar">
        <div className="sidebar-top">
          <div className="logo">
            <div className="logo-mark">TF</div>
            {!collapsed && <span className="logo-text">TaskFlow</span>}
          </div>
          <button className="btn btn-icon btn-ghost collapse-btn" onClick={() => setCollapsed(!collapsed)}>
            {icons.menu}
          </button>
        </div>

        <nav className="sidebar-nav">
          <NavLink to="/dashboard" className={({isActive}) => `nav-item ${isActive ? 'active' : ''}`}>
            {icons.dashboard}
            {!collapsed && <span>Dashboard</span>}
            {collapsed && <span className="tooltip">Dashboard</span>}
          </NavLink>
          <NavLink to="/projects" className={({isActive}) => `nav-item ${isActive ? 'active' : ''}`}>
            {icons.projects}
            {!collapsed && <span>Projects</span>}
            {collapsed && <span className="tooltip">Projects</span>}
          </NavLink>
        </nav>

        <div className="sidebar-bottom">
          <div className="user-info">
            <div className="avatar" style={{ background: user?.avatar_color }}>
              {initials}
            </div>
            {!collapsed && (
              <div className="user-details">
                <span className="user-name">{user?.name}</span>
                <span className="user-email">{user?.email}</span>
              </div>
            )}
          </div>
          <button className="btn btn-icon btn-ghost logout-btn" onClick={handleLogout} title="Logout">
            {icons.logout}
          </button>
        </div>
      </aside>

      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
