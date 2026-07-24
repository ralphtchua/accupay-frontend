import { useEffect, useMemo, useState } from 'react';
import type { Filing, FilingKind, FilingStatus } from '@/types/domain';
import { getMyFilings } from '@/services/FilingsService';
import { Card, Chip } from '@/components/ui';
import { PageIntro, Table, Td, EmptyState, ItemPager, DateRangeFilter } from '@/components/page';
import { Segmented } from '@/components/form';
import { fmtTableDate, fmtTime12 } from '@/lib/format';

/* =====================================================================
   My Requests — all of the user's filings (TimeLog / Overtime / Leave)
   with type, status, and date-range filters. The table shows 30 requests
   per page (newest first) with older/newer arrows.
   ===================================================================== */

const PAGE_SIZE = 30;

const KIND_LABEL: Record<Filing['kind'], string> = {
  TimeLog: 'Time Log', Overtime: 'Overtime', Leave: 'Leave',
};

function detail(f: Filing): string {
  if (f.kind === 'TimeLog') return `${f.timelogSubtype ?? ''} · ${fmtTime12(f.startTime)}`;
  if (f.kind === 'Overtime') return `${fmtTime12(f.startTime)}→${fmtTime12(f.endTime)} · ${f.hours?.toFixed(1)} h`;
  return `${f.leaveType} · ${f.days ?? 0} day(s)`;
}

export function MyRequestsPage() {
  const [all, setAll] = useState<Filing[]>([]);
  const [typeFilter, setTypeFilter] = useState<'All' | FilingKind>('All');
  const [filter, setFilter] = useState<'All' | FilingStatus>('All');
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [fromInput, setFromInput] = useState('');
  const [toInput, setToInput] = useState('');
  const [applied, setApplied] = useState<{ from: string; to: string } | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setAll(await getMyFilings());
      } catch {
        setAll([]); // surfaces as the empty state rather than a crash
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const rows = useMemo(
    () =>
      all.filter((f) => {
        const d = (f.filingDate || '').slice(0, 10);
        return (
          (typeFilter === 'All' || f.kind === typeFilter) &&
          (filter === 'All' || f.status === filter) &&
          (!applied || ((!applied.from || d >= applied.from) && (!applied.to || d <= applied.to)))
        );
      }),
    [all, typeFilter, filter, applied],
  );

  // Any filter change returns to the first (most recent) page.
  useEffect(() => { setPage(0); }, [typeFilter, filter, applied]);

  const pageRows = useMemo(
    () => rows.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE),
    [rows, page],
  );

  return (
    <div style={{ maxWidth: 940 }}>
      <PageIntro
        title="My Requests" subtitle="Every filing you've submitted and its current status."
        right={
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}>
            <Segmented
              value={typeFilter}
              onChange={setTypeFilter}
              options={[
                { value: 'All', label: 'All types' },
                { value: 'Leave', label: 'Leave' },
                { value: 'Overtime', label: 'Overtime' },
                { value: 'TimeLog', label: 'Time Logs' },
              ]}
            />
            <Segmented
              value={filter}
              onChange={setFilter}
              options={[
                { value: 'All', label: 'All' },
                { value: 'Pending', label: 'Pending' },
                { value: 'Approved', label: 'Approved' },
                { value: 'Declined', label: 'Declined' },
              ]}
            />
          </div>
        }
      />

      <Card style={{ padding: '14px 18px', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap' }}>
          <DateRangeFilter
            from={fromInput}
            to={toInput}
            onFrom={setFromInput}
            onTo={setToInput}
            onApply={() => setApplied({ from: fromInput, to: toInput })}
            onClear={() => { setFromInput(''); setToInput(''); setApplied(null); }}
            active={applied != null}
          />
          <ItemPager
            page={page}
            pageSize={PAGE_SIZE}
            total={rows.length}
            onOlder={() => setPage((p) => p + 1)}
            onNewer={() => setPage((p) => Math.max(0, p - 1))}
          />
        </div>
      </Card>

      <Card style={{ overflow: 'hidden' }}>
        {loading ? (
          <EmptyState message="Loading your requests…" />
        ) : rows.length === 0 ? (
          <EmptyState message={applied || typeFilter !== 'All' || filter !== 'All' ? 'No requests match your filters.' : 'No requests to show.'} />
        ) : (
          <Table head={['Type', 'Date', 'Details', 'Reason', 'Status']}>
            {pageRows.map((f) => (
              <tr key={f.id}>
                <Td style={{ fontWeight: 600, color: 'var(--ao-text)' }}>{KIND_LABEL[f.kind]}</Td>
                <Td>{fmtTableDate(f.filingDate)}</Td>
                <Td>{detail(f)}</Td>
                <Td style={{ color: 'var(--ao-muted)', maxWidth: 220 }}>{f.reason}</Td>
                <Td><Chip status={f.status} /></Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
    </div>
  );
}
