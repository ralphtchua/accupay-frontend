import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { getEmployees, getEmployee, type ApiEmployee } from '@/services/EmployeesService';
import { Avatar, Card, Chip } from '@/components/ui';
import { Table, Td, EmptyState } from '@/components/page';
import { TextInput } from '@/components/form';
import { fmtLong } from '@/lib/format';

/* =====================================================================
   Employees & Contractors — real directory + detail (GET /api/employees,
   GET /api/employees/{id}). Read-only: the backend has no endpoints for
   reset-password, role assignment, or per-employee approvers, so those
   controls are shown disabled with a note. See docs/BACKEND_TODO_employees.md.
   ===================================================================== */

const NEEDS_BACKEND: CSSProperties = {
  font: '500 11px var(--ao-font)',
  color: 'var(--ao-pending)',
  marginTop: 5,
};

function displayName(e: ApiEmployee): string {
  return [e.firstName, e.lastName].filter(Boolean).join(' ') || e.fullName || e.employeeNo || '—';
}
function phoneOf(e: ApiEmployee): string {
  return e.mobileNo || e.workPhone || '—';
}
function hiredOf(e: ApiEmployee): string {
  return fmtLong(e.startDate ? e.startDate.split('T')[0] : null);
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ font: '500 11px var(--ao-font)', color: 'var(--ao-muted-2)' }}>{label}</div>
      <div style={{ font: '600 14px var(--ao-font)' }}>{value}</div>
    </div>
  );
}

const APPROVER_CATS = ['Time Log approvers', 'Overtime approvers', 'Leave approvers'];

/* ---------- Detail view ---------- */
function EmployeeDetail({ emp, onBack }: { emp: ApiEmployee; onBack: () => void }) {
  const name = displayName(emp);
  return (
    <Card style={{ maxWidth: 700, padding: '24px 28px' }}>
      <button onClick={onBack} style={{ border: 'none', background: 'transparent', color: 'var(--ao-primary)', font: '600 13px var(--ao-font)', cursor: 'pointer', padding: 0, marginBottom: 18 }}>
        ‹ Back to directory
      </button>

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 22 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Avatar name={name} size={62} />
          <div>
            <div style={{ font: '700 19px var(--ao-font)' }}>{name}</div>
            <div style={{ font: '400 13px var(--ao-font)', color: 'var(--ao-muted)' }}>{emp.position?.name ?? '—'}</div>
          </div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <button disabled title="No reset-password endpoint exists yet"
            style={{ height: 40, padding: '0 18px', background: '#fff', color: 'var(--ao-muted)', border: '1px solid var(--ao-border)', borderRadius: 9, font: '700 13px var(--ao-font)', cursor: 'not-allowed', opacity: 0.6 }}>
            Reset password
          </button>
          <div style={NEEDS_BACKEND}>No endpoint yet</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px 24px', marginBottom: 22 }}>
        <DetailField label="Employee ID" value={emp.employeeNo ?? '—'} />
        <DetailField label="Type" value={emp.employeeType ?? '—'} />
        <DetailField label="Email" value={emp.emailAddress ?? '—'} />
        <DetailField label="Phone" value={phoneOf(emp)} />
        <DetailField label="Date hired" value={hiredOf(emp)} />
        <DetailField label="Status" value={emp.employmentStatus ?? '—'} />
        <div>
          <div style={{ font: '500 11px var(--ao-font)', color: 'var(--ao-muted-2)', marginBottom: 5 }}>Role</div>
          <select disabled value=""
            style={{ width: '100%', height: 38, border: '1px solid var(--ao-border)', borderRadius: 9, background: 'var(--ao-surface-muted)', padding: '0 10px', font: '13px var(--ao-font)', color: 'var(--ao-muted)', cursor: 'not-allowed' }}>
            <option value="">— not available —</option>
          </select>
          <div style={NEEDS_BACKEND}>Role assignment needs a backend endpoint (see spec).</div>
        </div>
        <div>
          <div style={{ font: '500 11px var(--ao-font)', color: 'var(--ao-muted-2)', marginBottom: 5 }}>Client</div>
          <div style={{ font: '600 14px var(--ao-font)', color: 'var(--ao-muted)' }}>—</div>
          <div style={NEEDS_BACKEND}>Not returned by the employee API.</div>
        </div>
      </div>

      <div style={{ borderTop: '1px solid var(--ao-border-soft)', paddingTop: 18 }}>
        <div style={{ font: '700 14px var(--ao-font)', marginBottom: 4 }}>Approvers</div>
        <div style={NEEDS_BACKEND}>
          Per-employee approvers aren't supported by the backend yet — there's no approver table or
          endpoint. See docs/BACKEND_TODO_employees.md for what's needed to enable this.
        </div>
        <div style={{ marginTop: 12, opacity: 0.55, pointerEvents: 'none' }}>
          {APPROVER_CATS.map((label) => (
            <div key={label} style={{ marginBottom: 12 }}>
              <div style={{ font: '600 12px var(--ao-font)', color: 'var(--ao-text-3)', marginBottom: 6 }}>{label}</div>
              <div style={{ height: 34, display: 'flex', alignItems: 'center', border: '1px solid var(--ao-border)', borderRadius: 7, background: 'var(--ao-surface-muted)', padding: '0 10px', font: '13px var(--ao-font)', color: 'var(--ao-muted-2)' }}>
                add approver email
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

/* ---------- Directory + page shell ---------- */
export function EmployeesPage() {
  const [rows, setRows] = useState<ApiEmployee[]>([]);
  const [q, setQ] = useState('');
  const [selected, setSelected] = useState<ApiEmployee | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        setRows(await getEmployees());
      } catch {
        setRows([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter(
      (e) =>
        displayName(e).toLowerCase().includes(term) ||
        (e.emailAddress ?? '').toLowerCase().includes(term) ||
        (e.employeeNo ?? '').toLowerCase().includes(term),
    );
  }, [rows, q]);

  async function open(id: number) {
    const full = await getEmployee(id).catch(() => null);
    if (full) setSelected(full);
  }

  if (selected) return <EmployeeDetail emp={selected} onBack={() => setSelected(null)} />;

  return (
    <Card style={{ maxWidth: 820, padding: '22px 24px' }}>
      <div style={{ marginBottom: 16 }}>
        <TextInput
          placeholder="Search name, email, or ID"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      {loading ? (
        <EmptyState message="Loading employees…" />
      ) : filtered.length === 0 ? (
        <EmptyState message="No employees found." />
      ) : (
        <Table head={['Name', 'Employee ID', 'Type', 'Status']}>
          {filtered.map((e) => (
            <tr key={e.id} style={{ cursor: 'pointer' }} onClick={() => open(e.id)}>
              <Td>
                <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                  <Avatar name={displayName(e)} size={34} filled={false} />
                  <div>
                    <div style={{ font: '600 13px var(--ao-font)', color: 'var(--ao-text)' }}>{displayName(e)}</div>
                    <div style={{ font: '400 11px var(--ao-font)', color: 'var(--ao-muted-2)' }}>{e.position?.name ?? '—'}</div>
                  </div>
                </div>
              </Td>
              <Td>{e.employeeNo ?? '—'}</Td>
              <Td>{e.employeeType ?? '—'}</Td>
              <Td><Chip status={e.employmentStatus ?? '—'} /></Td>
            </tr>
          ))}
        </Table>
      )}
    </Card>
  );
}
