import type { ReactNode } from 'react';
import { chipClass, initials } from '@/lib/format';

/* =====================================================================
   Small presentational primitives shared across screens.
   ===================================================================== */

/** Status chip — Approved / Pending / Declined / Active / etc. */
export function Chip({ status }: { status: string }) {
  return <span className={chipClass(status)}>{status}</span>;
}

/** White rounded card container. */
export function Card({
  children, style, className,
}: { children: ReactNode; style?: React.CSSProperties; className?: string }) {
  return (
    <div className={`ao-card${className ? ` ${className}` : ''}`} style={style}>
      {children}
    </div>
  );
}

/** Circular initials avatar. Sizes match the prototype (34 / 38 / 62). */
export function Avatar({
  name, size = 38, filled = true,
}: { name: string; size?: number; filled?: boolean }) {
  const font = size >= 62 ? 20 : size >= 38 ? 13 : 12;
  return (
    <div
      style={{
        width: size, height: size, borderRadius: '50%',
        background: filled ? 'var(--ao-primary)' : 'var(--ao-info-bg)',
        color: filled ? '#fff' : 'var(--ao-primary)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        font: `700 ${font}px var(--ao-font)`, flexShrink: 0,
      }}
    >
      {initials(name)}
    </div>
  );
}

/** Dashboard stat card with an (i) tooltip. */
export function StatCard({
  label, value, tooltip, valueColor,
}: { label: string; value: string; tooltip: string; valueColor?: string }) {
  return (
    <div
      style={{
        flex: 1, background: 'var(--ao-surface)', border: '1px solid var(--ao-border)',
        borderRadius: 'var(--ao-r-lg)', padding: '16px 18px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ font: '500 12px var(--ao-font)', color: 'var(--ao-muted)' }}>{label}</div>
        <InfoDot text={tooltip} />
      </div>
      <div style={{ font: '700 24px var(--ao-font)', color: valueColor ?? 'var(--ao-text)', marginTop: 2 }}>
        {value}
      </div>
    </div>
  );
}

/** The italic (i) info dot with a hover tooltip (CSS in this file). */
export function InfoDot({ text }: { text: string }) {
  return (
    <span className="ao-info-dot">
      i
      <span className="ao-info-tip">{text}</span>
      <style>{`
        .ao-info-dot {
          position: relative; cursor: help;
          width: 17px; height: 17px; border-radius: 50%;
          border: 1.3px solid #c2cad6; color: var(--ao-muted-2);
          display: inline-flex; align-items: center; justify-content: center;
          font: 700 10px Georgia, serif; font-style: italic;
        }
        .ao-info-tip {
          position: absolute; top: 26px; right: 0; width: 210px;
          background: #16202e; color: #fff;
          font: 400 11.5px/1.5 var(--ao-font);
          padding: 9px 11px; border-radius: 9px;
          box-shadow: var(--ao-shadow-pop);
          opacity: 0; visibility: hidden; transform: translateY(-3px);
          transition: opacity .15s, transform .15s, visibility .15s;
          z-index: 30; text-align: left; font-style: normal;
        }
        .ao-info-tip::after {
          content: ''; position: absolute; top: -5px; right: 7px;
          width: 10px; height: 10px; background: #16202e; transform: rotate(45deg);
        }
        .ao-info-dot:hover .ao-info-tip { opacity: 1; visibility: visible; transform: translateY(0); }
      `}</style>
    </span>
  );
}
