import { useEffect, useMemo, useState } from 'react';
import {
  getRoles,
  getPermissions,
  updateRole,
  createRole,
  getUsers,
  getUserRoles,
  saveUserRoles,
  type ApiRole,
  type ApiPermission,
  type ApiRolePermission,
  type ApiUser,
} from '@/services/RolesService';
import { Card, Avatar } from '@/components/ui';
import { Table, Td, EmptyState } from '@/components/page';
import { useToast } from '@/components/Toast';

/* =====================================================================
   Roles & Permissions — two tabs:
   • Role permissions: per-module Read/Create/Update/Delete matrix per role.
   • User assignments: assign each user account a role (saves immediately).
   Admin roles bypass the permission checks entirely.
   ===================================================================== */

type Flags = { read: boolean; create: boolean; update: boolean; delete: boolean };
const FLAG_KEYS: (keyof Flags)[] = ['read', 'create', 'update', 'delete'];
const FLAG_LABELS: Record<keyof Flags, string> = {
  read: 'Read', create: 'Create', update: 'Update', delete: 'Delete',
};
const EMPTY: Flags = { read: false, create: false, update: false, delete: false };

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

  const activeRole = useMemo(
    () => roles.find((r) => r.id === activeId) ?? null,
    [roles, activeId],
  );

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

  async function addRole() {
    const name = window.prompt('New role name');
    if (!name?.trim()) return;
    try {
      const created = await createRole(name.trim());
      await loadAll();
      setActiveId(created.id);
      notify('Role created');
    } catch (e) {
      notify((e as Error).message || 'Could not create role');
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
    <div style={{ maxWidth: 880 }}>
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
            <button className="ao-btn ao-btn--ghost" style={{ height: 40, marginTop: 4 }} onClick={addRole}>
              + New role
            </button>
          </div>

          {/* Permission matrix */}
          <div style={{ flex: 1, background: 'var(--ao-surface)', border: '1px solid var(--ao-border)', borderRadius: 14, padding: '22px 24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <div style={{ font: '700 15px var(--ao-font)' }}>Permissions — {activeRole?.name ?? ''}</div>
              <button
                className="ao-btn ao-btn--primary"
                style={{ height: 38, padding: '0 18px', opacity: dirty && !saving ? 1 : 0.5, cursor: dirty && !saving ? 'pointer' : 'default' }}
                disabled={!dirty || saving}
                onClick={save}
              >
                {saving ? 'Saving…' : 'Save changes'}
              </button>
            </div>
            <div style={{ font: '400 12px var(--ao-font)', color: 'var(--ao-muted-2)', marginBottom: 14 }}>
              Grant read/create/update/delete access per module.
            </div>

            {activeRole?.isAdmin && (
              <div style={{ font: '500 12px var(--ao-font)', color: 'var(--ao-pending)', marginBottom: 12 }}>
                This is an admin role — it already has full access to everything, regardless of the toggles below.
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--ao-border)', font: '600 11px var(--ao-font)', color: 'var(--ao-muted-2)', textTransform: 'uppercase', letterSpacing: '.5px' }}>
              <span style={{ flex: 1 }}>Module</span>
              {FLAG_KEYS.map((k) => <span key={k} style={{ width: 66, textAlign: 'center' }}>{FLAG_LABELS[k]}</span>)}
            </div>

            {permissions.map((p) => (
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
            {permissions.length === 0 && <EmptyState message="No permissions found." />}
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
            <Table head={['User', 'Email', 'Role']}>
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
                      <option value="">— None —</option>
                      {roles.map((r) => (
                        <option key={r.id} value={r.id}>{r.name}</option>
                      ))}
                    </select>
                  </Td>
                </tr>
              ))}
            </Table>
          )}
        </Card>
      )}
    </div>
  );
}
