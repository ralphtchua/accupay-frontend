import { useEffect, useMemo, useState } from 'react';
import { getMyTimeLogs, type TimeLogEntry } from '@/services/TimeLogsService';
import { Card } from '@/components/ui';
import { PageIntro, Table, Td, EmptyState, ItemPager, DateRangeFilter } from '@/components/page';
import { useToast } from '@/components/Toast';
import { fmtTableDate, fmtTime12 } from '@/lib/format';

/* =====================================================================
   Time Logs — the employee's own check-ins/outs. One page shows 30
   records (newest first); the arrows page through the next 30 older ones.
   An optional date range narrows the set, still 30 per page.
   Data from GET /api/timelogs/employee, with CSV export.
   ===================================================================== */

const PAGE_SIZE = 30;

const pad = (n: number) => String(n).padStart(2, '0');
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
// No filter -> pull a wide history (capped by the API page size) so paging
// walks the full set of past requests, not just a calendar month.
const WIDE_FROM = ymd(new Date(Date.now() - 6 * 365 * 86_400_000));

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
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [fromInput, setFromInput] = useState('');
  const [toInput, setToInput] = useState('');
  const [applied, setApplied] = useState<{ from: string; to: string } | null>(null);

  const from = applied?.from || WIDE_FROM;
  const to = applied?.to || ymd(new Date());

  useEffect(() => {
    let alive = true;
    setLoading(true);
    getMyTimeLogs(from, to)
      .then((logs) => {
        if (!alive) return;
        logs.sort((a, b) => ((a.startTime ?? a.date) < (b.startTime ?? b.date) ? 1 : -1)); // newest first
        setRows(logs);
        setPage(0);
      })
      .catch(() => alive && setRows([]))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [from, to]);

  const pageRows = useMemo(
    () => rows.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE),
    [rows, page],
  );

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
      <PageIntro title="My Time Logs" subtitle="Your recorded check-ins and check-outs, 30 at a time." />

      <Card style={{ padding: '14px 18px', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 14, flexWrap: 'wrap' }}>
          <DateRangeFilter
            from={fromInput}
            to={toInput}
            onFrom={setFromInput}
            onTo={setToInput}
            onApply={() => setApplied({ from: fromInput, to: toInput })}
            onClear={() => { setFromInput(''); setToInput(''); setApplied(null); }}
            active={applied != null}
          />
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 14 }}>
            <ItemPager
              page={page}
              pageSize={PAGE_SIZE}
              total={rows.length}
              onOlder={() => setPage((p) => p + 1)}
              onNewer={() => setPage((p) => Math.max(0, p - 1))}
            />
            <button className="ao-btn ao-btn--ghost" style={{ height: 40, padding: '0 16px' }} onClick={exportCsv}>
              Export CSV
            </button>
          </div>
        </div>
      </Card>

      <Card style={{ overflow: 'hidden' }}>
        {loading ? (
          <EmptyState message="Loading time logs…" />
        ) : rows.length === 0 ? (
          <EmptyState message={applied ? 'No time logs in this date range.' : 'No time logs yet.'} />
        ) : (
          <Table head={['Date', 'Time In', 'Time Out', 'Hours']}>
            {pageRows.map((r) => {
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
