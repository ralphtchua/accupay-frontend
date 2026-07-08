import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createLeave, getLeaveTypes } from '@/services/FilingsService';
import { Card } from '@/components/ui';
import { Field, Select, TextInput, TextArea } from '@/components/form';
import { useToast } from '@/components/Toast';

/* =====================================================================
   Request Leave — matches the prototype File Leave form:
   leave type + timing as side-by-side native selects, Day mode with an
   editable "Days requested" field, Hour mode with a computed duration,
   grey inline summary bar, and a full-width "Submit request" button.
   ===================================================================== */

function dayCount(from: string, to: string): number {
  if (!from || !to) return 0;
  const ms = +new Date(to) - +new Date(from);
  return ms >= 0 ? Math.round(ms / 86_400_000) + 1 : 0;
}
function hoursBetween(from: string, to: string): number {
  if (!from || !to) return 0;
  const [fh, fm] = from.split(':').map(Number);
  const [th, tm] = to.split(':').map(Number);
  const mins = th * 60 + tm - (fh * 60 + fm);
  return mins > 0 ? Math.round((mins / 60) * 100) / 100 : 0;
}

const SUMMARY_BAR: React.CSSProperties = {
  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  background: '#f2f5f9', borderRadius: 9, padding: '11px 14px', marginBottom: 15,
  font: '500 13px var(--ao-font)', color: 'var(--ao-text-3)',
};

export function LeavePage() {
  const { notify } = useToast();
  const navigate = useNavigate();
  const [types, setTypes] = useState<string[]>([]);
  const [leaveType, setLeaveType] = useState('');
  const [timing, setTiming] = useState<'Day' | 'Hour'>('Day');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [date, setDate] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [reason, setReason] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getLeaveTypes()
      .then((t) => { setTypes(t); if (t[0]) setLeaveType(t[0]); })
      .catch(() => setTypes([]));
  }, []);

  // Days and hours are auto-derived (read-only) from the inputs.
  const days = useMemo(() => dayCount(from, to), [from, to]);
  const hours = useMemo(() => hoursBetween(start, end), [start, end]);

  const valid = leaveType && reason.trim() && (timing === 'Day' ? days > 0 : date && hours > 0);

  async function submit() {
    if (!valid) { setErr('Please complete all required fields.'); return; }
    setErr('');
    setBusy(true);
    try {
      await createLeave(
        timing === 'Day'
          ? { leaveType, timing, from, to, reason: reason.trim() }
          : { leaveType, timing, date, start, end, reason: reason.trim() },
      );
      notify('Leave filed — routed to your approver');
      navigate('/myrequests');
    } catch (e) {
      setErr((e as Error).message || 'Could not submit leave. Please try again.');
      setBusy(false);
    }
  }

  return (
    <Card style={{ maxWidth: 560, padding: '26px 28px' }}>
      <div style={{ font: '700 17px var(--ao-font)', marginBottom: 4 }}>Request leave</div>
      <div style={{ font: '400 13px var(--ao-font)', color: 'var(--ao-muted)', marginBottom: 20 }}>
        Your balance updates once the leave is approved.
      </div>

      <div style={{ display: 'flex', gap: 14 }}>
        <div style={{ flex: 1 }}>
          <Field label="Leave type">
            <Select value={leaveType} onChange={setLeaveType}
              options={types.map((t) => ({ value: t, label: t }))} />
          </Field>
        </div>
        <div style={{ flex: 1 }}>
          <Field label="Leave timing">
            <Select value={timing} onChange={(v) => setTiming(v as 'Day' | 'Hour')}
              options={[{ value: 'Day', label: 'Day' }, { value: 'Hour', label: 'Hour' }]} />
          </Field>
        </div>
      </div>

      {timing === 'Day' ? (
        <>
          <div style={{ display: 'flex', gap: 14 }}>
            <div style={{ flex: 1 }}><Field label="From"><TextInput type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></Field></div>
            <div style={{ flex: 1 }}><Field label="To"><TextInput type="date" value={to} onChange={(e) => setTo(e.target.value)} /></Field></div>
          </div>
          <div style={SUMMARY_BAR}>
            Days requested
            <b style={{ color: 'var(--ao-text)', font: '700 14px var(--ao-font)' }}>{days}</b>
          </div>
        </>
      ) : (
        <>
          <Field label="Leave date"><TextInput type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
          <div style={{ display: 'flex', gap: 14 }}>
            <div style={{ flex: 1 }}><Field label="Start time"><TextInput type="time" value={start} onChange={(e) => setStart(e.target.value)} /></Field></div>
            <div style={{ flex: 1 }}><Field label="End time"><TextInput type="time" value={end} onChange={(e) => setEnd(e.target.value)} /></Field></div>
          </div>
          <div style={SUMMARY_BAR}>
            Duration <b style={{ color: 'var(--ao-text)' }}>{hours.toFixed(2)} h</b>
          </div>
        </>
      )}

      <Field label="Reason">
        <TextArea placeholder="e.g. Family trip" value={reason} onChange={(e) => setReason(e.target.value)} />
      </Field>

      {err && <div style={{ font: '500 12px var(--ao-font)', color: 'var(--ao-danger)', marginBottom: 14 }}>{err}</div>}

      <button
        onClick={submit}
        disabled={busy}
        style={{
          width: '100%', height: 44, background: 'var(--ao-primary)', color: '#fff', border: 'none',
          borderRadius: 9, font: '700 14px var(--ao-font)', cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.6 : 1,
        }}
      >
        {busy ? 'Submitting…' : 'Submit request'}
      </button>
    </Card>
  );
}
