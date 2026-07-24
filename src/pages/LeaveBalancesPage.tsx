import { useEffect, useMemo, useState } from 'react';
import type { Filing } from '@/types/domain';
import { getMyLeaves, getMyLeaveBalances, type LeaveBalance } from '@/services/FilingsService';
import { Card, Chip } from '@/components/ui';
import { PageIntro, Table, Td, EmptyState, ItemPager, DateRangeFilter } from '@/components/page';
import { fmtTableDate, fmtTime12 } from '@/lib/format';

/* =====================================================================
   My Leave Balances — a row of balance cards on top, then a "Leave
   requests" table. The table shows 30 requests per page (newest first)
   with older/newer arrows, plus an optional date-range filter.
   ===================================================================== */

const PAGE_SIZE = 30;

function BalanceCard({ b }: { b: LeaveBalance }) {
  return (
    <div style={{ flex: 1, background: 'var(--ao-surface)', border: '1px solid var(--ao-border)', borderRadius: 'var(--ao-r-lg)', padding: '16px 18px' }}>
      <div style={{ font: '500 12px var(--ao-font)', color: 'var(--ao-muted)' }}>{b.leaveType}</div>
      <div style={{ font: '700 22px var(--ao-font)', color: 'var(--ao-text)' }}>{b.balance.toFixed(1)}</div>
      <div style={{ font: '400 11px var(--ao-font)', color: 'var(--ao-muted-2)' }}>days remaining</div>
    </div>
  );
}

/** Build the "dates" cell the same way the prototype does. */
function leaveDates(l: Filing): string {
  const base = fmtTableDate(l.filingDate);
  if (l.days && l.days > 1) return `${base} +${l.days - 1}`;
  if (l.days == null && l.startTime && l.endTime) return `${base} · ${fmtTime12(l.startTime)}→${fmtTime12(l.endTime)}`;
  return base;
}

export function LeaveBalancesPage() {
  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [leaves, setLeaves] = useState<Filing[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [fromInput, setFromInput] = useState('');
  const [toInput, setToInput] = useState('');
  const [applied, setApplied] = useState<{ from: string; to: string } | null>(null);

  useEffect(() => {
    (async () => {
      const [b, l] = await Promise.all([
        // Balances need the Leave:read permission; fall back to empty on 403.
        getMyLeaveBalances().catch(() => [] as LeaveBalance[]),
        getMyLeaves().catch(() => [] as Filing[]),
      ]);
      setBalances(b);
      setLeaves(l);
      setLoading(false);
    })();
  }, []);

  // Date range filters client-side (leaves are already loaded, newest first).
  const filtered = useMemo(() => {
    if (!applied) return leaves;
    return leaves.filter((l) => {
      const d = (l.filingDate || '').slice(0, 10);
      return (!applied.from || d >= applied.from) && (!applied.to || d <= applied.to);
    });
  }, [leaves, applied]);

  const pageRows = useMemo(
    () => filtered.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE),
    [filtered, page],
  );

  function apply() { setApplied({ from: fromInput, to: toInput }); setPage(0); }
  function clear() { setFromInput(''); setToInput(''); setApplied(null); setPage(0); }

  return (
    <div style={{ maxWidth: 940 }}>
      <PageIntro title="My Leave Balances" subtitle="Your remaining leave credits and every leave request you've filed." />

      {balances.length > 0 ? (
        <div style={{ display: 'flex', gap: 16, marginBottom: 18 }}>
          {balances.map((b) => <BalanceCard key={b.leaveType} b={b} />)}
        </div>
      ) : (
        !loading && (
          <div style={{ font: '400 12px var(--ao-font)', color: 'var(--ao-muted)', marginBottom: 18 }}>
            No leave balances to show — this needs the Leave:read permission and seeded leave credits.
          </div>
        )
      )}

      <Card style={{ padding: '16px 22px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 14, gap: 14, flexWrap: 'wrap' }}>
          <DateRangeFilter
            from={fromInput}
            to={toInput}
            onFrom={setFromInput}
            onTo={setToInput}
            onApply={apply}
            onClear={clear}
            active={applied != null}
          />
          <ItemPager
            page={page}
            pageSize={PAGE_SIZE}
            total={filtered.length}
            onOlder={() => setPage((p) => p + 1)}
            onNewer={() => setPage((p) => Math.max(0, p - 1))}
          />
        </div>
        {loading ? (
          <EmptyState message="Loading leave requests…" />
        ) : filtered.length === 0 ? (
          <EmptyState message={applied ? 'No leave requests in this date range.' : 'No leave requests yet.'} />
        ) : (
          <Table head={['Type', 'Dates', 'Days', 'Hours', 'Status']}>
            {pageRows.map((l) => (
              <tr key={l.id}>
                <Td style={{ fontWeight: 600, color: 'var(--ao-text)' }}>{l.leaveType ?? 'Leave'}</Td>
                <Td>{leaveDates(l)}</Td>
                <Td>{l.days ?? '—'}</Td>
                <Td>{l.hours != null ? `${l.hours.toFixed(1)}` : '—'}</Td>
                <Td><Chip status={l.status} /></Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
    </div>
  );
}
