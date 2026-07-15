import { useEffect, useState } from 'react';
import { getMyTimeLogs, type TimeLogEntry } from '@/services/TimeLogsService';
import { Card } from '@/components/ui';
import { PageIntro, Table, Td, EmptyState } from '@/components/page';
import { useToast } from '@/components/Toast';
import { fmtTableDate, fmtTime12 } from '@/lib/format';

/* =====================================================================
   Time Logs — the employee's own check-ins/outs, filterable by date range,
   with CSV export. Data from GET /api/self-service/timelogs/employee.
   ===================================================================== */

const datePart = (iso: string) => iso.split('T')[0];

function timeOf(iso?: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return fmtTime12(`${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`);
}
function hoursOf(a?: string | null, b?: string | null): number | null {
  if (!a || !b) return null;
  const h = (new Date(b).getTime() - new Date(a).getTime()) / 3_600_000;
  return h > 0 ? h : null;
}

export function TimeLogsPage() {
  const { notify } = useToast();
  const [rows, setRows] = useState<TimeLogEntry[]>([]);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [loading, setLoading] = useState(true);

  async function load(f?: string, t?: string) {
    setLoading(true);
    try {
      const logs = await getMyTimeLogs(f || undefined, t || undefined);
      logs.sort((a, b) => ((a.startTime ?? a.date) < (b.startTime ?? b.date) ? 1 : -1)); // newest first
      setRows(logs);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function exportCsv() {
    const header = 'Date,Time In,Time Out,Hours\n';
    const body = rows
      .map((r) => {
        const h = hoursOf(r.startTime, r.endTime);
        return [fmtTableDate(datePart(r.date)), timeOf(r.startTime), timeOf(r.endTime), h != null ? h.toFixed(2) : ''].join(',');
      })
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
      <PageIntro title="My Time Logs" subtitle="Your recorded check-ins and check-outs, filterable by date range." />

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
          <Table head={['Date', 'Time In', 'Time Out', 'Hours']}>
            {rows.map((r) => {
              const h = hoursOf(r.startTime, r.endTime);
              return (
                <tr key={r.id}>
                  <Td style={{ fontWeight: 600, color: 'var(--ao-text)' }}>{fmtTableDate(datePart(r.date))}</Td>
                  <Td>{timeOf(r.startTime)}</Td>
                  <Td>{timeOf(r.endTime)}</Td>
                  <Td>{h != null ? `${h.toFixed(2)} h` : '—'}</Td>
                </tr>
              );
            })}
          </Table>
        )}
      </Card>
    </div>
  );
}
