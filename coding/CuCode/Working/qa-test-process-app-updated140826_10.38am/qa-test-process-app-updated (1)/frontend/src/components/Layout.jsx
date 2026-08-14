import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { entities, navGroups } from '../config/entities';
import { useAuth } from '../context/AuthContext';
import { hasReportAccess, isSuperAdmin } from '../utils/roles';
import logo from '../assets/milkosens-logo.png';

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <img src={logo} alt="MilkoSens" style={{ width: 40, height: 'auto', display: 'block', marginBottom: 8 }} />
          <span className="tag">REIL MilkoSens</span>
          <h1>Milkosens QA<br />Test Process</h1>
        </div>

        <NavLink to="/" end className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
          Dashboard
        </NavLink>

        {hasReportAccess(user) && (
          <div>
            <div className="sidebar-group-title">
              Admin Reports{isSuperAdmin(user) ? ' (Super Admin)' : ''}
            </div>
            <NavLink
              to="/reports/component-test"
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
              style={{ fontWeight: 600 }}
            >
              ▸ Component Test Report
            </NavLink>
            <NavLink
              to="/reports/milkosens-test"
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
              style={{ fontWeight: 600 }}
            >
              ▸ MilkoSens Test Report
            </NavLink>
          </div>
        )}

        {navGroups.map((group) => (
          <div key={group.title}>
            <div className="sidebar-group-title">{group.title}</div>

            {group.processLinks && group.processLinks.map((link) => (
  <NavLink
    key={link.path}
    to={link.path}
    className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
    style={{ fontWeight: 600 }}
  >
    ▸ {link.label}
  </NavLink>
))}
           
            {group.items.map((key) => (
              <NavLink
                key={key}
                to={`/master/${entities[key].key}`}
                className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
              >
                {entities[key].title}
              </NavLink>
            ))}
          </div>
        ))}
      </aside>

      <div className="main-area">
        <header className="topbar">
          <h2>Web Application</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <span className="user-chip">
              {user?.LoginID} · {user?.UserLevel}
            </span>
            <button className="btn btn-outline btn-sm" onClick={handleLogout}>Log out</button>
          </div>
        </header>
        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
