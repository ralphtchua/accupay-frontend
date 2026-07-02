import { useEffect, useState } from 'react';
import type { Role, RolePermission } from '@/types/domain';
import { getRolePermissions, getRoles, setRolePermission } from '@/lib/api';
import { Card } from '@/components/ui';
import { PageIntro, EmptyState } from '@/components/page';
import { Toggle } from '@/components/form';
import { useToast } from '@/components/Toast';

/* =====================================================================
   Roles & Permissions — role selector on the left, a toggle list of
   screen permissions on the right. Mirrors the prototype matrix.
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
    <div style={{ maxWidth: 880 }}>
      <PageIntro title="Roles & Permissions" subtitle="Control which screens each role can access." />

      <div style={{ display: 'flex', gap: 18, alignItems: 'flex-start' }}>
        <Card style={{ width: 220, flexShrink: 0, padding: 8 }}>
          {roles.map((r) => {
            const active = activeRole?.id === r.id;
            return (
              <button key={r.id} onClick={() => setActiveRole(r)}
                style={{
                  display: 'block', width: '100%', textAlign: 'left', border: 'none', cursor: 'pointer',
                  padding: '11px 13px', borderRadius: 8, marginBottom: 2,
                  background: active ? 'var(--ao-info-bg)' : 'transparent',
                  color: active ? 'var(--ao-primary)' : 'var(--ao-text-2)',
                  font: `${active ? 700 : 500} 13px var(--ao-font)`,
                }}>
                {r.name}
                <span style={{ display: 'block', font: '400 10.5px var(--ao-font)', color: 'var(--ao-muted)', marginTop: 1, textTransform: 'capitalize' }}>
                  {r.viewGroup} view
                </span>
              </button>
            );
          })}
        </Card>

        <Card style={{ flex: 1, padding: '8px 4px' }}>
          {loading ? (
            <EmptyState message="Loading permissions…" />
          ) : (
            perms.map((p) => (
              <div key={p.code} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderBottom: '1px solid var(--ao-border-soft)' }}>
                <div>
                  <div style={{ font: '600 13.5px var(--ao-font)', color: 'var(--ao-text)' }}>{p.label}</div>
                  <div style={{ font: '400 11px var(--ao-font-mono)', color: 'var(--ao-muted)' }}>{p.code}</div>
                </div>
                <Toggle checked={p.allowed} onChange={(v) => toggle(p.code, v)} />
              </div>
            ))
          )}
        </Card>
      </div>
    </div>
  );
}
