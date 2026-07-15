import { useState } from 'react';
import { Avatar, Card } from '@/components/ui';
import { PageIntro, EmptyState } from '@/components/page';
import { ConfirmModal } from '@/components/ConfirmModal';
import { Field, TextInput } from '@/components/form';
import { useToast } from '@/components/Toast';
import { useCurrentUser } from '@/context/CurrentUserContext';
import { changePassword } from '@/services/AuthService';

/* =====================================================================
   My Profile — real account identity from GET /api/account (+ org/role).
   Employment details (phone, employee ID, hire date) and password change
   have no self-service endpoint yet, so they're intentionally omitted.
   ===================================================================== */

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '13px 0', borderBottom: '1px solid var(--ao-border-soft)' }}>
      <span style={{ font: '500 13px var(--ao-font)', color: 'var(--ao-muted)' }}>{label}</span>
      <span style={{ font: '600 13px var(--ao-font)', color: 'var(--ao-text)' }}>{value}</span>
    </div>
  );
}

export function ProfilePage() {
  const { notify } = useToast();
  const { user, organization, role, loading } = useCurrentUser();
  const [pwOpen, setPwOpen] = useState(false);
  const [cur, setCur] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');

  if (loading && !user) return <EmptyState message="Loading profile…" />;

  const name =
    [user?.firstName, user?.lastName].filter(Boolean).join(' ') ||
    user?.email ||
    '—';
  const roleName = role?.name ?? user?.type ?? '—';

  const tooShort = next.length > 0 && next.length < 8;
  const mismatch = confirm.length > 0 && next !== confirm;
  const canSubmit = cur && next.length >= 8 && next === confirm;

  function resetPw() { setPwOpen(false); setCur(''); setNext(''); setConfirm(''); }
  async function submitPw() {
    if (!canSubmit) return;
    try {
      await changePassword(cur, next);
      resetPw();
      notify('Password updated');
    } catch (e) {
      notify((e as Error).message || 'Could not change password.');
    }
  }

  return (
    <div style={{ maxWidth: 620 }}>
      <PageIntro title="My Profile" subtitle="Your account details." />

      <Card style={{ padding: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 18 }}>
          <Avatar name={name} size={62} />
          <div>
            <div style={{ font: '700 19px var(--ao-font)' }}>{name}</div>
            <div style={{ font: '400 13px var(--ao-font)', color: 'var(--ao-muted)' }}>
              {roleName}{organization?.name ? ` · ${organization.name}` : ''}
            </div>
          </div>
        </div>

        <Row label="Email" value={user?.email ?? '—'} />
        <Row label="Role" value={roleName} />
        <Row label="Account type" value={user?.type ?? '—'} />
        <Row label="Organization" value={organization?.name ?? '—'} />

        <button className="ao-btn ao-btn--ghost" style={{ height: 42, padding: '0 18px', marginTop: 18 }} onClick={() => setPwOpen(true)}>
          Change password
        </button>
      </Card>

      <ConfirmModal
        open={pwOpen}
        title="Change password"
        width={420}
        confirmLabel="Update password"
        onCancel={resetPw}
        onConfirm={submitPw}
        confirmDisabled={!canSubmit}
        body={
          <div style={{ marginTop: 4 }}>
            <Field label="Current password"><TextInput type="password" value={cur} onChange={(e) => setCur(e.target.value)} /></Field>
            <Field label="New password" hint="At least 8 characters.">
              <TextInput type="password" value={next} onChange={(e) => setNext(e.target.value)} />
            </Field>
            <Field label="Confirm new password">
              <TextInput type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
            </Field>
            {tooShort && <div style={{ font: '500 12px var(--ao-font)', color: 'var(--ao-danger)' }}>Password must be at least 8 characters.</div>}
            {mismatch && <div style={{ font: '500 12px var(--ao-font)', color: 'var(--ao-danger)' }}>Passwords don't match.</div>}
          </div>
        }
      />
    </div>
  );
}
