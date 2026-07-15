import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react';
import { getEmployees, getEmployee, type ApiEmployee } from '@/services/EmployeesService';
import {
  getUsers,
  getRoles,
  getUserRoles,
  saveUserRoles,
  type ApiUser,
  type ApiRole,
} from '@/services/RolesService';
import { resetUserPassword } from '@/services/AuthService';
import { getApprovers, setApprovers, isValidEmail } from '@/services/ApproversService';
import { Avatar, Card, Chip } from '@/components/ui';
import { Table, Td, EmptyState } from '@/components/page';
import { TextInput } from '@/components/form';
import { ResetPasswordModal } from '@/components/ResetPasswordModal';
import { useToast } from '@/components/Toast';
import { fmtLong } from '@/lib/format';

/* =====================================================================
   Employees & Contractors — real directory + detail (GET /api/employees,
   GET /api/employees/{id}). For an employee linked to a user account by
   AspNetUser.EmployeeId (returned on /api/users), admins can reset the
   password and assign a role (via /api/roles + /api/roles/user-roles).
   Approvers are edited here and stored in the frontend as email addresses
   per employee (interim, until the backend approver table exists). Client
   isn't returned by the employee API.
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

/* ---------- Detail view ---------- */
function EmployeeDetail({
  emp, linkedUser, roles, currentRoleId, onAssignRole, onBack,
}: {
  emp: ApiEmployee;
  linkedUser: ApiUser | null;
  roles: ApiRole[];
  currentRoleId: number | null;
  onAssignRole: (userId: number, roleId: number | null) => Promise<void>;
  onBack: () => void;
}) {
  const { notify } = useToast();
  const name = displayName(emp);
  const [pwOpen, setPwOpen] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);
  const [savingRole, setSavingRole] = useState(false);

  async function submitReset(newPassword: string) {
    if (!linkedUser) return;
    setPwSaving(true);
    try {
      await resetUserPassword(linkedUser.id, newPassword);
      notify(`Password reset for ${name}`);
      setPwOpen(false);
    } catch (e) {
      notify((e as Error).message || 'Could not reset password');
    } finally {
      setPwSaving(false);
    }
  }

  async function changeRole(roleId: number | null) {
    if (!linkedUser) return;
    setSavingRole(true);
    try {
      await onAssignRole(linkedUser.id, roleId);
    } finally {
      setSavingRole(false);
    }
  }

  // Per-employee approver emails (frontend storage).
  const [approvers, setApproverList] = useState<string[]>([]);
  const [newApprover, setNewApprover] = useState('');
  useEffect(() => {
    setApproverList(getApprovers(emp.id));
  }, [emp.id]);

  function addApprover() {
    const email = newApprover.trim().toLowerCase();
    if (!isValidEmail(email)) {
      notify('Enter a valid email address.');
      return;
    }
    if (approvers.includes(email)) {
      notify('That approver is already added.');
      setNewApprover('');
      return;
    }
    const next = [...approvers, email];
    setApprovers(emp.id, next);
    setApproverList(next);
    setNewApprover('');
    notify('Approver added');
  }

  function removeApprover(email: string) {
    const next = approvers.filter((a) => a !== email);
    setApprovers(emp.id, next);
    setApproverList(next);
  }

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
          <button
            disabled={!linkedUser}
            onClick={() => linkedUser && setPwOpen(true)}
            title={linkedUser ? 'Set a new password for this user' : 'No linked user account for this employee'}
            style={{
              height: 40, padding: '0 18px', borderRadius: 9, font: '700 13px var(--ao-font)',
              background: linkedUser ? 'var(--ao-primary)' : '#fff',
              color: linkedUser ? '#fff' : 'var(--ao-muted)',
              border: linkedUser ? '1px solid var(--ao-primary)' : '1px solid var(--ao-border)',
              cursor: linkedUser ? 'pointer' : 'not-allowed',
              opacity: linkedUser ? 1 : 0.6,
            }}>
            Reset password
          </button>
          {linkedUser ? (
            <div style={{ font: '400 11px var(--ao-font)', color: 'var(--ao-muted-2)', marginTop: 5 }}>
              Linked account: {linkedUser.email ?? '—'}
            </div>
          ) : (
            <div style={NEEDS_BACKEND}>No linked user account</div>
          )}
        </div>
      </div>

      <ResetPasswordModal
        open={pwOpen}
        subjectName={name}
        saving={pwSaving}
        onCancel={() => setPwOpen(false)}
        onSubmit={submitReset}
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px 24px', marginBottom: 22 }}>
        <DetailField label="Employee ID" value={emp.employeeNo ?? '—'} />
        <DetailField label="Type" value={emp.employeeType ?? '—'} />
        <DetailField label="Email" value={emp.emailAddress ?? '—'} />
        <DetailField label="Phone" value={phoneOf(emp)} />
        <DetailField label="Date hired" value={hiredOf(emp)} />
        <DetailField label="Status" value={emp.employmentStatus ?? '—'} />
        <div>
          <div style={{ font: '500 11px var(--ao-font)', color: 'var(--ao-muted-2)', marginBottom: 5 }}>Role</div>
          {linkedUser ? (
            <select
              value={currentRoleId ?? ''}
              disabled={savingRole}
              onChange={(e) => changeRole(e.target.value ? Number(e.target.value) : null)}
              style={{ width: '100%', height: 38, border: '1px solid var(--ao-border-strong)', borderRadius: 9, background: 'var(--ao-surface-muted)', padding: '0 10px', font: '13px var(--ao-font)', color: 'var(--ao-text)', cursor: savingRole ? 'default' : 'pointer' }}>
              <option value="">— None —</option>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          ) : (
            <>
              <select disabled value=""
                style={{ width: '100%', height: 38, border: '1px solid var(--ao-border)', borderRadius: 9, background: 'var(--ao-surface-muted)', padding: '0 10px', font: '13px var(--ao-font)', color: 'var(--ao-muted)', cursor: 'not-allowed' }}>
                <option value="">— not available —</option>
              </select>
              <div style={NEEDS_BACKEND}>No linked user account</div>
            </>
          )}
        </div>
        <div>
          <div style={{ font: '500 11px var(--ao-font)', color: 'var(--ao-muted-2)', marginBottom: 5 }}>Client</div>
          <div style={{ font: '600 14px var(--ao-font)', color: 'var(--ao-muted)' }}>—</div>
          <div style={NEEDS_BACKEND}>Not returned by the employee API.</div>
        </div>
      </div>

      <div style={{ borderTop: '1px solid var(--ao-border-soft)', paddingTop: 18 }}>
        <div style={{ font: '700 14px var(--ao-font)', marginBottom: 4 }}>Approvers</div>
        <div style={{ font: '400 12px var(--ao-font)', color: 'var(--ao-muted-2)', marginBottom: 12 }}>
          Email addresses notified when this employee files a request. Approvers don't need an app account.
        </div>

        {approvers.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
            {approvers.map((email) => (
              <div key={email} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 38, border: '1px solid var(--ao-border)', borderRadius: 8, background: 'var(--ao-surface-muted)', padding: '0 12px' }}>
                <span style={{ font: '500 13px var(--ao-font)', color: 'var(--ao-text-2)' }}>{email}</span>
                <button
                  onClick={() => removeApprover(email)}
                  title="Remove approver"
                  style={{ border: 'none', background: 'transparent', color: 'var(--ao-danger)', font: '700 16px var(--ao-font)', cursor: 'pointer', lineHeight: 1, padding: '0 4px' }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ font: '400 13px var(--ao-font)', color: 'var(--ao-muted)', marginBottom: 12 }}>No approvers yet.</div>
        )}

        <div style={{ display: 'flex', gap: 8 }}>
          <input
            type="email"
            value={newApprover}
            onChange={(e) => setNewApprover(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') addApprover(); }}
            placeholder="approver@company.com"
            style={{ flex: 1, height: 40, border: '1px solid var(--ao-border-strong)', borderRadius: 9, background: 'var(--ao-surface)', padding: '0 12px', font: '13px var(--ao-font)', color: 'var(--ao-text)' }}
          />
          <button onClick={addApprover} className="ao-btn ao-btn--primary" style={{ height: 40, padding: '0 18px', font: '700 13px var(--ao-font)' }}>
            Add
          </button>
        </div>
      </div>
    </Card>
  );
}

