import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react';
import { getEmployees, getEmployee, getUnregisteredEmployees, updateEmployeeApprovers, type ApiEmployee } from '@/services/EmployeesService';
import {
  getUsers,
  getRoles,
  getUserRoles,
  saveUserRoles,
  createUser,
  type ApiUser,
  type ApiRole,
} from '@/services/RolesService';
import { resetUserPassword } from '@/services/AuthService';
import { getApprovers, type ApproverRecord } from '@/services/ApproverDirectoryService';
import { Avatar, Card, Chip } from '@/components/ui';
import { PageIntro, Table, Td, EmptyState, SearchBox } from '@/components/page';
import { ApproverPicker } from '@/components/ApproverPicker';
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
  emp, linkedUser, roles, allApprovers, currentRoleId, onAssignRole, onBack,
}: {
  emp: ApiEmployee;
  linkedUser: ApiUser | null;
  roles: ApiRole[];
  allApprovers: ApproverRecord[];
  currentRoleId: number | null;
  onAssignRole: (userId: number, roleId: number | null) => Promise<void>;
  onBack: () => void;
}) {
  const { notify } = useToast();
  const name = displayName(emp);
  const [pwOpen, setPwOpen] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);

  // Staged edits — Role and Approvers only apply on "Save changes".
  const [roleId, setRoleId] = useState<number | null>(currentRoleId);
  const [savedRoleId, setSavedRoleId] = useState<number | null>(currentRoleId);
  const initApprovers = () => (emp.employeeApprovers ?? []).map((x) => x.approverID);
  const [approverIds, setApproverIds] = useState<number[]>(initApprovers);
  const [savedApproverIds, setSavedApproverIds] = useState<number[]>(initApprovers);
  const [saving, setSaving] = useState(false);

  const sameIds = (a: number[], b: number[]) => a.length === b.length && a.every((x) => b.includes(x));
  const dirty = roleId !== savedRoleId || !sameIds(approverIds, savedApproverIds);

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

  async function saveChanges() {
    setSaving(true);
    try {
      if (linkedUser && roleId !== savedRoleId) {
        await onAssignRole(linkedUser.id, roleId);
        setSavedRoleId(roleId);
      }
      if (!sameIds(approverIds, savedApproverIds)) {
        await updateEmployeeApprovers(emp.id, approverIds);
        setSavedApproverIds(approverIds);
      }
      notify('Changes saved');
    } catch (e) {
      notify((e as Error).message || 'Could not save changes');
    } finally {
      setSaving(false);
    }
  }

  function discard() {
    setRoleId(savedRoleId);
    setApproverIds(savedApproverIds);
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
              value={roleId ?? ''}
              disabled={saving}
              onChange={(e) => setRoleId(e.target.value ? Number(e.target.value) : null)}
              style={{ width: '100%', height: 38, border: '1px solid var(--ao-border-strong)', borderRadius: 9, background: 'var(--ao-surface-muted)', padding: '0 10px', font: '13px var(--ao-font)', color: 'var(--ao-text)', cursor: saving ? 'default' : 'pointer' }}>
              <option value="">Default</option>
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
      </div>

      <div style={{ borderTop: '1px solid var(--ao-border-soft)', paddingTop: 18 }}>
        <div style={{ font: '700 14px var(--ao-font)', marginBottom: 4 }}>Approvers</div>
        <div style={{ font: '400 12px var(--ao-font)', color: 'var(--ao-muted-2)', marginBottom: 12 }}>
          People notified when this employee files a request. Pick from the master list on the Approvers page.
        </div>

        <ApproverPicker
          all={allApprovers}
          selectedIds={approverIds}
          onChange={setApproverIds}
          disabled={saving}
        />
      </div>

      {dirty && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, borderTop: '1px solid var(--ao-border-soft)', marginTop: 20, paddingTop: 18 }}>
          <button className="ao-btn ao-btn--ghost" style={{ height: 42, padding: '0 18px' }} disabled={saving} onClick={discard}>
            Discard
          </button>
          <button
            className="ao-btn ao-btn--primary"
            style={{ height: 42, padding: '0 20px', color: '#fff', opacity: saving ? 0.6 : 1 }}
            disabled={saving}
            onClick={saveChanges}
          >
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      )}
    </Card>
  );
}

