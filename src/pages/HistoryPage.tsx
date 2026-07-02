import { useEffect, useState } from 'react';
import type { Filing } from '@/types/domain';
import { getApprovalHistory } from '@/lib/api';
import { Card, Chip } from '@/components/ui';
import { PageIntro, Table, Td, EmptyState } from '@/components/page';
import { fmtTableDate, fmtTime12 } from '@/lib/format';

/* =====================================================================
   Approval History — filings the approver has already decided.
   Mirrors the prototype History screen.
   ===================================================================== */

function summary(f: Filing): string {
  if (f.kind === 'TimeLog') return `${f.timelogSubtype} · ${fmtTime12(f.startTime)}`;
  if (f.kind === 'Overtime') return `${fmtTime12(f.startTime)}→${fmtTime12(f.endTime)} · ${f.hours?.toFixed(1)} h`;
  return `${f.leaveType} · ${f.days ?? 0} day(s)`;
}

export function HistoryPage() {
  const [rows, setRows] = useState<Filing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { getApprovalHistory().then((r) => { setRows(r); setLoading(false); }); }, []);

  return (
    <div style={{ maxWidth: 940 }}>
      <PageIntro title="Approval History" subtitle="Filings you've already decided." />
      <Card style={{ overflow: 'hidden' }}>
        {loading ? (
          <EmptyState message="Loading history…" />
        ) : rows.length === 0 ? (
          <EmptyState message="No decided filings yet." />
        ) : (
          <Table head={['Employee', 'Type', 'Date', 'Details', 'Decision']}>
            {rows.map((f) => (
              <tr key={f.id}>
                <Td style={{ fontWeight: 600, color: 'var(--ao-text)' }}>{f.employeeName}</Td>
                <Td>{f.kind}</Td>
                <Td>{fmtTableDate(f.filingDate)}</Td>
                <Td style={{ color: 'var(--ao-muted)' }}>{summary(f)}</Td>
                <Td><Chip status={f.status} /></Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
    </div>
  );
}
