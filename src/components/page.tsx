import type { ReactNode } from 'react';

/* =====================================================================
   Page layout helpers — intro heading and a lightweight table.
   ===================================================================== */

export function PageIntro({ title, subtitle, right }: { title: string; subtitle?: string; right?: ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 18 }}>
      <div>
        <div style={{ font: '700 22px var(--ao-font)', marginBottom: 2 }}>{title}</div>
        {subtitle && <div style={{ font: '400 14px var(--ao-font)', color: 'var(--ao-muted)' }}>{subtitle}</div>}
      </div>
      {right}
    </div>
  );
}

export function Table({ head, children }: { head: string[]; children: ReactNode }) {
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', font: '400 13px var(--ao-font)' }}>
      <thead>
        <tr>
          {head.map((h) => (
            <th
              key={h}
              style={{
                textAlign: 'left', padding: '11px 14px', font: '600 11px var(--ao-font)',
                color: 'var(--ao-muted)', textTransform: 'uppercase', letterSpacing: '.4px',
                borderBottom: '1px solid var(--ao-border)', whiteSpace: 'nowrap',
              }}
            >
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>{children}</tbody>
    </table>
  );
}

export function Td({ children, style }: { children: ReactNode; style?: React.CSSProperties }) {
  return (
    <td style={{ padding: '13px 14px', borderBottom: '1px solid var(--ao-border-soft)', color: 'var(--ao-text-2)', ...style }}>
      {children}
    </td>
  );
}

export function EmptyState({ message }: { message: string }) {
  return (
    <div style={{ padding: '38px', textAlign: 'center', font: '500 14px var(--ao-font)', color: 'var(--ao-muted)' }}>
      {message}
    </div>
  );
}

/** Compact search input with a leading magnifier icon. */
export function SearchBox({
  value, onChange, placeholder = 'Search', width = 200,
}: { value: string; onChange: (v: string) => void; placeholder?: string; width?: number }) {
  return (
    <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
      <svg
        width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--ao-muted)"
        strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        style={{ position: 'absolute', left: 11, pointerEvents: 'none' }}
      >
        <circle cx="11" cy="11" r="7" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
      <input
        className="ao-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{ height: 38, width, paddingLeft: 34 }}
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label="Clear search"
          style={{
            position: 'absolute', right: 8, width: 20, height: 20, border: 'none', padding: 0,
            background: 'transparent', color: 'var(--ao-muted)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2.4" strokeLinecap="round">
            <line x1="6" y1="6" x2="18" y2="18" />
            <line x1="18" y1="6" x2="6" y2="18" />
          </svg>
        </button>
      )}
    </div>
  );
}

/** A single chevron arrow button for the window pager. */
function ArrowButton({
  dir, onClick, disabled, title,
}: { dir: 'left' | 'right'; onClick: () => void; disabled?: boolean; title: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={title}
      style={{
        width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center',
        borderRadius: 8, border: '1px solid var(--ao-border)', background: 'var(--ao-surface)',
        color: disabled ? 'var(--ao-muted-2)' : 'var(--ao-text-2)',
        cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.5 : 1, padding: 0,
      }}
    >
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <polyline points={dir === 'left' ? '15 18 9 12 15 6' : '9 18 15 12 9 6'} />
      </svg>
    </button>
  );
}

/**
 * Count-based pager: shows a fixed number of items per page (newest first)
 * with older/newer arrows and a "1-30 of N" label. `onOlder` steps to the
 * next older page; `onNewer` is disabled on the first (most recent) page.
 */
export function ItemPager({
  page, pageSize, total, onOlder, onNewer,
}: { page: number; pageSize: number; total: number; onOlder: () => void; onNewer: () => void }) {
  const start = total === 0 ? 0 : page * pageSize + 1;
  const end = Math.min(total, (page + 1) * pageSize);
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      <ArrowButton dir="left" onClick={onOlder} disabled={end >= total} title="Older" />
      <div style={{ font: '600 13px var(--ao-font)', color: 'var(--ao-text-2)', minWidth: 110, textAlign: 'center' }}>
        {total === 0 ? '0 of 0' : `${start}-${end} of ${total}`}
      </div>
      <ArrowButton dir="right" onClick={onNewer} disabled={page === 0} title="Newer" />
    </div>
  );
}

/**
 * From/To date-range filter with Apply, and a Clear shown while a range is
 * active. Purely presentational — the parent owns the input + applied state.
 */
export function DateRangeFilter({
  from, to, onFrom, onTo, onApply, onClear, active,
}: {
  from: string; to: string;
  onFrom: (v: string) => void; onTo: (v: string) => void;
  onApply: () => void; onClear: () => void; active: boolean;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, flexWrap: 'wrap' }}>
      <div>
        <label className="ao-label">From</label>
        <input className="ao-input" style={{ width: 160 }} type="date" value={from} onChange={(e) => onFrom(e.target.value)} />
      </div>
      <div>
        <label className="ao-label">To</label>
        <input className="ao-input" style={{ width: 160 }} type="date" value={to} onChange={(e) => onTo(e.target.value)} />
      </div>
      <button className="ao-btn ao-btn--primary" style={{ height: 42, padding: '0 16px' }} onClick={onApply}>Apply</button>
      {active && (
        <button className="ao-btn ao-btn--ghost" style={{ height: 42, padding: '0 14px' }} onClick={onClear}>Clear</button>
      )}
    </div>
  );
}
