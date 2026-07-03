import { useEffect, useState } from 'react';
import type { Settings } from '@/types/domain';
import {
  getSettings, saveSettings, runAccupaySync,
  getEmailTemplates, saveEmailTemplate, type EmailTemplate,
} from '@/lib/api';
import { EmptyState } from '@/components/page';
import { Toggle, Field, TextInput, TextArea } from '@/components/form';
import { ConfirmModal } from '@/components/ConfirmModal';
import { useToast } from '@/components/Toast';

/* =====================================================================
   Settings — matches the prototype 2×2 grid: General (read-only rows),
   Approval routing (toggles), Email templates (per-template Edit), and
   the highlighted Accupay integration card. Editing a template opens a
   modal with subject + body.
   ===================================================================== */

const CARD: React.CSSProperties = {
  background: 'var(--ao-surface)', border: '1px solid var(--ao-border)',
  borderRadius: 14, padding: '20px 22px',
};
const TITLE: React.CSSProperties = { font: '700 14px var(--ao-font)', marginBottom: 14 };

function KeyRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', font: '500 13px var(--ao-font)', color: 'var(--ao-text-3)' }}>
      {label} <span style={{ color: 'var(--ao-text)', fontWeight: 600 }}>{value}</span>
    </div>
  );
}

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', font: '500 13px var(--ao-font)', color: 'var(--ao-text-3)' }}>
      {label}
      <Toggle checked={checked} onChange={onChange} />
    </div>
  );
}

export function SettingsPage() {
  const { notify } = useToast();
  const [s, setS] = useState<Settings | null>(null);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [editing, setEditing] = useState<EmailTemplate | null>(null);
  const [draftSubject, setDraftSubject] = useState('');
  const [draftBody, setDraftBody] = useState('');
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    getSettings().then(setS);
    getEmailTemplates().then(setTemplates);
  }, []);
  if (!s) return <EmptyState message="Loading settings…" />;

  const patch = (p: Partial<Settings>) => {
    const next = { ...s, ...p };
    setS(next);
    saveSettings(next); // persist toggles immediately
  };

  function openEdit(t: EmailTemplate) {
    setEditing(t); setDraftSubject(t.subject); setDraftBody(t.body);
  }
  async function saveTemplate() {
    if (!editing) return;
    const updated = await saveEmailTemplate(editing.key, draftSubject, draftBody);
    setTemplates((prev) => prev.map((t) => (t.key === updated.key ? updated : t)));
    setEditing(null);
    notify('Email template saved');
  }

  async function sync() {
    setSyncing(true);
    const res = await runAccupaySync();
    setSyncing(false);
    setS((prev) => prev ? { ...prev, accupayLastSyncAt: res.syncedAt, accupayLastRecordCount: res.recordCount } : prev);
    notify(`Synced ${res.recordCount} records to Accupay`);
  }

  const lastSync = s.accupayLastSyncAt
    ? `Last sync: ${new Date(s.accupayLastSyncAt).toLocaleString()} · ${s.accupayLastRecordCount} records`
    : 'No sync yet.';

  return (
    <div style={{ maxWidth: 880 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
        {/* General */}
        <div style={CARD}>
          <div style={TITLE}>General</div>
          <KeyRow label="Timezone" value={s.timezone} />
          <KeyRow label="Work week" value={s.workWeek} />
          <KeyRow label="Standard hours/day" value={String(s.standardHoursDay)} />
        </div>

        {/* Approval routing */}
        <div style={CARD}>
          <div style={TITLE}>Approval routing</div>
          <ToggleRow label="Email time logs to approver" checked={s.emailTimelog} onChange={(v) => patch({ emailTimelog: v })} />
          <ToggleRow label="Email Overtime to approver" checked={s.emailOvertime} onChange={(v) => patch({ emailOvertime: v })} />
          <ToggleRow label="Email Leave to approver" checked={s.emailLeave} onChange={(v) => patch({ emailLeave: v })} />
          <ToggleRow label="Auto-remind approver after 48h" checked={s.autoRemind48h} onChange={(v) => patch({ autoRemind48h: v })} />
        </div>

        {/* Email templates */}
        <div style={CARD}>
          <div style={TITLE}>Email templates</div>
          {templates.map((t) => (
            <div key={t.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', font: '500 13px var(--ao-font)', color: 'var(--ao-text-3)' }}>
              {t.label}
              <span onClick={() => openEdit(t)} style={{ color: 'var(--ao-primary)', cursor: 'pointer', fontWeight: 600 }}>Edit</span>
            </div>
          ))}
        </div>

        {/* Accupay integration */}
        <div style={{ background: 'var(--ao-surface-soft)', border: '1px solid var(--ao-border-info)', borderRadius: 14, padding: '20px 22px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ font: '700 14px var(--ao-font)', color: 'var(--ao-primary)' }}>Accupay integration (API)</div>
            <span style={{ font: '700 9px var(--ao-font-mono)', color: 'var(--ao-success)', background: 'var(--ao-success-bg)', padding: '3px 7px', borderRadius: 5 }}>
              {s.accupayConnected ? 'CONNECTED' : 'OFFLINE'}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', font: '500 13px var(--ao-font)', color: '#3a4a6b' }}>
            Real-time sync
            <Toggle checked={s.accupayRealtimeSync} onChange={(v) => patch({ accupayRealtimeSync: v })} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', font: '500 13px var(--ao-font)', color: '#3a4a6b' }}>
            API key <span style={{ font: '500 12px var(--ao-font-mono)', color: 'var(--ao-text)' }}>••••••3f2a</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
            <div style={{ font: '400 11px var(--ao-font)', color: 'var(--ao-success)' }}>{lastSync}</div>
            <button className="ao-btn ao-btn--ghost" style={{ height: 34, padding: '0 14px', opacity: syncing ? 0.6 : 1 }} disabled={syncing} onClick={sync}>
              {syncing ? 'Syncing…' : 'Sync now'}
            </button>
          </div>
        </div>
      </div>

      <ConfirmModal
        open={!!editing}
        width={520}
        title={editing ? `Edit template — ${editing.label}` : ''}
        confirmLabel="Save template"
        onCancel={() => setEditing(null)}
        onConfirm={saveTemplate}
        confirmDisabled={!draftSubject.trim() || !draftBody.trim()}
        body={
          <div style={{ marginTop: 4 }}>
            <Field label="Subject">
              <TextInput value={draftSubject} onChange={(e) => setDraftSubject(e.target.value)} />
            </Field>
            <Field label="Body" hint="Use placeholders like {approver}, {employee}, {date}, {reason}, {link}.">
              <TextArea style={{ height: 150, fontFamily: 'var(--ao-font-mono)', fontSize: 12.5 }} value={draftBody} onChange={(e) => setDraftBody(e.target.value)} />
            </Field>
          </div>
        }
      />
    </div>
  );
}
