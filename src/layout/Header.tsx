import { useLocation } from 'react-router-dom';
import { Avatar } from '@/components/ui';
import { PAGE_TITLES } from './nav';
import { useCurrentUser } from '@/context/CurrentUserContext';
import { profileIdentity } from '@/lib/identity';

/* =====================================================================
   Header — 66px white bar: page title (left) + the signed-in user's
   identity (right). Access is strictly role-based, so there is no
   "view as" switcher — each account only sees its own app. Employees
   show their job title + employee ID; admins keep the role + org.
   ===================================================================== */

export function Header() {
  const { user, organization, role, employeeId, loading } = useCurrentUser();
  const location = useLocation();
  const title = PAGE_TITLES[location.pathname] ?? '';

  const id = profileIdentity(user, employeeId, role);
  const displayName = id.name || (loading ? 'Loading…' : 'Unknown user');
  // Employees: "Job Title · AO-00481". Admins: "Role · Organization".
  const identitySub = id.isEmployee
    ? [id.title, id.employeeId].filter(Boolean).join(' · ')
    : organization?.name
      ? `${id.roleLabel} · ${organization.name}`
      : id.roleLabel;

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
