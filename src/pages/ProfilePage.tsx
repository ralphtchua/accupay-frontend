import { useEffect, useState } from 'react';
import type { Employee } from '@/types/domain';
import { getCurrentEmployee } from '@/lib/api';
import { Avatar, Card, Chip } from '@/components/ui';
import { PageIntro, EmptyState } from '@/components/page';
import { ConfirmModal } from '@/components/ConfirmModal';
import { Field, TextInput } from '@/components/form';
import { useToast } from '@/components/Toast';
import { fmtLong } from '@/lib/format';

/* =====================================================================
   My Profile — read-only identity details + a change-password action.
   Mirrors the prototype My Profile screen.
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
  const [me, setMe] = useState<Employee | null>(null);
  const [pwOpen, setPwOpen] = useState(false);
  const [cur, setCur] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');

  useEffect(() => { getCurrentEmployee().then(setMe); }, []);

  if (!me) return <EmptyState message="Loading profile…" />;

  const tooShort = next.length > 0 && next.length < 8;
  const mismatch = confirm.length > 0 && next !== confirm;
  const canSubmit = cur && next.length >= 8 && next === confirm;

  function resetPw() { setPwOpen(false); setCur(''); setNext(''); setConfirm(''); }
  function submitPw() {
    if (!canSubmit) return;
    resetPw();
    notify('Password updated');
  }

  return (
    <div style={{ maxWidth: 620 }}>
      <PageIntro title="My Profile" subtitle="Your account and employment details." />

      <Card style={{ padding: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 18 }}>
          <Avatar name={me.name} size={62} />
          <div>
            <div style={{ font: '700 19px var(--ao-font)' }}>{me.name}</div>
            <div style={{ font: '400 13px var(--ao-font)', color: 'var(--ao-muted)' }}>{me.title} · {me.clientName ?? 'Internal'}</div>
            <div style={{ marginTop: 6 }}><Chip status={me.status} /></div>
          </div>
        </div>

        <Row label="Employee ID" value={me.empCode} />
        <Row label="Email" value={me.email} />
        <Row label="Phone" value={me.phone ?? '—'} />
        <Row label="Role" value={me.roleName} />
        <Row label="Employee type" value={me.employeeType} />
        <Row label="Date hired" value={fmtLong(me.dateHired)} />

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
