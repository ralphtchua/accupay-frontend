import { useEffect, useState } from 'react';
import type { Employee, Role } from '@/types/domain';
import {
  getEmployees, getEmployee, getRoles, changeEmployeeRole,
  addApprover, removeApprover, generatePassword, resetEmployeePassword,
} from '@/lib/api';
import { Avatar, Card, Chip } from '@/components/ui';
import { Table, Td, EmptyState } from '@/components/page';
import { TextInput } from '@/components/form';
import { ConfirmModal } from '@/components/ConfirmModal';
import { useToast } from '@/components/Toast';
import { fmtLong } from '@/lib/format';

/* =====================================================================
   Employees & Contractors — matches the prototype: a directory table
   that opens a full-page detail on click. Detail supports changing the
   role (5 roles from Roles & Permissions), adding/removing approvers
   per filing type, and resetting the password (with auto-generate).
   ===================================================================== */

const APPROVER_CATS: { cat: 'timelog' | 'ot' | 'leave'; label: string }[] = [
  { cat: 'timelog', label: 'Time Log approvers' },
  { cat: 'ot', label: 'Overtime approvers' },
  { cat: 'leave', label: 'Leave approvers' },
];

/* ---------- Detail view ---------- */
function EmployeeDetail({
  emp, roles, onBack, onChanged,
}: { emp: Employee; roles: Role[]; onBack: () => void; onChanged: (e: Employee) => void }) {
  const { notify } = useToast();
  const [drafts, setDrafts] = useState<Record<string, string>>({ timelog: '', ot: '', leave: '' });
  const [resetOpen, setResetOpen] = useState(false);
  const [pw, setPw] = useState('');

  async function role(e: React.ChangeEvent<HTMLSelectElement>) {
    const updated = await changeEmployeeRole(emp.id, e.target.value);
    onChanged(updated);
    notify('Role updated');
  }
  async function add(cat: 'timelog' | 'ot' | 'leave') {
    const email = (drafts[cat] || '').trim();
    if (!email) return;
    const updated = await addApprover(emp.id, cat, email);
    onChanged(updated);
    setDrafts((d) => ({ ...d, [cat]: '' }));
  }
  async function remove(cat: 'timelog' | 'ot' | 'leave', idx: number) {
    const updated = await removeApprover(emp.id, cat, idx);
    onChanged(updated);
  }
  async function confirmReset() {
    if (!pw.trim()) { notify('Enter or generate a password first'); return; }
    await resetEmployeePassword(emp.id, pw);
    setResetOpen(false); setPw('');
    notify('Password reset — new password set');
  }

  return (
    <Card style={{ maxWidth: 700, padding: '24px 28px' }}>
      <button onClick={onBack} style={{ border: 'none', background: 'transparent', color: 'var(--ao-primary)', font: '600 13px var(--ao-font)', cursor: 'pointer', padding: 0, marginBottom: 18 }}>
        ‹ Back to directory
      </button>

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 22 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Avatar name={emp.name} size={62} />
          <div>
            <div style={{ font: '700 19px var(--ao-font)' }}>{emp.name}</div>
            <div style={{ font: '400 13px var(--ao-font)', color: 'var(--ao-muted)' }}>{emp.title} · {emp.clientName ?? 'Internal'}</div>
          </div>
        </div>
        <button onClick={() => { setResetOpen(true); setPw(''); }}
          style={{ height: 40, padding: '0 18px', background: '#fff', color: 'var(--ao-primary)', border: '1px solid #b9c2dd', borderRadius: 9, font: '700 13px var(--ao-font)', cursor: 'pointer', flexShrink: 0 }}>
          Reset password
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px 24px', marginBottom: 22 }}>
        <DetailField label="Employee ID" value={emp.empCode} />
        <DetailField label="Type" value={emp.employeeType} />
        <DetailField label="Client" value={emp.clientName ?? 'Internal'} />
        <DetailField label="Email" value={emp.email} />
        <DetailField label="Phone" value={emp.phone ?? '—'} />
        <DetailField label="Date hired" value={fmtLong(emp.dateHired)} />
        <div>
          <div style={{ font: '500 11px var(--ao-font)', color: 'var(--ao-muted-2)', marginBottom: 5 }}>Role</div>
          <select value={emp.roleName} onChange={role}
            style={{ width: '100%', height: 38, border: '1px solid var(--ao-border-strong)', borderRadius: 9, background: 'var(--ao-surface-muted)', padding: '0 10px', font: '13px var(--ao-font)', color: 'var(--ao-text)', outline: 'none' }}>
            {roles.map((r) => <option key={r.id} value={r.name}>{r.name}</option>)}
          </select>
        </div>
      </div>

      <div style={{ borderTop: '1px solid var(--ao-border-soft)', paddingTop: 18 }}>
        <div style={{ font: '700 14px var(--ao-font)', marginBottom: 4 }}>Approvers</div>
        <div style={{ font: '400 12px var(--ao-font)', color: 'var(--ao-muted-2)', marginBottom: 14 }}>
          Add one or more approvers per filing type. Filings route to all listed approvers.
        </div>
        {APPROVER_CATS.map(({ cat, label }) => (
          <div key={cat} style={{ marginBottom: 16 }}>
            <div style={{ font: '600 12px var(--ao-font)', color: 'var(--ao-text-3)', marginBottom: 7 }}>{label}</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, alignItems: 'center' }}>
              {emp.approvers[cat].map((email, i) => (
                <span key={email + i} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: 'var(--ao-info-bg)', color: 'var(--ao-primary)', borderRadius: 7, padding: '6px 9px', font: '600 12px var(--ao-font)' }}>
                  {email}
                  <span onClick={() => remove(cat, i)} style={{ cursor: 'pointer', color: 'var(--ao-nav-header)', fontWeight: 700 }}>×</span>
                </span>
              ))}
              <input
                value={drafts[cat]}
                onChange={(e) => setDrafts((d) => ({ ...d, [cat]: e.target.value }))}
                onKeyDown={(e) => e.key === 'Enter' && add(cat)}
                placeholder="add approver email"
                style={{ flex: 1, minWidth: 160, height: 34, border: '1px solid var(--ao-border-strong)', borderRadius: 7, background: 'var(--ao-surface-muted)', padding: '0 10px', font: '13px var(--ao-font)', color: 'var(--ao-text)', outline: 'none' }}
              />
              <button onClick={() => add(cat)} style={{ height: 34, padding: '0 14px', background: 'var(--ao-primary)', color: '#fff', border: 'none', borderRadius: 7, font: '600 12px var(--ao-font)', cursor: 'pointer' }}>Add</button>
            </div>
          </div>
        ))}
      </div>

      {/* Reset password modal with Generate */}
      <ConfirmModal
        open={resetOpen}
        width={430}
        title="Reset password"
        confirmLabel="Reset password"
        onCancel={() => { setResetOpen(false); setPw(''); }}
        onConfirm={confirmReset}
        confirmDisabled={!pw.trim()}
        body={
          <div style={{ marginTop: 4 }}>
            <div style={{ font: '400 13px/1.5 var(--ao-font)', color: 'var(--ao-text-3)', marginBottom: 18 }}>
              Set a new password for <b>{emp.name}</b>. Share it securely — they'll be asked to change it at next sign-in.
            </div>
            <label className="ao-label">New password</label>
            <div style={{ display: 'flex', gap: 9 }}>
              <input value={pw} onChange={(e) => setPw(e.target.value)} placeholder="Enter or generate"
                style={{ flex: 1, height: 42, border: '1px solid var(--ao-border-strong)', borderRadius: 9, background: 'var(--ao-surface-muted)', padding: '0 12px', font: '14px var(--ao-font-mono)', color: 'var(--ao-text)', outline: 'none' }} />
              <button onClick={() => setPw(generatePassword())}
                style={{ height: 42, padding: '0 16px', background: 'var(--ao-info-bg)', color: 'var(--ao-primary)', border: 'none', borderRadius: 9, font: '700 12px var(--ao-font)', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                Generate
              </button>
            </div>
          </div>
        }
      />
    </Card>
  );
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ font: '500 11px var(--ao-font)', color: 'var(--ao-muted-2)' }}>{label}</div>
      <div style={{ font: '600 14px var(--ao-font)' }}>{value}</div>
    </div>
  );
}

