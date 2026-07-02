import { useEffect, useState } from 'react';
import type { Employee } from '@/types/domain';
import { getEmployees } from '@/lib/api';
import { Avatar, Card, Chip } from '@/components/ui';
import { PageIntro, Table, Td, EmptyState } from '@/components/page';
import { ConfirmModal } from '@/components/ConfirmModal';
import { TextInput } from '@/components/form';
import { useToast } from '@/components/Toast';
import { fmtLong } from '@/lib/format';

/* =====================================================================
   Employees — searchable directory; clicking a row opens a detail panel
   with role, approvers, and a reset-password action. Mirrors the
   prototype Employees directory + detail.
   ===================================================================== */

function DetailPanel({ emp, onClose, onReset }: { emp: Employee; onClose: () => void; onReset: () => void }) {
  return (
    <Card style={{ padding: 22, position: 'sticky', top: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 13, marginBottom: 16 }}>
        <Avatar name={emp.name} size={48} />
        <div style={{ flex: 1 }}>
          <div style={{ font: '700 16px var(--ao-font)' }}>{emp.name}</div>
          <div style={{ font: '400 12px var(--ao-font)', color: 'var(--ao-muted)' }}>{emp.title} · {emp.empCode}</div>
        </div>
        <button className="ao-btn ao-btn--ghost" style={{ height: 32, width: 32, padding: 0, fontSize: 16 }} onClick={onClose}>×</button>
      </div>

      <DRow label="Status" value={<Chip status={emp.status} />} />
      <DRow label="Email" value={emp.email} />
      <DRow label="Client" value={emp.clientName ?? 'Internal'} />
      <DRow label="Role" value={emp.roleName} />
      <DRow label="Type" value={emp.employeeType} />
      <DRow label="Hired" value={fmtLong(emp.dateHired)} />

      <div style={{ marginTop: 16, font: '600 11px var(--ao-font)', color: 'var(--ao-muted)', textTransform: 'uppercase', letterSpacing: '.5px' }}>Approvers</div>
      {(['timelog', 'ot', 'leave'] as const).map((k) => (
        <DRow key={k} label={k === 'ot' ? 'Overtime' : k === 'timelog' ? 'Time log' : 'Leave'}
          value={emp.approvers[k].length ? emp.approvers[k].join(', ') : '—'} />
      ))}

      <button className="ao-btn ao-btn--ghost" style={{ height: 40, padding: '0 16px', marginTop: 18, width: '100%' }} onClick={onReset}>
        Reset password
      </button>
    </Card>
  );
}

function DRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: '1px solid var(--ao-border-soft)' }}>
      <span style={{ font: '500 12px var(--ao-font)', color: 'var(--ao-muted)' }}>{label}</span>
      <span style={{ font: '600 12.5px var(--ao-font)', color: 'var(--ao-text)', textAlign: 'right', maxWidth: 200 }}>{value}</span>
    </div>
  );
}

export function EmployeesPage() {
  const { notify } = useToast();
  const [rows, setRows] = useState<Employee[]>([]);
  const [q, setQ] = useState('');
  const [selected, setSelected] = useState<Employee | null>(null);
  const [resetOpen, setResetOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  async function load(query?: string) {
    setLoading(true);
    setRows(await getEmployees(query));
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  return (
    <div>
      <PageIntro title="Employees & Contractors" subtitle="Directory of everyone across your clients." />

      <div style={{ display: 'flex', gap: 18, alignItems: 'flex-start' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <Card style={{ padding: '12px 14px', marginBottom: 14 }}>
            <div style={{ display: 'flex', gap: 10 }}>
              <TextInput placeholder="Search by name or email…" value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && load(q)} />
              <button className="ao-btn ao-btn--primary" style={{ height: 42, padding: '0 18px' }} onClick={() => load(q)}>Search</button>
            </div>
          </Card>

          <Card style={{ overflow: 'hidden' }}>
            {loading ? (
              <EmptyState message="Loading employees…" />
            ) : rows.length === 0 ? (
              <EmptyState message="No employees found." />
            ) : (
              <Table head={['Name', 'Client', 'Role', 'Type', 'Status']}>
                {rows.map((e) => (
                  <tr key={e.id} style={{ cursor: 'pointer', background: selected?.id === e.id ? 'var(--ao-surface-soft)' : undefined }}
                    onClick={() => setSelected(e)}>
                    <Td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Avatar name={e.name} size={32} filled={false} />
                        <div>
                          <div style={{ font: '600 13px var(--ao-font)', color: 'var(--ao-text)' }}>{e.name}</div>
                          <div style={{ font: '400 11px var(--ao-font)', color: 'var(--ao-muted)' }}>{e.email}</div>
                        </div>
                      </div>
                    </Td>
                    <Td>{e.clientName ?? 'Internal'}</Td>
                    <Td>{e.roleName}</Td>
                    <Td>{e.employeeType}</Td>
                    <Td><Chip status={e.status} /></Td>
                  </tr>
                ))}
              </Table>
            )}
          </Card>
        </div>

        {selected && (
          <div style={{ width: 320, flexShrink: 0 }}>
            <DetailPanel emp={selected} onClose={() => setSelected(null)} onReset={() => setResetOpen(true)} />
          </div>
        )}
      </div>

      <ConfirmModal
        open={resetOpen}
        title="Reset password?"
        confirmLabel="Reset & notify"
        body={selected ? `${selected.name} will be asked to set a new password at next sign-in.` : ''}
        onConfirm={() => { setResetOpen(false); notify('Password reset — the employee has been notified'); }}
        onCancel={() => setResetOpen(false)}
      />
    </div>
  );
}
