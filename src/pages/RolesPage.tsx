import { useEffect, useState } from 'react';
import type { Role, RolePermission } from '@/types/domain';
import { getRolePermissions, getRoles, setRolePermission } from '@/lib/api';
import { Toggle } from '@/components/form';
import { EmptyState } from '@/components/page';
import { useToast } from '@/components/Toast';

/* =====================================================================
   Roles & Permissions — matches the prototype: a column of white role
   cards on the left, and a "Screen access — {role}" panel on the right
   with a toggle per screen. Disabled permissions show greyed labels.
   ===================================================================== */

export function RolesPage() {
  const { notify } = useToast();
  const [roles, setRoles] = useState<Role[]>([]);
  const [activeRole, setActiveRole] = useState<Role | null>(null);
  const [perms, setPerms] = useState<RolePermission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getRoles().then((r) => { setRoles(r); setActiveRole(r[0] ?? null); });
  }, []);

  useEffect(() => {
    if (!activeRole) return;
    setLoading(true);
    getRolePermissions(activeRole.id).then((p) => { setPerms(p); setLoading(false); });
  }, [activeRole]);

  async function toggle(code: string, allowed: boolean) {
    if (!activeRole) return;
    setPerms((prev) => prev.map((p) => (p.code === code ? { ...p, allowed } : p)));
    await setRolePermission(activeRole.id, code, allowed);
    notify('Permission updated');
  }

  return (
    <div style={{ maxWidth: 820, display: 'flex', gap: 18, alignItems: 'flex-start' }}>
      {/* Role list — white bordered cards */}
      <div style={{ width: 180, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 7 }}>
        {roles.map((r) => {
          const active = activeRole?.id === r.id;
          return (
            <div
              key={r.id}
              onClick={() => setActiveRole(r)}
              style={{
                padding: '11px 13px', borderRadius: 9, cursor: 'pointer',
                font: '600 13px var(--ao-font)', transition: '.15s',
                background: active ? 'var(--ao-primary)' : 'var(--ao-surface)',
                color: active ? '#fff' : 'var(--ao-text-3)',
                border: active ? '1px solid var(--ao-primary)' : '1px solid var(--ao-border)',
              }}
            >
              {r.name}
            </div>
          );
        })}
      </div>

      {/* Screen access panel */}
      <div style={{ flex: 1, background: 'var(--ao-surface)', border: '1px solid var(--ao-border)', borderRadius: 14, padding: '22px 24px' }}>
        <div style={{ font: '700 15px var(--ao-font)' }}>Screen access — {activeRole?.name ?? ''}</div>
        <div style={{ font: '400 12px var(--ao-font)', color: 'var(--ao-muted-2)', marginBottom: 16 }}>
          Toggle which screens this role can open.
        </div>
        {loading ? (
          <EmptyState message="Loading permissions…" />
        ) : (
          perms.map((p) => (
            <div key={p.code} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '11px 0', borderBottom: '1px solid var(--ao-border-soft)' }}>
              <span style={{ font: '500 13px var(--ao-font)', color: p.allowed ? 'var(--ao-text-2)' : 'var(--ao-muted-2)' }}>{p.label}</span>
              <Toggle checked={p.allowed} onChange={(v) => toggle(p.code, v)} />
            </div>
          ))
        )}
      </div>
    </div>
  );
}
