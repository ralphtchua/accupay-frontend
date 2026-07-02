import { useEffect, useState } from 'react';
import type { Settings } from '@/types/domain';
import { getSettings, runAccupaySync, saveSettings } from '@/lib/api';
import { Card } from '@/components/ui';
import { PageIntro, EmptyState } from '@/components/page';
import { Field, Select, TextInput, Toggle } from '@/components/form';
import { useToast } from '@/components/Toast';

/* =====================================================================
   Settings — General, Email notifications, and Accupay integration.
   Mirrors the prototype Settings panels. Accupay sync is simulated.
   ===================================================================== */

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <div style={{ font: '700 15px var(--ao-font)', margin: '4px 0 14px' }}>{children}</div>;
}

function ToggleRow({ label, desc, checked, onChange }: { label: string; desc: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--ao-border-soft)' }}>
      <div style={{ paddingRight: 16 }}>
        <div style={{ font: '600 13px var(--ao-font)' }}>{label}</div>
        <div style={{ font: '400 12px var(--ao-font)', color: 'var(--ao-muted)' }}>{desc}</div>
      </div>
      <Toggle checked={checked} onChange={onChange} />
    </div>
  );
}

export function SettingsPage() {
  const { notify } = useToast();
  const [s, setS] = useState<Settings | null>(null);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => { getSettings().then(setS); }, []);
  if (!s) return <EmptyState message="Loading settings…" />;

  const patch = (p: Partial<Settings>) => setS({ ...s, ...p });

  async function save() {
    if (!s) return;
    await saveSettings(s);
    notify('Settings saved');
  }
  async function sync() {
    setSyncing(true);
    const res = await runAccupaySync();
    setSyncing(false);
    setS((prev) => prev ? { ...prev, accupayLastSyncAt: res.syncedAt, accupayLastRecordCount: res.recordCount } : prev);
    notify(`Synced ${res.recordCount} records to Accupay`);
  }

  return (
    <div style={{ maxWidth: 640 }}>
      <PageIntro title="Settings" subtitle="System configuration and integrations." />

      <Card style={{ padding: 22, marginBottom: 16 }}>
        <SectionTitle>General</SectionTitle>
        <Field label="Timezone">
          <Select value={s.timezone} onChange={(v) => patch({ timezone: v })}
            options={[{ value: 'GMT+8', label: 'GMT+8 (Manila)' }, { value: 'GMT+0', label: 'GMT (UTC)' }, { value: 'GMT-5', label: 'GMT-5 (US Eastern)' }]} />
        </Field>
        <Field label="Work week">
          <Select value={s.workWeek} onChange={(v) => patch({ workWeek: v })}
            options={[{ value: 'Mon-Fri', label: 'Monday–Friday' }, { value: 'Mon-Sat', label: 'Monday–Saturday' }]} />
        </Field>
        <Field label="Standard hours per day">
          <TextInput type="number" min={1} max={24} value={s.standardHoursDay}
            onChange={(e) => patch({ standardHoursDay: Number(e.target.value) })} />
        </Field>
      </Card>

      <Card style={{ padding: 22, marginBottom: 16 }}>
        <SectionTitle>Email notifications</SectionTitle>
        <ToggleRow label="Time log filings" desc="Email approvers when a time log is filed." checked={s.emailTimelog} onChange={(v) => patch({ emailTimelog: v })} />
        <ToggleRow label="Overtime filings" desc="Email approvers when overtime is filed." checked={s.emailOvertime} onChange={(v) => patch({ emailOvertime: v })} />
        <ToggleRow label="Leave filings" desc="Email approvers when leave is filed." checked={s.emailLeave} onChange={(v) => patch({ emailLeave: v })} />
        <ToggleRow label="48-hour reminder" desc="Remind approvers about filings pending over 48 hours." checked={s.autoRemind48h} onChange={(v) => patch({ autoRemind48h: v })} />
      </Card>

      <Card style={{ padding: 22, marginBottom: 16 }}>
        <SectionTitle>Accupay integration</SectionTitle>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <span style={{ width: 9, height: 9, borderRadius: '50%', background: s.accupayConnected ? 'var(--ao-success)' : 'var(--ao-muted-2)' }} />
          <span style={{ font: '600 13px var(--ao-font)', color: s.accupayConnected ? 'var(--ao-success)' : 'var(--ao-muted)' }}>
            {s.accupayConnected ? 'Connected' : 'Not connected'}
          </span>
        </div>
        <ToggleRow label="Real-time sync" desc="Push approved filings to Accupay as they happen." checked={s.accupayRealtimeSync} onChange={(v) => patch({ accupayRealtimeSync: v })} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 14 }}>
          <div style={{ font: '400 12px var(--ao-font)', color: 'var(--ao-muted)' }}>
            {s.accupayLastSyncAt
              ? `Last sync: ${new Date(s.accupayLastSyncAt).toLocaleString()} · ${s.accupayLastRecordCount} records`
              : 'No sync yet.'}
          </div>
          <button className="ao-btn ao-btn--ghost" style={{ height: 40, padding: '0 18px', opacity: syncing ? 0.6 : 1 }} disabled={syncing} onClick={sync}>
            {syncing ? 'Syncing…' : 'Sync now'}
          </button>
        </div>
      </Card>

      <button className="ao-btn ao-btn--primary" style={{ height: 44, padding: '0 26px' }} onClick={save}>Save settings</button>
    </div>
  );
}
