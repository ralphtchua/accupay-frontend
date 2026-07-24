import { useEffect, useMemo, useState } from 'react';
import {
  getRoles,
  getPermissions,
  updateRole,
  createRole,
  deleteRole,
  getUsers,
  getUserRoles,
  saveUserRoles,
  type ApiRole,
  type ApiPermission,
  type ApiRolePermission,
  type ApiUser,
} from '@/services/RolesService';
import { resetUserPassword } from '@/services/AuthService';
import { Card, Avatar } from '@/components/ui';
import { PageIntro, Table, Td, EmptyState } from '@/components/page';
import { Field, TextInput } from '@/components/form';
import { ConfirmModal } from '@/components/ConfirmModal';
import { ResetPasswordModal } from '@/components/ResetPasswordModal';
import { useToast } from '@/components/Toast';

/* =====================================================================
   Roles & Permissions — a role is a named bundle of permissions that
   controls what an account can do (the backend gates every API call on
   the role's Read/Create/Update/Delete flags per module; admin roles
   bypass everything). Two tabs:
   • Role permissions: per-module matrix per role, + create / delete role.
   • User assignments: assign each account a role, + reset password.
   ===================================================================== */

// Only admin roles are protected from deletion — removing the admin role would
// lock out admin access. Everything else is deletable.
function isProtectedRole(r: ApiRole): boolean {
  return r.isAdmin;
}

type Flags = { read: boolean; create: boolean; update: boolean; delete: boolean };
const FLAG_KEYS: (keyof Flags)[] = ['read', 'create', 'update', 'delete'];
const FLAG_LABELS: Record<keyof Flags, string> = {
  read: 'Read', create: 'Create', update: 'Update', delete: 'Delete',
};
const EMPTY: Flags = { read: false, create: false, update: false, delete: false };

/* ---------------------------------------------------------------------
   Page-access model — the admin pages, each mapped to the backend module
   permissions it needs. The UI shows one toggle per page; on save those
   toggles are expanded into the underlying module Read/Create/Update/Delete
   flags. A module used by several pages is granted if ANY of its pages is on
   (union). Every module listed in a `grants` here is "page-managed" and no
   longer appears in the raw grid (it moves to the union computed from toggles);
   all other modules stay editable in the Advanced section.
   --------------------------------------------------------------------- */
type ModuleAction = keyof Flags;

interface PageAccess {
  key: string;
  label: string;
  desc: string;
  grants: Record<string, ModuleAction[]>; // backend module name -> actions
}

const PAGE_ACCESS: PageAccess[] = [
  {
    key: 'approvals', label: 'Approvals',
    desc: 'View pending filings and approve or reject them.',
    grants: { Overtime: ['read', 'update'], Leave: ['read', 'update'], TimeLog: ['read', 'update'] },
  },
  {
    key: 'history', label: 'Approval History',
    desc: 'View already-decided filings (read-only).',
    grants: { Overtime: ['read'], Leave: ['read'], User: ['read'] },
  },
  {
    key: 'employees', label: 'Employees',
    desc: 'Directory, plus assign roles, reset passwords, and set approvers.',
    grants: { Employee: ['read', 'update'], Role: ['read', 'update'], User: ['read', 'update'], Approver: ['read'] },
  },
  {
    key: 'approvers', label: 'Approvers',
    desc: 'Manage the master approver directory.',
    grants: { Approver: ['read', 'create', 'update', 'delete'] },
  },
  {
    key: 'roles', label: 'Roles & Permissions',
    desc: 'Manage roles and assign roles to accounts.',
    grants: { Role: ['read', 'create', 'update', 'delete'], User: ['read', 'update'] },
  },
];

/** Modules managed by the page toggles (hidden from the Advanced grid). */
const PAGE_MODULE_NAMES = new Set(PAGE_ACCESS.flatMap((p) => Object.keys(p.grants)));

function flagsFor(role: ApiRole | null, permissionId: number): Flags {
  const rp = role?.rolePermissions?.find((p) => p.permissionId === permissionId);
  return rp
    ? { read: !!rp.read, create: !!rp.create, update: !!rp.update, delete: !!rp.delete }
    : { ...EMPTY };
}

function userName(u: ApiUser): string {
  return [u.firstName, u.lastName].filter(Boolean).join(' ') || u.email || '—';
}

