import { useEffect, useMemo, useState } from 'react';
import type { Filing } from '@/types/domain';
import { decideFiling, getPendingApprovals } from '@/lib/api';
import { Avatar, Card } from '@/components/ui';
import { PageIntro, EmptyState } from '@/components/page';
import { ConfirmModal } from '@/components/ConfirmModal';
import { useToast } from '@/components/Toast';
import { fmtTableDate, fmtTime12 } from '@/lib/format';

/* =====================================================================
   Approvals — inbox of pending filings routed to the approver, each with
   Approve / Decline. Mirrors the prototype Approvals screen.
   ===================================================================== */

const KIND_ACCENT: Record<Filing['kind'], string> = {
  Leave: 'var(--ao-accent-leave)', Overtime: 'var(--ao-accent-ot)', TimeLog: 'var(--ao-accent-timelog)',
};

function summary(f: Filing): string {
  if (f.kind === 'TimeLog') return `${f.timelogSubtype} correction · ${fmtTime12(f.startTime)}`;
  if (f.kind === 'Overtime') return `Overtime ${fmtTime12(f.startTime)}→${fmtTime12(f.endTime)} · ${f.hours?.toFixed(1)} h`;
  return `${f.leaveType} leave · ${f.days ?? 0} day(s)`;
}

export function ApprovalsPage() {
  const { notify } = useToast();
  const [rows, setRows] = useState<Filing[]>([]);
  const [loading, setLoading] = useState(true);
  const [decision, setDecision] = useState<{ f: Filing; type: 'Approved' | 'Declined' } | null>(null);
  const [sortKey, setSortKey] = useState<'date' | 'name'>('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  async function load() {
    setLoading(true);
    setRows(await getPendingApprovals());
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  const sorted = useMemo(() => {
    const copy = [...rows];
    copy.sort((a, b) => {
      const cmp = sortKey === 'date'
        ? +new Date(a.filingDate) - +new Date(b.filingDate)
        : a.employeeName.localeCompare(b.employeeName);
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return copy;
  }, [rows, sortKey, sortDir]);

  function toggleSort(key: 'date' | 'name') {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  }

  async function confirm() {
    if (!decision) return;
    await decideFiling(decision.f.id, decision.type);
    notify(decision.type === 'Approved' ? 'Filing approved' : 'Filing declined');
    setDecision(null);
    load();
  }

  const arrow = (key: 'date' | 'name') => (sortKey === key ? (sortDir === 'asc' ? ' ↑' : ' ↓') : '');

  return (
    <div style={{ maxWidth: 820 }}>
      <PageIntro
        title="Approvals"
        subtitle="Filings awaiting your decision."
        right={
          rows.length > 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ font: '600 11px var(--ao-font)', color: 'var(--ao-muted-2)', textTransform: 'uppercase', letterSpacing: '.5px' }}>Sort by</span>
              <button
                className="ao-btn ao-btn--ghost"
                style={{ height: 36, padding: '0 14px', font: `${sortKey === 'date' ? 700 : 500} 13px var(--ao-font)`, color: sortKey === 'date' ? 'var(--ao-primary)' : 'var(--ao-text-3)' }}
                onClick={() => toggleSort('date')}
              >
                Date{arrow('date')}
              </button>
              <button
                className="ao-btn ao-btn--ghost"
                style={{ height: 36, padding: '0 14px', font: `${sortKey === 'name' ? 700 : 500} 13px var(--ao-font)`, color: sortKey === 'name' ? 'var(--ao-primary)' : 'var(--ao-text-3)' }}
                onClick={() => toggleSort('name')}
              >
                Name{arrow('name')}
              </button>
            </div>
          ) : undefined
        }
      />

      {loading ? (
        <EmptyState message="Loading approvals…" />
      ) : rows.length === 0 ? (
        <Card><EmptyState message="You're all caught up — no pending filings." /></Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {sorted.map((f) => (
            <Card key={f.id} style={{ padding: '16px 18px', borderLeft: `3px solid ${KIND_ACCENT[f.kind]}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
                <Avatar name={f.employeeName} size={38} filled={false} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ font: '700 14px var(--ao-font)' }}>{f.employeeName}</div>
                  <div style={{ font: '500 12.5px var(--ao-font)', color: 'var(--ao-text-3)' }}>{summary(f)}</div>
                  <div style={{ font: '400 12px var(--ao-font)', color: 'var(--ao-muted)', marginTop: 3 }}>
                    {fmtTableDate(f.filingDate)} · {f.reason}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="ao-btn ao-btn--success" style={{ height: 38, padding: '0 16px', color: '#fff' }} onClick={() => setDecision({ f, type: 'Approved' })}>Approve</button>
                  <button className="ao-btn ao-btn--danger" style={{ height: 38, padding: '0 16px', color: '#fff' }} onClick={() => setDecision({ f, type: 'Declined' })}>Decline</button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <ConfirmModal
        open={!!decision}
        title={decision?.type === 'Approved' ? 'Approve this filing?' : 'Decline this filing?'}
        confirmLabel={decision?.type === 'Approved' ? 'Approve' : 'Decline'}
        confirmVariant={decision?.type === 'Approved' ? 'success' : 'danger'}
        body={decision ? `${decision.f.employeeName} — ${summary(decision.f)}.` : ''}
        onConfirm={confirm}
        onCancel={() => setDecision(null)}
      />
    </div>
  );
}
