import { NavLink, useNavigate } from 'react-router-dom';
import logo from '@/assets/logo.png';
import { NAV } from './nav';
import { useView } from './ViewContext';

/* =====================================================================
   Sidebar — 236px navy rail with logo, sectioned nav, and sign out.
   Active item styling matches the prototype (translucent white pill).
   ===================================================================== */

export function Sidebar() {
  const { view } = useView();
  const navigate = useNavigate();

  return (
    <aside
      style={{
        width: 'var(--ao-sidebar-w)', background: 'var(--ao-primary)',
        display: 'flex', flexDirection: 'column', padding: '18px 14px', flexShrink: 0,
      }}
    >
      <img src={logo} alt="Access Offshoring" style={{ width: 150, display: 'block', margin: '4px 3px 20px' }} />

      <nav style={{ flex: 1, overflow: 'auto' }}>
        {NAV[view].map((node, i) =>
          node.kind === 'header' ? (
            <div
              key={`h${i}`}
              style={{
                font: '600 10px var(--ao-font-mono)', color: 'var(--ao-nav-header)',
                letterSpacing: '.7px', margin: '16px 7px 7px',
              }}
            >
              {node.label}
            </div>
          ) : (
            <NavLink
              key={node.path}
              to={node.path}
              style={({ isActive }) => ({
                display: 'flex', alignItems: 'center', gap: 9, width: '100%',
                textAlign: 'left', border: 'none', cursor: 'pointer',
                padding: '9px 11px', borderRadius: 8, fontSize: 13, marginBottom: 2,
                textDecoration: 'none', transition: 'background .15s',
                background: isActive ? 'rgba(255,255,255,0.15)' : 'transparent',
                color: isActive ? '#ffffff' : 'var(--ao-nav-idle)',
                fontWeight: isActive ? 700 : 500,
              })}
            >
              {node.label}
            </NavLink>
          ),
        )}
      </nav>

      <button
        onClick={() => navigate('/login')}
        className="ao-signout"
        style={{
          display: 'flex', alignItems: 'center', gap: 8, width: '100%',
          textAlign: 'left', border: 'none', cursor: 'pointer', background: 'transparent',
          color: 'var(--ao-nav-signout)', padding: '10px 11px', borderRadius: 8,
          font: '500 13px var(--ao-font)', marginTop: 8,
        }}
      >
        Sign out
        <style>{`.ao-signout:hover { background: rgba(255,255,255,0.08); color: #fff; }`}</style>
      </button>
    </aside>
  );
}
