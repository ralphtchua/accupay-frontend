import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { NAV, VIEW_DEFAULT_ROUTE, type NavItem } from './nav';
import { CurrentUserProvider, useCurrentUser } from '@/context/CurrentUserContext';
import { tokenService } from '@/services/TokenService';

/* =====================================================================
   AppLayout — the authenticated shell: sidebar + header + scrolling
   content area. Routed pages render into the guarded outlet.
   Unauthenticated visitors are bounced to /login before the shell (and
   its API calls) ever mount. CurrentUserProvider loads the signed-in
   user's real identity once and shares it with the shell.
   ===================================================================== */

/**
 * Only lets a user open routes that belong to their role's nav, so employees
 * can't reach admin pages and vice versa. "/" and any shared route (e.g.
 * /profile, which is in both navs) are allowed; everything else redirects to
 * the user's default landing route.
 */
function GuardedOutlet() {
  const { viewGroup, loading } = useCurrentUser();
  const location = useLocation();
  if (loading) return null; // wait for the real role before gating

  const allowed = new Set(
    NAV[viewGroup].filter((n): n is NavItem => n.kind === 'item').map((n) => n.path),
  );
  const path = location.pathname;
  if (path !== '/' && !allowed.has(path)) {
    return <Navigate to={VIEW_DEFAULT_ROUTE[viewGroup]} replace />;
  }
  return <Outlet />;
}

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
            <GuardedOutlet />
          </div>
        </main>
      </div>
    </CurrentUserProvider>
  );
}
