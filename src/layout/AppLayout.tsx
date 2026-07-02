import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

/* =====================================================================
   AppLayout — the authenticated shell: sidebar + header + scrolling
   content area. Routed pages render into <Outlet />.
   ===================================================================== */

export function AppLayout() {
  return (
    <div style={{ height: '100vh', display: 'flex', background: 'var(--ao-bg)', color: 'var(--ao-text)' }}>
      <Sidebar />
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <Header />
        <div style={{ flex: 1, overflow: 'auto', padding: '28px 32px' }}>
          <Outlet />
        </div>
      </main>
    </div>
  );
}
