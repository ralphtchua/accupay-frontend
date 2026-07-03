import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createOvertimeFiling } from '@/lib/api';
import { Card } from '@/components/ui';
import { Field, TextInput, TextArea, EmailCallout } from '@/components/form';
import { useToast } from '@/components/Toast';

/* =====================================================================
   File Overtime — matches the prototype: in-card title, Date + OT hours
   row, From/To time row (hours auto-fill from the range but stay
   editable), reason, email callout, full-width "Submit overtime".
   ===================================================================== */

function hoursBetween(from: string, to: string): number {
  if (!from || !to) return 0;
  const [fh, fm] = from.split(':').map(Number);
  const [th, tm] = to.split(':').map(Number);
  const mins = th * 60 + tm - (fh * 60 + fm);
  return mins > 0 ? Math.round((mins / 60) * 100) / 100 : 0;
}

export function OvertimePage() {
  const { notify } = useToast();
  const navigate = useNavigate();
  const [date, setDate] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [reason, setReason] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  // OT hours are auto-derived (read-only) from the time range.
  const hours = useMemo(() => hoursBetween(from, to), [from, to]);

  async function submit() {
    if (!(date && hours > 0 && reason.trim())) { setErr('Please complete all fields.'); return; }
    setErr('');
    setBusy(true);
    await createOvertimeFiling({ date, from, to, hours, reason: reason.trim() });
    setBusy(false);
    notify('Overtime filed — routed to your approver');
    navigate('/myrequests');
  }

  return (
    <Card style={{ maxWidth: 560, padding: '26px 28px' }}>
      <div style={{ font: '700 17px var(--ao-font)', marginBottom: 4 }}>File Overtime</div>
      <div style={{ font: '400 13px var(--ao-font)', color: 'var(--ao-muted)', marginBottom: 20 }}>
        Overtime is approved before it counts toward payroll.
      </div>

      <div style={{ display: 'flex', gap: 14 }}>
        <div style={{ flex: 1 }}><Field label="Date"><TextInput type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field></div>
        <div style={{ flex: 1 }}>
          <Field label="OT hours">
            <div style={{
              height: 42, display: 'flex', alignItems: 'center', padding: '0 12px',
              border: '1px solid var(--ao-border-strong)', borderRadius: 9, background: '#eef1f5',
              font: '600 14px var(--ao-font)', color: 'var(--ao-text)',
            }}>
              {hours.toFixed(2)} h
            </div>
          </Field>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 14 }}>
        <div style={{ flex: 1 }}><Field label="From"><TextInput type="time" value={from} onChange={(e) => setFrom(e.target.value)} /></Field></div>
        <div style={{ flex: 1 }}><Field label="To"><TextInput type="time" value={to} onChange={(e) => setTo(e.target.value)} /></Field></div>
      </div>

      <Field label="Reason for overtime">
        <TextArea placeholder="e.g. Month-end reporting deadline" value={reason} onChange={(e) => setReason(e.target.value)} />
      </Field>

      {err && <div style={{ font: '500 12px var(--ao-font)', color: 'var(--ao-danger)', marginBottom: 14 }}>{err}</div>}

      <EmailCallout>
        This overtime filing is <b>emailed to your approver(s)</b>.
      </EmailCallout>

      <button
        onClick={submit} disabled={busy}
        style={{ width: '100%', height: 44, background: 'var(--ao-primary)', color: '#fff', border: 'none', borderRadius: 9, font: '700 14px var(--ao-font)', cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.6 : 1 }}
      >
        {busy ? 'Submitting…' : 'Submit overtime'}
      </button>
    </Card>
  );
}
