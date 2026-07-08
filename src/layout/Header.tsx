import { useLocation, useNavigate } from 'react-router-dom';
import type { ViewGroup } from '@/types/domain';
import { Avatar } from '@/components/ui';
import { PAGE_TITLES, VIEW_DEFAULT_ROUTE } from './nav';
import { useView } from './ViewContext';
import { useCurrentUser } from '@/context/CurrentUserContext';

/* =====================================================================
   Header — 66px white bar: page title (left), "View as" segmented
   control + the real signed-in user's identity (right).
   ===================================================================== */

const ROLES: { key: ViewGroup; label: string }[] = [
  { key: 'employee', label: 'Employee' },
  { key: 'approver', label: 'Approver' },
  { key: 'admin', label: 'Admin' },
];

export function Header() {
  const { view, setView } = useView();
  const { user, organization, role, loading } = useCurrentUser();
  const location = useLocation();
  const navigate = useNavigate();
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

  const switchView = (v: ViewGroup) => {
    setView(v);
    navigate(VIEW_DEFAULT_ROUTE[v]);
  };

  return (
    <header
      style={{
        height: 'var(--ao-header-h)', flexShrink: 0, background: 'var(--ao-surface)',
        borderBottom: '1px solid var(--ao-border)', display: 'flex',
        alignItems: 'center', justifyContent: 'space-between', padding: '0 28px',
      }}
    >
      <div style={{ font: '700 20px var(--ao-font)' }}>{title}</div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <span
            style={{
              font: '600 10px var(--ao-font)', color: 'var(--ao-muted-2)',
              textTransform: 'uppercase', letterSpacing: '.6px',
            }}
          >
            View as
          </span>
          <div style={{ display: 'flex', gap: 3, background: '#eef1f5', padding: 4, borderRadius: 9 }}>
            {ROLES.map((r) => {
              const active = view === r.key;
              return (
                <button
                  key={r.key}
                  onClick={() => switchView(r.key)}
                  style={{
                    border: 'none', cursor: 'pointer', padding: '7px 14px', borderRadius: 7,
                    font: '600 12px var(--ao-font)', transition: '.15s',
                    background: active ? 'var(--ao-primary)' : 'transparent',
                    color: active ? '#fff' : 'var(--ao-text-3)',
                  }}
                >
                  {r.label}
                </button>
              );
            })}
          </div>
        </div>

        <div
          style={{
            display: 'flex', alignItems: 'center', gap: 11,
            borderLeft: '1px solid var(--ao-border)', paddingLeft: 20,
          }}
        >
          <div style={{ textAlign: 'right' }}>
            <div style={{ font: '600 13px var(--ao-font)' }}>{displayName}</div>
            <div style={{ font: '400 11px var(--ao-font)', color: 'var(--ao-muted)' }}>{identitySub}</div>
          </div>
          <Avatar name={displayName} size={38} />
        </div>
      </div>
    </header>
  );
}
