import { useEffect, useState } from 'react';
import type { LeaveBalance } from '@/types/domain';
import { getCurrentEmployee, getLeaveBalances } from '@/lib/api';
import { PageIntro, EmptyState } from '@/components/page';
import { InfoDot } from '@/components/ui';

/* =====================================================================
   My Leave Balances — one card per leave type with a usage bar and the
   "X of Y days · H h left" line. Mirrors the prototype.
   ===================================================================== */

function BalanceCard({ b }: { b: LeaveBalance }) {
  const remaining = Math.max(b.entitledDays - b.usedDays, 0);
  const pct = b.entitledDays > 0 ? Math.min((b.usedDays / b.entitledDays) * 100, 100) : 0;
  const low = remaining <= 1;

  return (
    <div style={{ flex: 1, minWidth: 220, background: 'var(--ao-surface)', border: '1px solid var(--ao-border)', borderRadius: 'var(--ao-r-lg)', padding: '18px 20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div style={{ font: '700 15px var(--ao-font)' }}>{b.leaveType}</div>
        <InfoDot text={`You've used ${b.usedDays} of ${b.entitledDays} entitled days. ${b.hoursLeft} hours remain available to file.`} />
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
        <span style={{ font: '800 28px var(--ao-font)', color: low ? 'var(--ao-pending)' : 'var(--ao-primary)' }}>{remaining.toFixed(1)}</span>
        <span style={{ font: '500 13px var(--ao-font)', color: 'var(--ao-muted)' }}>of {b.entitledDays} days left</span>
      </div>
      <div style={{ height: 7, borderRadius: 4, background: '#eef1f5', marginTop: 12, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: low ? 'var(--ao-pending)' : 'var(--ao-primary)', transition: 'width .3s' }} />
      </div>
      <div style={{ font: '500 12px var(--ao-font)', color: 'var(--ao-muted)', marginTop: 9 }}>
        {b.usedDays} days used · {b.hoursLeft.toFixed(1)} h available
      </div>
    </div>
  );
}

export function LeaveBalancesPage() {
  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const me = await getCurrentEmployee();
      setBalances(await getLeaveBalances(me.id));
      setLoading(false);
    })();
  }, []);

  return (
    <div style={{ maxWidth: 880 }}>
      <PageIntro title="My Leave Balances" subtitle="What you have left to file, per leave type." />
      {loading ? (
        <EmptyState message="Loading balances…" />
      ) : (
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          {balances.map((b) => <BalanceCard key={b.leaveType} b={b} />)}
        </div>
      )}
    </div>
  );
}
