import { useEffect, useMemo, useState } from 'react';
import type { Filing, FilingStatus } from '@/types/domain';
import { getMyFilings } from '@/services/FilingsService';
import { Card, Chip } from '@/components/ui';
import { PageIntro, Table, Td, EmptyState } from '@/components/page';
import { Segmented } from '@/components/form';
import { fmtTableDate, fmtTime12 } from '@/lib/format';

/* =====================================================================
   My Requests — all of the user's filings (TimeLog / Overtime / Leave)
   with a status filter. Mirrors the prototype My Requests screen.
   ===================================================================== */

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
  const [filter, setFilter] = useState<'All' | FilingStatus>('All');
  const [loading, setLoading] = useState(true);

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
    () => (filter === 'All' ? all : all.filter((f) => f.status === filter)),
    [all, filter],
  );

  return (
    <div style={{ maxWidth: 940 }}>
      <PageIntro
        title="My Requests" subtitle="Every filing you've submitted and its current status."
        right={
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
        }
      />

      <Card style={{ overflow: 'hidden' }}>
        {loading ? (
          <EmptyState message="Loading your requests…" />
        ) : rows.length === 0 ? (
          <EmptyState message="No requests to show." />
        ) : (
          <Table head={['Type', 'Date', 'Details', 'Reason', 'Status']}>
            {rows.map((f) => (
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