/* ---------- Directory + page shell ---------- */
export function EmployeesPage() {
  const { notify } = useToast();
  const [rows, setRows] = useState<ApiEmployee[]>([]);
  const [users, setUsers] = useState<ApiUser[]>([]);
  const [roles, setRoles] = useState<ApiRole[]>([]);
  const [roleByUser, setRoleByUser] = useState<Record<number, number | null>>({});
  const [q, setQ] = useState('');
  const [selected, setSelected] = useState<ApiEmployee | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      // The employee directory is the essential fetch; a failure here shows an
      // error + Retry rather than a silent "no employees". Users/roles are
      // best-effort (they only power reset-password / role assignment).
      const emps = await getEmployees();
      const [us, roleList, userRoles] = await Promise.all([
        getUsers().catch(() => [] as ApiUser[]),
        getRoles().catch(() => [] as ApiRole[]),
        getUserRoles().catch(() => []),
      ]);
      setRows(emps);
      setUsers(us);
      setRoles(roleList);
      setRoleByUser(Object.fromEntries(userRoles.map((x) => [x.userId, x.roleId])));
    } catch {
      setRows([]);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Link an employee to their user account by the exact backend relationship
  // (AspNetUser.EmployeeId, exposed on UserDto). No email/name guessing — if an
  // account isn't linked in the database, it simply won't match here.
  const linkedUser = useMemo(() => {
    if (!selected) return null;
    return users.find((u) => u.employeeId != null && u.employeeId === selected.id) ?? null;
  }, [selected, users]);

  // Assign a role to a user account. The API replaces the full set, so send
  // every current assignment plus this change (mirrors the Roles page).
  async function assignRole(userId: number, roleId: number | null) {
    const next = { ...roleByUser, [userId]: roleId };
    try {
      const payload = Object.entries(next).map(([uid, rid]) => ({
        userId: Number(uid),
        roleId: rid,
      }));
      await saveUserRoles(payload);
      setRoleByUser(next);
      notify('Role updated');
    } catch (e) {
      notify((e as Error).message || 'Could not update role');
    }
  }

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

  if (selected)
    return (
      <EmployeeDetail
        emp={selected}
        linkedUser={linkedUser}
        roles={roles}
        currentRoleId={linkedUser ? roleByUser[linkedUser.id] ?? null : null}
        onAssignRole={assignRole}
        onBack={() => setSelected(null)}
      />
    );

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
      ) : error ? (
        <div style={{ textAlign: 'center', padding: '28px 0' }}>
          <div style={{ font: '500 13px var(--ao-font)', color: 'var(--ao-danger)', marginBottom: 12 }}>
            Couldn't load employees. Check the API connection and try again.
          </div>
          <button onClick={load} className="ao-btn ao-btn--primary" style={{ height: 38, padding: '0 20px', font: '700 13px var(--ao-font)' }}>
            Retry
          </button>
        </div>
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
