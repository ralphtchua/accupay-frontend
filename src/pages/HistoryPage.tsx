import { useEffect, useMemo, useState } from 'react';
import type { Filing, FilingKind } from '@/types/domain';
import { getApprovalHistory } from '@/services/FilingsService';
import { getUsers, type ApiUser } from '@/services/RolesService';
import { Card, Chip } from '@/components/ui';
import { PageIntro, Table, Td, EmptyState, SearchBox } from '@/components/page';
import { Segmented } from '@/components/form';
import { fmtTime12, fmtDateTimeShort } from '@/lib/format';

/**
 * Who decided the filing. In-app decisions stamp LastUpdBy (a user id) which
 * we resolve to a name; email-link decisions have no user, so the backend's
 * ApproverEmail identifies the approver instead.
 */
function fullName(u: ApiUser, fallbackId?: number | null): string {
  return [u.firstName, u.lastName].filter(Boolean).join(' ') || u.email || `#${fallbackId ?? ''}`;
}
function approverBy(users: Map<number, ApiUser>, f: Filing): string {
  if (f.updatedById != null) {
    const u = users.get(f.updatedById);
    if (u) return fullName(u, f.updatedById);
  }
  if (f.approverEmail) {
    // In-app approvals record the approver's email; show their name if it maps
    // to a user account, otherwise the email itself.
    const email = f.approverEmail.toLowerCase();
    for (const u of users.values()) {
      if ((u.email ?? '').toLowerCase() === email) return fullName(u);
    }
    return f.approverEmail;
  }
  return '—';
}

/* =====================================================================
   Approval History — filings the approver has already decided, with
   search-by-name, Type + Decision filters, and sortable columns.
   ===================================================================== */

const KIND_LABEL: Record<FilingKind, string> = {
  Leave: 'Leave', Overtime: 'Overtime', TimeLog: 'Time Log',
};

function summary(f: Filing): string {
  if (f.kind === 'TimeLog') return `${f.timelogSubtype} · ${fmtTime12(f.startTime)}`;
  if (f.kind === 'Overtime') return `${fmtTime12(f.startTime)}→${fmtTime12(f.endTime)} · ${f.hours?.toFixed(1)} h`;
  return `${f.leaveType} · ${f.days ?? 0} day(s)`;
}

type SortKey = 'date' | 'resolved' | 'name' | 'type';

/** When the filing was last acted on (decided) — falls back to filed/filing date. */
const resolvedKey = (f: Filing) => f.updatedAt ?? f.createdAt ?? f.filingDate;
type TypeFilter = 'All' | FilingKind;
type DecisionFilter = 'All' | 'Approved' | 'Declined';

export function HistoryPage() {
  const [rows, setRows] = useState<Filing[]>([]);
  const [users, setUsers] = useState<Map<number, ApiUser>>(new Map());
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('All');
  const [decision, setDecision] = useState<DecisionFilter>('All');
  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    getApprovalHistory()
      .then((r) => setRows(r))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
    // Resolve approver names; best-effort (needs UserRead) — falls back to '—'.
    getUsers()
      .then((us) => setUsers(new Map(us.map((u) => [u.id, u]))))
      .catch(() => setUsers(new Map()));
  }, []);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = rows.filter(
      (f) =>
        (!q || f.employeeName.toLowerCase().includes(q)) &&
        (typeFilter === 'All' || f.kind === typeFilter) &&
        (decision === 'All' || f.status === decision),
    );
    filtered.sort((a, b) => {
      let cmp: number;
      if (sortKey === 'date') cmp = +new Date(a.createdAt ?? a.filingDate) - +new Date(b.createdAt ?? b.filingDate);
      else if (sortKey === 'resolved') cmp = +new Date(resolvedKey(a)) - +new Date(resolvedKey(b));
      else if (sortKey === 'name') cmp = a.employeeName.localeCompare(b.employeeName);
      else cmp = a.kind.localeCompare(b.kind);
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return filtered;
  }, [rows, query, typeFilter, decision, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir(key === 'date' ? 'desc' : 'asc'); }
  }
  const arrow = (key: SortKey) => (sortKey === key ? (sortDir === 'asc' ? ' ↑' : ' ↓') : '');

  const sortBtn = (key: SortKey, label: string) => (
    <button
      className="ao-btn ao-btn--ghost"
      style={{
        height: 36, padding: '0 14px',
        font: `${sortKey === key ? 700 : 500} 13px var(--ao-font)`,
        color: sortKey === key ? 'var(--ao-primary)' : 'var(--ao-text-3)',
      }}
      onClick={() => toggleSort(key)}
    >
      {label}{arrow(key)}
    </button>
  );

  return (
    <div style={{ maxWidth: 940 }}>
      <PageIntro
        title="Approval History"
        subtitle="Filings you've already decided."
        right={
          rows.length > 0 ? (
            <SearchBox value={query} onChange={setQuery} placeholder="Search by name" width={190} />
          ) : undefined
        }
      />

      {rows.length > 0 && (
        <Card style={{ padding: '12px 16px', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
            <Segmented
              value={typeFilter}
              onChange={setTypeFilter}
              options={[
                { value: 'All', label: 'All types' },
                { value: 'Leave', label: 'Leave' },
                { value: 'Overtime', label: 'Overtime' },
              ]}
            />
            <Segmented
              value={decision}
              onChange={setDecision}
              options={[
                { value: 'All', label: 'All' },
                { value: 'Approved', label: 'Approved' },
                { value: 'Declined', label: 'Declined' },
              ]}
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 'auto' }}>
              <span style={{ font: '600 11px var(--ao-font)', color: 'var(--ao-muted-2)', textTransform: 'uppercase', letterSpacing: '.5px' }}>Sort by</span>
              {sortBtn('date', 'Requested')}
              {sortBtn('resolved', 'Decided')}
              {sortBtn('name', 'Name')}
              {sortBtn('type', 'Type')}
            </div>
          </div>
        </Card>
      )}

      <Card style={{ overflow: 'hidden' }}>
        {loading ? (
          <EmptyState message="Loading history…" />
        ) : rows.length === 0 ? (
          <EmptyState message="No decided filings yet." />
        ) : shown.length === 0 ? (
          <EmptyState message="No decided filings match your filters." />
        ) : (
          <Table head={['Employee', 'Type', 'Details', 'Requested', 'Approved / Rejected', 'By', 'Decision']}>
            {shown.map((f) => (
              <tr key={f.id}>
                <Td style={{ fontWeight: 600, color: 'var(--ao-text)' }}>{f.employeeName}</Td>
                <Td>{KIND_LABEL[f.kind]}</Td>
                <Td style={{ color: 'var(--ao-muted)' }}>{summary(f)}</Td>
                <Td style={{ whiteSpace: 'nowrap' }}>{fmtDateTimeShort(f.createdAt)}</Td>
                <Td style={{ whiteSpace: 'nowrap' }}>{fmtDateTimeShort(f.updatedAt)}</Td>
                <Td style={{ color: 'var(--ao-text-2)' }}>{approverBy(users, f)}</Td>
                <Td><Chip status={f.status} /></Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
    </div>
  );
}
