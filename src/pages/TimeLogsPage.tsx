import { useEffect, useState } from 'react';
import type { TimeEntry } from '@/types/domain';
import { getCurrentEmployee, getTimeEntries } from '@/lib/api';
import { Card, Chip } from '@/components/ui';
import { PageIntro, Table, Td, EmptyState } from '@/components/page';
import { useToast } from '@/components/Toast';
import { fmtTableDate, fmtTime12 } from '@/lib/format';

/* =====================================================================
   Time Logs — date-range filterable table of the user's time entries,
   with a CSV export. Mirrors the prototype Time Logs screen.
   ===================================================================== */

export function TimeLogsPage() {
  const { notify } = useToast();
  const [rows, setRows] = useState<TimeEntry[]>([]);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [loading, setLoading] = useState(true);

  async function load(f?: string, t?: string) {
    setLoading(true);
    const me = await getCurrentEmployee();
    setRows(await getTimeEntries(me.id, f || undefined, t || undefined));
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function exportCsv() {
    const header = 'Date,Time In,Time Out,Hours,Type,Status\n';
    const body = rows
      .map((r) => [fmtTableDate(r.workDate), r.timeIn ?? '', r.timeOut ?? '', r.hours ?? '', r.kind, r.status].join(','))
      .join('\n');
    const blob = new Blob([header + body], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'time-logs.csv'; a.click();
    URL.revokeObjectURL(url);
    notify('Time logs exported');
  }

  return (
    <div style={{ maxWidth: 940 }}>
      <PageIntro title="My Time Logs" subtitle="Your recorded attendance, filterable by date range." />

      <Card style={{ padding: '16px 18px', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 14, flexWrap: 'wrap' }}>
          <div>
            <label className="ao-label">From</label>
            <input className="ao-input" style={{ width: 170 }} type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div>
            <label className="ao-label">To</label>
            <input className="ao-input" style={{ width: 170 }} type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <button className="ao-btn ao-btn--primary" style={{ height: 42, padding: '0 18px' }} onClick={() => load(from, to)}>
            Apply
          </button>
          {(from || to) && (
            <button className="ao-btn ao-btn--ghost" style={{ height: 42, padding: '0 16px' }}
              onClick={() => { setFrom(''); setTo(''); load(); }}>
              Clear
            </button>
          )}
          <button className="ao-btn ao-btn--ghost" style={{ height: 42, padding: '0 16px', marginLeft: 'auto' }} onClick={exportCsv}>
            Export CSV
          </button>
        </div>
      </Card>

      <Card style={{ overflow: 'hidden' }}>
        {loading ? (
          <EmptyState message="Loading time logs…" />
        ) : rows.length === 0 ? (
          <EmptyState message="No time logs in this range." />
        ) : (
          <Table head={['Date', 'Time In', 'Time Out', 'Hours', 'Type', 'Status']}>
            {rows.map((r) => (
              <tr key={r.id}>
                <Td style={{ fontWeight: 600, color: 'var(--ao-text)' }}>{fmtTableDate(r.workDate)}</Td>
                <Td>{fmtTime12(r.timeIn) || '—'}</Td>
                <Td>{fmtTime12(r.timeOut) || '—'}</Td>
                <Td>{r.hours != null ? `${r.hours.toFixed(1)} h` : '—'}</Td>
                <Td style={{ textTransform: 'capitalize' }}>{r.kind}</Td>
                <Td><Chip status={r.status} /></Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
    </div>
  );
}