/* A cryptographically-random temporary password. Guarantees one upper, lower,
   digit and symbol (satisfies any Identity policy) and omits look-alike glyphs
   (0/O/1/l/I) so it's safe to read out or copy by hand. */
function randInt(max: number): number {
  const a = new Uint32Array(1);
  crypto.getRandomValues(a);
  return a[0] % max;
}
function generatePassword(length = 16): string {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghijkmnpqrstuvwxyz';
  const digit = '23456789';
  const symbol = '!@#$%^&*?';
  const all = upper + lower + digit + symbol;
  const pick = (set: string) => set[randInt(set.length)];
  const chars = [pick(upper), pick(lower), pick(digit), pick(symbol)];
  while (chars.length < length) chars.push(pick(all));
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
}

interface CreatedCredential { name: string; email: string; password: string }

/* ---------- Register Employee modal ---------- */
function RegisterEmployeeModal({
  roles, roleByUser, allApprovers, onClose, onDone,
}: {
  roles: ApiRole[];
  roleByUser: Record<number, number | null>;
  allApprovers: ApproverRecord[];
  onClose: () => void;
  onDone: () => void;
}) {
  const defaultRoleId = roles.find((r) => r.name.toLowerCase() === 'selfserve')?.id ?? null;
  const [step, setStep] = useState<'select' | 'details' | 'created'>('select');
  const [emp, setEmp] = useState<ApiEmployee | null>(null);
  const [roleId, setRoleId] = useState<number | null>(defaultRoleId);
  const [approverIds, setApproverIds] = useState<number[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [query, setQuery] = useState('');
  const [invitedIds, setInvitedIds] = useState<number[]>([]); // optimistic — drop just-registered rows
  const [justInvited, setJustInvited] = useState<string | null>(null);
  const [list, setList] = useState<ApiEmployee[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [listErr, setListErr] = useState(false);
  const [created, setCreated] = useState<CreatedCredential | null>(null);
  const [postWarn, setPostWarn] = useState('');
  const [copied, setCopied] = useState(false);

  const label = (e: ApiEmployee) =>
    [e.firstName, e.lastName].filter(Boolean).join(' ') || e.fullName || e.employeeNo || e.emailAddress || '—';

  // Unregistered employees are resolved by the backend (authoritative), then we
  // drop any we've just invited in this session (optimistic — the account is
  // created immediately but the list is only refetched via onDone()).
  const loadList = useCallback(() => {
    setLoadingList(true);
    setListErr(false);
    getUnregisteredEmployees()
      .then(setList)
      .catch(() => { setList([]); setListErr(true); })
      .finally(() => setLoadingList(false));
  }, []);
  useEffect(() => { loadList(); }, [loadList]);

  const unregistered = useMemo(
    () => list.filter((e) => !invitedIds.includes(e.id)),
    [list, invitedIds],
  );
  // Can only invite people who have an email on file.
  const invitable = useMemo(() => unregistered.filter((e) => (e.emailAddress ?? '').trim()), [unregistered]);
  const noEmailCount = unregistered.length - invitable.length;
  const shown = useMemo(() => {
    const t = query.trim().toLowerCase();
    if (!t) return invitable;
    return invitable.filter(
      (e) =>
        label(e).toLowerCase().includes(t) ||
        (e.emailAddress ?? '').toLowerCase().includes(t) ||
        (e.employeeNo ?? '').toLowerCase().includes(t),
    );
  }, [invitable, query]);

  function pick(e: ApiEmployee) {
    setEmp(e);
    setRoleId(defaultRoleId);
    setApproverIds([]);
    setErr('');
    setJustInvited(null);
    setStep('details');
  }

  async function submit() {
    if (!emp) return;
    setBusy(true);
    setErr('');
    setPostWarn('');
    const password = generatePassword();
    try {
      const newUser = await createUser({
        firstName: emp.firstName ?? '',
        lastName: emp.lastName ?? '',
        email: emp.emailAddress ?? '',
        employeeId: emp.id,
      });
      // Overwrite the backend's default password immediately so the account is
      // never sitting on a guessable one.
      await resetUserPassword(newUser.id, password);
      // Password is set — commit the show-once credential and reveal it now,
      // BEFORE the best-effort role/approver calls, so a failure there can't
      // lose the only copy of the password.
      setInvitedIds((prev) => [...prev, emp.id]);
      setCreated({ name: label(emp), email: emp.emailAddress ?? '', password });
      setCopied(false);
      setStep('created');
      onDone();
      try {
        if (approverIds.length > 0) {
          await updateEmployeeApprovers(emp.id, approverIds);
        }
        if (roleId != null) {
          const payload = Object.entries({ ...roleByUser, [newUser.id]: roleId }).map(
            ([uid, rid]) => ({ userId: Number(uid), roleId: rid }),
          );
          await saveUserRoles(payload);
        }
      } catch (e) {
        setPostWarn(`The account and password were set, but role/approvers didn't fully save: ${(e as Error).message || 'unknown error'}.`);
      }
    } catch (e) {
      setErr((e as Error).message || 'Could not register the account.');
    } finally {
      setBusy(false);
    }
  }

  async function copyCredential() {
    if (!created) return;
    const text = `Email: ${created.email}\nTemporary password: ${created.password}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  function inviteAnother() {
    setCreated(null);
    setPostWarn('');
    setEmp(null);
    setJustInvited(created?.name ?? null);
    setStep('select');
  }

  return (
    <div className="ao-modal-backdrop" onClick={onClose}>
      <div className="ao-modal" style={{ width: 460 }} onClick={(e) => e.stopPropagation()}>
        <div style={{ font: '700 17px var(--ao-font)', marginBottom: 4 }}>Register Employee</div>
        <div style={{ font: '400 13px var(--ao-font)', color: 'var(--ao-muted)', marginBottom: 18 }}>
          Create a login for an employee in AccuPay. You'll get a temporary password to hand over.
        </div>

        {step === 'select' && (
          <>
            {justInvited && (
              <div style={{ font: '500 12.5px var(--ao-font)', color: 'var(--ao-success)', background: 'var(--ao-surface-muted)', border: '1px solid var(--ao-border)', borderRadius: 8, padding: '9px 12px', marginBottom: 14 }}>
                Registered {justInvited}.
              </div>
            )}

            {loadingList ? (
              <div style={{ textAlign: 'center', padding: '26px 12px', font: '500 13px var(--ao-font)', color: 'var(--ao-muted)' }}>
                Loading employees…
              </div>
            ) : listErr ? (
              <div style={{ textAlign: 'center', padding: '26px 12px' }}>
                <div style={{ font: '500 13px var(--ao-font)', color: 'var(--ao-danger)', marginBottom: 12 }}>
                  Couldn't load the employee list.
                </div>
                <button className="ao-btn ao-btn--primary" style={{ height: 36, padding: '0 18px', color: '#fff' }} onClick={loadList}>Retry</button>
              </div>
            ) : invitable.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '26px 12px' }}>
                <div style={{ font: '500 13px var(--ao-font)', color: 'var(--ao-text-3)' }}>
                  {justInvited ? 'No one else is waiting to be registered.' : 'Everyone in AccuPay already has a login.'}
                </div>
                {noEmailCount > 0 && (
                  <div style={{ font: '400 12px var(--ao-font)', color: 'var(--ao-muted-2)', marginTop: 8 }}>
                    {noEmailCount} employee{noEmailCount > 1 ? 's have' : ' has'} no email on file and can't be invited here.
                  </div>
                )}
              </div>
            ) : (
              <>
                <input
                  className="ao-input"
                  value={query}
                  autoFocus
                  placeholder="Search name, email, or ID"
                  onChange={(e) => setQuery(e.target.value)}
                  style={{ marginBottom: 10 }}
                />
                <div style={{ maxHeight: 316, overflowY: 'auto', border: '1px solid var(--ao-border)', borderRadius: 10 }}>
                  {shown.length === 0 ? (
                    <div style={{ font: '400 13px var(--ao-font)', color: 'var(--ao-muted)', padding: '20px 14px', textAlign: 'center' }}>
                      No unregistered employees match your search.
                    </div>
                  ) : (
                    shown.map((e, i) => (
                      <div
                        key={e.id}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 11,
                          padding: '10px 12px',
                          borderTop: i === 0 ? 'none' : '1px solid var(--ao-border)',
                        }}
                      >
                        <Avatar name={label(e)} size={32} filled={false} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ font: '600 13px var(--ao-font)', color: 'var(--ao-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label(e)}</div>
                          <div style={{ font: '400 11.5px var(--ao-font)', color: 'var(--ao-muted-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {e.emailAddress} · {e.employeeNo ?? '—'}
                          </div>
                        </div>
                        <button
                          className="ao-btn ao-btn--primary"
                          style={{ height: 32, padding: '0 14px', color: '#fff', font: '600 12px var(--ao-font)' }}
                          onClick={() => pick(e)}
                        >
                          Register
                        </button>
                      </div>
                    ))
                  )}
                </div>
                {noEmailCount > 0 && (
                  <div style={{ font: '400 11px var(--ao-font)', color: 'var(--ao-muted-2)', marginTop: 8 }}>
                    {noEmailCount} unregistered employee{noEmailCount > 1 ? 's have' : ' has'} no email on file and {noEmailCount > 1 ? 'aren’t' : 'isn’t'} shown.
                  </div>
                )}
              </>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
              <button className="ao-btn ao-btn--ghost" style={{ height: 40, padding: '0 16px' }} onClick={onClose}>Close</button>
            </div>
          </>
        )}

        {step === 'details' && emp && (
          <>
            <div style={{ background: 'var(--ao-surface-muted)', border: '1px solid var(--ao-border)', borderRadius: 10, padding: '12px 14px', marginBottom: 16 }}>
              <div style={{ font: '700 14px var(--ao-font)' }}>{label(emp)}</div>
              <div style={{ font: '400 12px var(--ao-font)', color: 'var(--ao-muted)' }}>
                {emp.emailAddress} · {emp.employeeNo ?? '—'}
              </div>
            </div>

            <label className="ao-label">Role</label>
            <select
              className="ao-input"
              value={roleId ?? ''}
              onChange={(e) => setRoleId(e.target.value ? Number(e.target.value) : null)}
              style={{ marginBottom: 14, cursor: 'pointer' }}
            >
              <option value="">Default</option>
              {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>

            <label className="ao-label">Approvers <span style={{ fontWeight: 400, color: 'var(--ao-muted-2)' }}>(optional)</span></label>
            <ApproverPicker all={allApprovers} selectedIds={approverIds} onChange={setApproverIds} />
            <div style={{ font: '400 11px var(--ao-font)', color: 'var(--ao-muted-2)', marginTop: 6 }}>
              Notified when this employee files a request. Manage the master list on the Approvers page.
            </div>

            {err && <div style={{ font: '500 12px var(--ao-font)', color: 'var(--ao-danger)', marginTop: 10 }}>{err}</div>}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 22 }}>
              <button className="ao-btn ao-btn--ghost" style={{ height: 40, padding: '0 16px' }} onClick={() => { setStep('select'); setErr(''); }}>Back</button>
              <button className="ao-btn ao-btn--primary" style={{ height: 40, padding: '0 18px', color: '#fff', opacity: busy ? 0.6 : 1 }} disabled={busy} onClick={submit}>
                {busy ? 'Creating…' : 'Create account'}
              </button>
            </div>
          </>
        )}

        {step === 'created' && created && (
          <>
            <div style={{ font: '500 13px var(--ao-font)', color: 'var(--ao-success)', marginBottom: 12 }}>
              Account created for {created.name}.
            </div>
            <div style={{ font: '400 12.5px/1.6 var(--ao-font)', color: 'var(--ao-text-3)', marginBottom: 14 }}>
              Share these sign-in details securely — the password is shown once and can't be retrieved later. Ask them to change it after signing in (Profile → Change password).
            </div>

            <div style={{ background: 'var(--ao-surface-muted)', border: '1px solid var(--ao-border)', borderRadius: 10, padding: '12px 14px' }}>
              <div style={{ font: '500 11px var(--ao-font)', color: 'var(--ao-muted-2)', textTransform: 'uppercase', letterSpacing: '.5px' }}>Email</div>
              <div style={{ font: '600 13px var(--ao-font)', color: 'var(--ao-text)', marginBottom: 10, wordBreak: 'break-all' }}>{created.email}</div>
              <div style={{ font: '500 11px var(--ao-font)', color: 'var(--ao-muted-2)', textTransform: 'uppercase', letterSpacing: '.5px' }}>Temporary password</div>
              <div style={{ font: '600 15px ui-monospace, Menlo, Consolas, monospace', color: 'var(--ao-text)', letterSpacing: '.5px' }}>{created.password}</div>
            </div>

            <button
              className="ao-btn ao-btn--ghost"
              style={{ height: 36, padding: '0 14px', marginTop: 10, font: '600 12px var(--ao-font)' }}
              onClick={copyCredential}
            >
              {copied ? 'Copied ✓' : 'Copy email & password'}
            </button>

            {postWarn && (
              <div style={{ font: '500 12px var(--ao-font)', color: 'var(--ao-warning, #b45309)', marginTop: 12 }}>{postWarn}</div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 22 }}>
              <button className="ao-btn ao-btn--ghost" style={{ height: 40, padding: '0 16px' }} onClick={inviteAnother}>Register another</button>
              <button className="ao-btn ao-btn--primary" style={{ height: 40, padding: '0 18px', color: '#fff' }} onClick={onClose}>Done</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ---------- Directory + page shell ---------- */
export function EmployeesPage() {
  const [rows, setRows] = useState<ApiEmployee[]>([]);
  const [users, setUsers] = useState<ApiUser[]>([]);
  const [roles, setRoles] = useState<ApiRole[]>([]);
  const [approvers, setApprovers] = useState<ApproverRecord[]>([]);
  const [roleByUser, setRoleByUser] = useState<Record<number, number | null>>({});
  const [q, setQ] = useState('');
  const [selected, setSelected] = useState<ApiEmployee | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [registerOpen, setRegisterOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      // The employee directory is the essential fetch; a failure here shows an
      // error + Retry rather than a silent "no employees". Users/roles are
      // best-effort (they only power reset-password / role assignment).
      const emps = await getEmployees();
      const [us, roleList, userRoles, approverList] = await Promise.all([
        getUsers().catch(() => [] as ApiUser[]),
        getRoles().catch(() => [] as ApiRole[]),
        getUserRoles().catch(() => []),
        getApprovers().catch(() => [] as ApproverRecord[]),
      ]);
      setRows(emps);
      setUsers(us);
      setRoles(roleList);
      setApprovers(approverList);
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
  // every current assignment plus this change (mirrors the Roles page). Errors
  // propagate to the detail view's Save handler, which reports them.
  async function assignRole(userId: number, roleId: number | null) {
    const next = { ...roleByUser, [userId]: roleId };
    const payload = Object.entries(next).map(([uid, rid]) => ({
      userId: Number(uid),
      roleId: rid,
    }));
    await saveUserRoles(payload);
    setRoleByUser(next);
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
        allApprovers={approvers}
        currentRoleId={linkedUser ? roleByUser[linkedUser.id] ?? null : null}
        onAssignRole={assignRole}
        onBack={() => setSelected(null)}
      />
    );

  return (
    <div style={{ maxWidth: 940 }}>
      <PageIntro
        title="Employees"
        subtitle="Your organization's people. Select someone to view their details."
        right={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <SearchBox value={q} onChange={setQ} placeholder="Search name, email, or ID" width={220} />
            <button
              className="ao-btn ao-btn--primary"
              style={{ height: 38, padding: '0 16px', color: '#fff', whiteSpace: 'nowrap' }}
              onClick={() => setRegisterOpen(true)}
            >
              Register Employee
            </button>
          </div>
        }
      />

      <Card style={{ overflow: 'hidden' }}>
        {loading ? (
          <EmptyState message="Loading employees…" />
        ) : error ? (
          <div style={{ textAlign: 'center', padding: '38px 28px' }}>
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

      {registerOpen && (
        <RegisterEmployeeModal
          roles={roles}
          roleByUser={roleByUser}
          allApprovers={approvers}
          onClose={() => setRegisterOpen(false)}
          onDone={load}
        />
      )}
    </div>
  );
}