/* ---------- Directory + page shell ---------- */
export function EmployeesPage() {
  const [rows, setRows] = useState<Employee[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [q, setQ] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);

  async function load(query?: string) {
    setLoading(true);
    setRows(await getEmployees(query));
    setLoading(false);
  }
  useEffect(() => { load(); getRoles().then(setRoles); }, []);

  async function open(id: string) {
    setSelectedId(id);
    setSelected((await getEmployee(id)) ?? null);
  }
  function back() { setSelectedId(null); setSelected(null); load(q); }

  if (selectedId && selected) {
    return (
      <EmployeeDetail
        emp={selected}
        roles={roles}
        onBack={back}
        onChanged={(e) => { setSelected(e); }}
      />
    );
  }

  return (
    <Card style={{ maxWidth: 820, padding: '22px 24px' }}>
      <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
        <TextInput placeholder="Search name or email" value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && load(q)} />
        <button className="ao-btn ao-btn--primary" style={{ height: 42, padding: '0 18px' }} onClick={() => load(q)}>Search</button>
      </div>

      {loading ? (
        <EmptyState message="Loading employees…" />
      ) : rows.length === 0 ? (
        <EmptyState message="No employees found." />
      ) : (
        <Table head={['Name', 'Employee Type', 'Role', 'Client', 'Status']}>
          {rows.map((e) => (
            <tr key={e.id} style={{ cursor: 'pointer' }} onClick={() => open(e.id)}>
              <Td>
                <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                  <Avatar name={e.name} size={34} filled={false} />
                  <div>
                    <div style={{ font: '600 13px var(--ao-font)', color: 'var(--ao-text)' }}>{e.name}</div>
                    <div style={{ font: '400 11px var(--ao-font)', color: 'var(--ao-muted-2)' }}>{e.title}</div>
                  </div>
                </div>
              </Td>
              <Td>{e.employeeType}</Td>
              <Td>{e.roleName}</Td>
              <Td>{e.clientName ?? 'Internal'}</Td>
              <Td><Chip status={e.status} /></Td>
            </tr>
          ))}
        </Table>
      )}
    </Card>
  );
}
