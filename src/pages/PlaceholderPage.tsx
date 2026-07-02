import { useLocation } from 'react-router-dom';
import { PAGE_TITLES } from '@/layout/nav';

/* =====================================================================
   Placeholder — shown for screens scheduled in later phases. Keeps the
   shell navigable end-to-end while only the Dashboard is fully built.
   ===================================================================== */

export function PlaceholderPage() {
  const { pathname } = useLocation();
  const title = PAGE_TITLES[pathname] ?? 'Coming soon';

  return (
    <div
      className="ao-card"
      style={{
        maxWidth: 880, padding: '50px', textAlign: 'center',
        border: '1px dashed #c9d2dd', boxShadow: 'none',
      }}
    >
      <div style={{ font: '700 17px var(--ao-font)', marginBottom: 6 }}>{title}</div>
      <div style={{ font: '500 14px var(--ao-font)', color: 'var(--ao-muted)' }}>
        This screen is part of a later build phase. The layout, navigation, and design
        system are in place — content lands when its phase is implemented.
      </div>
    </div>
  );
}
