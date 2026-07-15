import { useLocation } from 'react-router-dom';
import { Avatar } from '@/components/ui';
import { PAGE_TITLES } from './nav';
import { useCurrentUser } from '@/context/CurrentUserContext';

/* =====================================================================
   Header — 66px white bar: page title (left) + the signed-in user's
   identity (right). Access is strictly role-based, so there is no
   "view as" switcher — each account only sees its own app.
   ===================================================================== */

export function Header() {
  const { user, organization, role, loading } = useCurrentUser();
  const location = useLocation();
  const title = PAGE_TITLES[location.pathname] ?? '';

  // Real identity from the API (degrades gracefully while it loads).
  const displayName =
    [user?.firstName, user?.lastName].filter(Boolean).join(' ') ||
    user?.email ||
    (loading ? 'Loading…' : 'Unknown user');
  const roleLabel =
    role?.name ?? (user?.type === 'Admin' ? 'Administrator' : 'Employee');
  const identitySub = organization?.name
    ? `${roleLabel} · ${organization.name}`
    : roleLabel;

  return (
    <header
      style={{
        height: 'var(--ao-header-h)', flexShrink: 0, background: 'var(--ao-surface)',
        borderBottom: '1px solid var(--ao-border)', display: 'flex',
        alignItems: 'center', justifyContent: 'space-between', padding: '0 28px',
      }}
    >
      <div style={{ font: '700 20px var(--ao-font)' }}>{title}</div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
        <div style={{ textAlign: 'right' }}>
          <div style={{ font: '600 13px var(--ao-font)' }}>{displayName}</div>
          <div style={{ font: '400 11px var(--ao-font)', color: 'var(--ao-muted)' }}>{identitySub}</div>
        </div>
        <Avatar name={displayName} size={38} />
      </div>
    </header>
  );
}
