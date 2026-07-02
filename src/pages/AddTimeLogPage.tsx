import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { TimeLogSubtype } from '@/types/domain';
import { createTimeLogFiling } from '@/lib/api';
import { Card } from '@/components/ui';
import { Field, Select, TextInput, TextArea, EmailCallout } from '@/components/form';
import { useToast } from '@/components/Toast';

/* =====================================================================
   Add Time Log — matches the prototype: in-card title, Date + Entry type
   (native select) row, half-width Time, reason note, email callout, and
   a full-width "Submit for approval" button.
   ===================================================================== */

export function AddTimeLogPage() {
  const { notify } = useToast();
  const navigate = useNavigate();
  const [subtype, setSubtype] = useState<TimeLogSubtype>('TIME IN');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [reason, setReason] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!(date && time && reason.trim())) { setErr('Please complete all fields.'); return; }
    setErr('');
    setBusy(true);
    await createTimeLogFiling({ subtype, date, time, reason: reason.trim() });
    setBusy(false);
    notify('Time log filed — routed to your approver');
    navigate('/myrequests');
  }

  return (
    <Card style={{ maxWidth: 560, padding: '26px 28px' }}>
      <div style={{ font: '700 17px var(--ao-font)', marginBottom: 4 }}>Add Time Log</div>
      <div style={{ font: '400 13px var(--ao-font)', color: 'var(--ao-muted)', marginBottom: 20 }}>
        Forgot to clock in or out? File a correction for approval.
      </div>

      <div style={{ display: 'flex', gap: 14 }}>
        <div style={{ flex: 1 }}>
          <Field label="Date"><TextInput type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
        </div>
        <div style={{ flex: 1 }}>
          <Field label="Entry type">
            <Select
              value={subtype === 'TIME IN' ? 'Time In' : 'Time Out'}
              onChange={(v) => setSubtype(v === 'Time In' ? 'TIME IN' : 'TIME OUT')}
              options={[{ value: 'Time In', label: 'Time In' }, { value: 'Time Out', label: 'Time Out' }]}
            />
          </Field>
        </div>
      </div>

      <div style={{ width: '50%' }}>
        <Field label="Time"><TextInput type="time" value={time} onChange={(e) => setTime(e.target.value)} /></Field>
      </div>

      <Field label="Reason / note (sent to approver)">
        <TextArea placeholder="e.g. Forgot to clock in, arrived 8:00 AM" value={reason} onChange={(e) => setReason(e.target.value)} />
      </Field>

      {err && <div style={{ font: '500 12px var(--ao-font)', color: 'var(--ao-danger)', marginBottom: 14 }}>{err}</div>}

      <EmailCallout>
        On submit, this filing is <b>emailed to your approver(s)</b> and stays <b>Pending</b> until approved. Approvers can also approve in-app.
      </EmailCallout>

      <button
        onClick={submit} disabled={busy}
        style={{ width: '100%', height: 44, background: 'var(--ao-primary)', color: '#fff', border: 'none', borderRadius: 9, font: '700 14px var(--ao-font)', cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.6 : 1 }}
      >
        {busy ? 'Submitting…' : 'Submit for approval'}
      </button>
    </Card>
  );
}
