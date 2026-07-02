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
