import { useEffect, useState } from 'react';
import type { Filing } from '@/types/domain';
import { getMyLeaves, getMyLeaveBalances, type LeaveBalance } from '@/services/FilingsService';
import { Card, Chip } from '@/components/ui';
import { Table, Td, EmptyState } from '@/components/page';
import { fmtTableDate, fmtTime12 } from '@/lib/format';

/* =====================================================================
   My Leave Balances — matches the prototype: a row of simple balance
   cards on top, then a "Leave requests" table logging every leave
   filing (type, dates, days, hours, status).
   ===================================================================== */

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

  return (
    <div style={{ maxWidth: 880 }}>
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

      <Card style={{ padding: '20px 22px' }}>
        <div style={{ font: '700 15px var(--ao-font)', marginBottom: 12 }}>Leave requests</div>
        {loading ? (
          <EmptyState message="Loading leave requests…" />
        ) : leaves.length === 0 ? (
          <EmptyState message="No leave requests yet." />
        ) : (
          <Table head={['Type', 'Dates', 'Days', 'Hours', 'Status']}>
            {leaves.map((l) => (
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