export function RolesPage() {
  const { notify } = useToast();
  const [tab, setTab] = useState<'permissions' | 'assignments'>('permissions');

  const [roles, setRoles] = useState<ApiRole[]>([]);
  const [permissions, setPermissions] = useState<ApiPermission[]>([]);
  const [users, setUsers] = useState<ApiUser[]>([]);
  const [roleByUser, setRoleByUser] = useState<Record<number, number | null>>({});

  const [activeId, setActiveId] = useState<number | null>(null);
  const [draft, setDraft] = useState<Record<number, Flags>>({});
  const [dirty, setDirty] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingUser, setSavingUser] = useState<number | null>(null);
  const [pwUser, setPwUser] = useState<ApiUser | null>(null);
  const [pwSaving, setPwSaving] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [creating, setCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ApiRole | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [showAdvanced, setShowAdvanced] = useState(false);

  const activeRole = useMemo(
    () => roles.find((r) => r.id === activeId) ?? null,
    [roles, activeId],
  );

  // backend module name -> permission id, and the "leftover" modules (not page-managed).
  const moduleId = useMemo(() => {
    const m: Record<string, number> = {};
    permissions.forEach((p) => { m[p.name] = p.id; });
    return m;
  }, [permissions]);
  const advancedPerms = useMemo(
    () => permissions.filter((p) => !PAGE_MODULE_NAMES.has(p.name)),
    [permissions],
  );

  // A page is "on" when the role has every module action that page requires.
  function pageEnabled(page: PageAccess): boolean {
    return Object.entries(page.grants).every(([mod, actions]) => {
      const id = moduleId[mod];
      if (id == null) return true; // module not exposed by the API -> can't gate on it
      const f = draft[id] ?? EMPTY;
      return actions.every((a) => f[a]);
    });
  }

  // Toggle a page: recompute all page-managed modules as the union of the
  // still-enabled pages (so shared permissions survive when one page is off).
  function setPage(page: PageAccess, enable: boolean) {
    const enabledKeys = new Set(
      PAGE_ACCESS.filter((p) => (p.key === page.key ? enable : pageEnabled(p))).map((p) => p.key),
    );
    setDraft((prev) => {
      const next: Record<number, Flags> = { ...prev };
      PAGE_MODULE_NAMES.forEach((mod) => {
        const id = moduleId[mod];
        if (id != null) next[id] = { ...EMPTY };
      });
      PAGE_ACCESS.filter((p) => enabledKeys.has(p.key)).forEach((p) => {
        Object.entries(p.grants).forEach(([mod, actions]) => {
          const id = moduleId[mod];
          if (id == null) return;
          const f = { ...next[id] };
          actions.forEach((a) => { f[a] = true; });
          next[id] = f;
        });
      });
      return next;
    });
    setDirty(true);
  }

  async function loadAll() {
    setLoading(true);
    try {
      const [r, p, u, ur] = await Promise.all([
        getRoles(),
        getPermissions(),
        getUsers().catch(() => [] as ApiUser[]),
        getUserRoles().catch(() => []),
      ]);
      setRoles(r);
      setPermissions(p);
      setUsers(u);
      setRoleByUser(Object.fromEntries(ur.map((x) => [x.userId, x.roleId])));
      setActiveId((prev) => prev ?? r[0]?.id ?? null);
    } catch {
      setRoles([]);
      setPermissions([]);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { loadAll(); }, []);

  // Rebuild the permission draft whenever the selected role (or master list) changes.
  useEffect(() => {
    if (!activeRole) { setDraft({}); return; }
    const next: Record<number, Flags> = {};
    permissions.forEach((p) => { next[p.id] = flagsFor(activeRole, p.id); });
    setDraft(next);
    setDirty(false);
  }, [activeRole, permissions]);

  function toggle(permId: number, key: keyof Flags, value: boolean) {
    setDraft((prev) => ({
      ...prev,
      [permId]: { ...(prev[permId] ?? EMPTY), [key]: value },
    }));
    setDirty(true);
  }

  async function save() {
    if (!activeRole) return;
    setSaving(true);
    try {
      const rolePermissions: ApiRolePermission[] = permissions.map((p) => ({
        permissionId: p.id,
        permissionName: p.name,
        ...(draft[p.id] ?? EMPTY),
      }));
      await updateRole(activeRole.id, activeRole.name, rolePermissions);
      setRoles((prev) =>
        prev.map((r) => (r.id === activeRole.id ? { ...r, rolePermissions } : r)),
      );
      setDirty(false);
      notify('Permissions saved');
    } catch (e) {
      notify((e as Error).message || 'Could not save permissions');
    } finally {
      setSaving(false);
    }
  }

  async function submitCreate() {
    const name = newRoleName.trim();
    if (!name) return;
    setCreating(true);
    try {
      const created = await createRole(name);
      await loadAll();
      setActiveId(created.id);
      setCreateOpen(false);
      setNewRoleName('');
      notify('Role created');
    } catch (e) {
      notify((e as Error).message || 'Could not create role');
    } finally {
      setCreating(false);
    }
  }

  async function submitDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteRole(deleteTarget.id);
      if (activeId === deleteTarget.id) {
        setActiveId(roles.find((r) => r.id !== deleteTarget.id)?.id ?? null);
      }
      setDeleteTarget(null);
      await loadAll();
      notify('Role deleted');
    } catch (e) {
      notify((e as Error).message || 'Could not delete role');
    } finally {
      setDeleting(false);
    }
  }

  async function assignRole(userId: number, roleId: number | null) {
    const next = { ...roleByUser, [userId]: roleId };
    setSavingUser(userId);
    try {
      const payload = Object.entries(next).map(([uid, rid]) => ({
        userId: Number(uid),
        roleId: rid,
      }));
      await saveUserRoles(payload);
      setRoleByUser(next);
      notify('Role assignment saved');
    } catch (e) {
      notify((e as Error).message || 'Could not save assignment');
    } finally {
      setSavingUser(null);
    }
  }

  async function submitReset(newPassword: string) {
    if (!pwUser) return;
    setPwSaving(true);
    try {
      await resetUserPassword(pwUser.id, newPassword);
      notify(`Password reset for ${userName(pwUser)}`);
      setPwUser(null);
    } catch (e) {
      notify((e as Error).message || 'Could not reset password');
    } finally {
      setPwSaving(false);
    }
  }

  if (loading) return <EmptyState message="Loading roles…" />;

  const tabBtn = (key: 'permissions' | 'assignments', label: string) => (
    <button
      onClick={() => setTab(key)}
      style={{
        border: 'none', cursor: 'pointer', padding: '8px 16px', borderRadius: 8,
        font: `${tab === key ? 700 : 500} 13px var(--ao-font)`,
        background: tab === key ? 'var(--ao-primary)' : 'transparent',
        color: tab === key ? '#fff' : 'var(--ao-text-3)',
      }}
    >
      {label}
    </button>
  );

  return (
    <div style={{ maxWidth: 940 }}>
      <PageIntro title="Roles & Permissions" subtitle="Define what each role can do and assign roles to user accounts." />

      <div style={{ display: 'flex', gap: 6, marginBottom: 16, background: '#eef1f5', padding: 4, borderRadius: 10, width: 'fit-content' }}>
        {tabBtn('permissions', 'Role permissions')}
        {tabBtn('assignments', 'User assignments')}
      </div>

      {tab === 'permissions' ? (
        <div style={{ display: 'flex', gap: 18, alignItems: 'flex-start' }}>
          {/* Role list */}
          <div style={{ width: 190, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 7 }}>
            {roles.map((r) => {
              const active = r.id === activeId;
              return (
                <div
                  key={r.id}
                  onClick={() => setActiveId(r.id)}
                  style={{
                    padding: '11px 13px', borderRadius: 9, cursor: 'pointer',
                    font: '600 13px var(--ao-font)', transition: '.15s',
                    background: active ? 'var(--ao-primary)' : 'var(--ao-surface)',
                    color: active ? '#fff' : 'var(--ao-text-3)',
                    border: active ? '1px solid var(--ao-primary)' : '1px solid var(--ao-border)',
                  }}
                >
                  {r.name}{r.isAdmin ? ' ★' : ''}
                </div>
              );
            })}
            {roles.length === 0 && (
              <div style={{ font: '400 12px var(--ao-font)', color: 'var(--ao-muted)' }}>No roles yet.</div>
            )}
            <button className="ao-btn ao-btn--ghost" style={{ height: 40, marginTop: 4 }} onClick={() => setCreateOpen(true)}>
              + New role
            </button>
          </div>

          {/* Permission matrix */}
          <div style={{ flex: 1, background: 'var(--ao-surface)', border: '1px solid var(--ao-border)', borderRadius: 14, padding: '22px 24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <div style={{ font: '700 15px var(--ao-font)' }}>Permissions — {activeRole?.name ?? ''}</div>
              <div style={{ display: 'flex', gap: 8 }}>
                {activeRole && !isProtectedRole(activeRole) && (
                  <button
                    className="ao-btn ao-btn--ghost"
                    style={{ height: 38, padding: '0 14px', color: 'var(--ao-danger)', font: '600 13px var(--ao-font)' }}
                    onClick={() => setDeleteTarget(activeRole)}
                  >
                    Delete role
                  </button>
                )}
                <button
                  className="ao-btn ao-btn--primary"
                  style={{ height: 38, padding: '0 18px', opacity: dirty && !saving ? 1 : 0.5, cursor: dirty && !saving ? 'pointer' : 'default' }}
                  disabled={!dirty || saving}
                  onClick={save}
                >
                  {saving ? 'Saving…' : 'Save changes'}
                </button>
              </div>
            </div>
            <div style={{ font: '400 12px var(--ao-font)', color: 'var(--ao-muted-2)', marginBottom: 14 }}>
              Turn on the pages this role should be able to use.
            </div>

            {activeRole?.isAdmin && (
              <div style={{ font: '500 12px var(--ao-font)', color: 'var(--ao-pending)', marginBottom: 12 }}>
                This is an admin role — it already has full access to everything, regardless of the toggles below.
              </div>
            )}

            {/* Per-page access toggles */}
            {PAGE_ACCESS.map((page) => {
              const adminAll = !!activeRole?.isAdmin;
              const on = adminAll || pageEnabled(page);
              return (
                <label
                  key={page.key}
                  style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '11px 0', borderBottom: '1px solid var(--ao-border-soft)', cursor: adminAll ? 'default' : 'pointer' }}
                >
                  <input
                    type="checkbox"
                    checked={on}
                    disabled={adminAll}
                    onChange={(e) => setPage(page, e.target.checked)}
                    style={{ width: 17, height: 17, marginTop: 1, accentColor: 'var(--ao-primary)', cursor: adminAll ? 'default' : 'pointer', flexShrink: 0 }}
                  />
                  <div>
                    <div style={{ font: '600 13.5px var(--ao-font)', color: 'var(--ao-text)' }}>{page.label}</div>
                    <div style={{ font: '400 12px var(--ao-font)', color: 'var(--ao-muted)' }}>{page.desc}</div>
                  </div>
                </label>
              );
            })}
            <div style={{ font: '400 11px var(--ao-font)', color: 'var(--ao-muted-2)', marginTop: 8 }}>
              Settings has no access controls yet.
            </div>

            {/* Advanced: raw module grid for everything the pages don't manage */}
            <div style={{ marginTop: 18, borderTop: '1px solid var(--ao-border)', paddingTop: 14 }}>
              <button
                type="button"
                onClick={() => setShowAdvanced((v) => !v)}
                style={{ border: 'none', background: 'transparent', color: 'var(--ao-text-3)', font: '600 12.5px var(--ao-font)', cursor: 'pointer', padding: 0 }}
              >
                {showAdvanced ? 'Hide' : 'Show'} advanced (raw module permissions)
              </button>

              {showAdvanced && (
                <div style={{ marginTop: 12 }}>
                  <div style={{ font: '400 11.5px/1.5 var(--ao-font)', color: 'var(--ao-muted-2)', marginBottom: 10 }}>
                    The page toggles above manage the Overtime, Leave, TimeLog, Employee, User, Role and Approver
                    modules. Below are the remaining backend modules (payroll/HR and self-service), edited directly.
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--ao-border)', font: '600 11px var(--ao-font)', color: 'var(--ao-muted-2)', textTransform: 'uppercase', letterSpacing: '.5px' }}>
                    <span style={{ flex: 1 }}>Module</span>
                    {FLAG_KEYS.map((k) => <span key={k} style={{ width: 66, textAlign: 'center' }}>{FLAG_LABELS[k]}</span>)}
                  </div>
                  {advancedPerms.map((p) => (
                    <div key={p.id} style={{ display: 'flex', alignItems: 'center', padding: '9px 0', borderBottom: '1px solid var(--ao-border-soft)' }}>
                      <span style={{ flex: 1, font: '500 13px var(--ao-font)', color: 'var(--ao-text-2)' }}>{p.name}</span>
                      {FLAG_KEYS.map((k) => (
                        <span key={k} style={{ width: 66, textAlign: 'center' }}>
                          <input
                            type="checkbox"
                            checked={!!draft[p.id]?.[k]}
                            onChange={(e) => toggle(p.id, k, e.target.checked)}
                            style={{ width: 16, height: 16, accentColor: 'var(--ao-primary)', cursor: 'pointer' }}
                          />
                        </span>
                      ))}
                    </div>
                  ))}
                  {advancedPerms.length === 0 && <EmptyState message="No other modules." />}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <Card style={{ padding: '20px 22px' }}>
          <div style={{ font: '700 15px var(--ao-font)', marginBottom: 2 }}>User role assignments</div>
          <div style={{ font: '400 12px var(--ao-font)', color: 'var(--ao-muted-2)', marginBottom: 14 }}>
            Assign each user account a role. Changes save immediately.
          </div>
          {users.length === 0 ? (
            <EmptyState message="No users found." />
          ) : (
            <Table head={['User', 'Email', 'Role', '']}>
              {users.map((u) => (
                <tr key={u.id}>
                  <Td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                      <Avatar name={userName(u)} size={34} filled={false} />
                      <span style={{ font: '600 13px var(--ao-font)', color: 'var(--ao-text)' }}>{userName(u)}</span>
                    </div>
                  </Td>
                  <Td style={{ color: 'var(--ao-muted)' }}>{u.email ?? '—'}</Td>
                  <Td>
                    <select
                      value={roleByUser[u.id] ?? ''}
                      disabled={savingUser === u.id}
                      onChange={(e) => assignRole(u.id, e.target.value ? Number(e.target.value) : null)}
                      style={{ height: 36, minWidth: 160, border: '1px solid var(--ao-border-strong)', borderRadius: 8, background: 'var(--ao-surface-muted)', padding: '0 10px', font: '13px var(--ao-font)', color: 'var(--ao-text)', cursor: savingUser === u.id ? 'default' : 'pointer' }}
                    >
                      <option value="">Default</option>
                      {roles.map((r) => (
                        <option key={r.id} value={r.id}>{r.name}</option>
                      ))}
                    </select>
                  </Td>
                  <Td style={{ textAlign: 'right' }}>
                    <button
                      onClick={() => setPwUser(u)}
                      className="ao-btn ao-btn--ghost"
                      style={{ height: 34, padding: '0 12px', font: '600 12px var(--ao-font)', whiteSpace: 'nowrap' }}
                    >
                      Reset password
                    </button>
                  </Td>
                </tr>
              ))}
            </Table>
          )}
        </Card>
      )}

      <ConfirmModal
        open={createOpen}
        title="New role"
        width={420}
        confirmLabel={creating ? 'Creating…' : 'Create role'}
        confirmDisabled={!newRoleName.trim() || creating}
        onCancel={() => { setCreateOpen(false); setNewRoleName(''); }}
        onConfirm={submitCreate}
        body={
          <div style={{ marginTop: 4 }}>
            <div style={{ font: '400 13px var(--ao-font)', color: 'var(--ao-muted)', marginBottom: 12 }}>
              Creates an empty role — grant its permissions in the matrix afterward.
            </div>
            <Field label="Role name">
              <TextInput
                value={newRoleName}
                onChange={(e) => setNewRoleName(e.target.value)}
                placeholder="e.g. HR Manager"
              />
            </Field>
          </div>
        }
      />

      <ConfirmModal
        open={!!deleteTarget}
        title="Delete role"
        width={420}
        confirmVariant="danger"
        confirmLabel={deleting ? 'Deleting…' : 'Delete role'}
        confirmDisabled={deleting}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={submitDelete}
        body={
          <div>
            Delete the role <strong>{deleteTarget?.name}</strong>? Any account assigned this role
            will lose its permissions. This can't be undone.
          </div>
        }
      />

      <ResetPasswordModal
        open={!!pwUser}
        subjectName={pwUser ? userName(pwUser) : ''}
        saving={pwSaving}
        onCancel={() => setPwUser(null)}
        onSubmit={submitReset}
      />
    </div>
  );
}
