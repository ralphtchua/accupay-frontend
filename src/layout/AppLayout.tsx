import { Navigate, Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { CurrentUserProvider } from '@/context/CurrentUserContext';
import { tokenService } from '@/services/TokenService';

/* =====================================================================
   AppLayout — the authenticated shell: sidebar + header + scrolling
   content area. Routed pages render into <Outlet />.
   Unauthenticated visitors are bounced to /login before the shell (and
   its API calls) ever mount. CurrentUserProvider then loads the signed-in
   user's real identity once and shares it with the shell.
   ===================================================================== */

export function AppLayout() {
  if (!tokenService.isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }

  return (
    <CurrentUserProvider>
      <div style={{ height: '100vh', display: 'flex', background: 'var(--ao-bg)', color: 'var(--ao-text)' }}>
        <Sidebar />
        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <Header />
          <div style={{ flex: 1, overflow: 'auto', padding: '28px 32px' }}>
            <Outlet />
          </div>
        </main>
      </div>
    </CurrentUserProvider>
  );
}
