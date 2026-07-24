import { useEffect, useRef, useState } from 'react';
import type { ApproverRecord } from '@/services/ApproverDirectoryService';

/* =====================================================================
   ApproverPicker — controlled multi-select over the org's master approver
   list, with a searchable dropdown. Selected approvers show as removable
   chips; typing filters the remaining approvers by name / email / company.
   Only approvers that exist in the master list can be picked, which
   enforces the "must exist" rule.
   ===================================================================== */

function label(a: ApproverRecord): string {
  const name = [a.firstName, a.lastName].filter(Boolean).join(' ');
  return name ? `${name} · ${a.emailAddress}` : a.emailAddress || `#${a.id}`;
}

export function ApproverPicker({
  all, selectedIds, onChange, disabled,
}: {
  all: ApproverRecord[];
  selectedIds: number[];
  onChange: (ids: number[]) => void;
  disabled?: boolean;
}) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [hover, setHover] = useState<number | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  // Close the dropdown when clicking outside the picker.
  useEffect(() => {
    function onDocMouseDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDocMouseDown);
    return () => document.removeEventListener('mousedown', onDocMouseDown);
  }, []);

  const byId = new Map(all.map((a) => [a.id, a]));
  const selected = selectedIds.map((id) => byId.get(id)).filter((a): a is ApproverRecord => a != null);

  const q = query.trim().toLowerCase();
  const available = all
    .filter((a) => !selectedIds.includes(a.id))
    .filter(
      (a) =>
        !q ||
        [a.firstName, a.lastName, a.emailAddress, a.companyName].some((v) => (v ?? '').toLowerCase().includes(q)),
    );

  function add(id: number) {
    onChange([...selectedIds, id]);
    setQuery('');
    setHover(null);
  }

  return (
    <div ref={ref}>
      {selected.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 10 }}>
          {selected.map((a) => (
            <div key={a.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 38, border: '1px solid var(--ao-border)', borderRadius: 8, background: 'var(--ao-surface-muted)', padding: '0 12px' }}>
              <span style={{ font: '500 13px var(--ao-font)', color: 'var(--ao-text-2)' }}>{label(a)}</span>
              <button
                onClick={() => onChange(selectedIds.filter((id) => id !== a.id))}
                disabled={disabled}
                title="Remove approver"
                style={{ border: 'none', background: 'transparent', color: 'var(--ao-danger)', font: '700 16px var(--ao-font)', cursor: disabled ? 'default' : 'pointer', lineHeight: 1, padding: '0 4px' }}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {all.length === 0 ? (
        <div style={{ font: '400 12.5px var(--ao-font)', color: 'var(--ao-muted)' }}>
          No approvers exist yet. Add them on the Approvers page first.
        </div>
      ) : (
        <div style={{ position: 'relative' }}>
          <input
            className="ao-input"
            value={query}
            disabled={disabled}
            placeholder="Search approvers to add…"
            onFocus={() => setOpen(true)}
            onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && available.length > 0) { e.preventDefault(); add(available[0].id); }
              else if (e.key === 'Escape') setOpen(false);
            }}
          />
          {open && (
            <div
              style={{
                position: 'absolute', top: 46, left: 0, right: 0, zIndex: 20,
                background: 'var(--ao-surface)', border: '1px solid var(--ao-border-strong)',
                borderRadius: 'var(--ao-r-md)', boxShadow: 'var(--ao-shadow-pop)',
                maxHeight: 220, overflowY: 'auto', padding: 4,
              }}
            >
              {available.length === 0 ? (
                <div style={{ padding: '10px 10px', font: '400 12.5px var(--ao-font)', color: 'var(--ao-muted-2)' }}>
                  {selectedIds.length === all.length ? 'All approvers assigned.' : 'No approvers match your search.'}
                </div>
              ) : (
                available.map((a) => (
                  <div
                    key={a.id}
                    onClick={() => add(a.id)}
                    onMouseEnter={() => setHover(a.id)}
                    onMouseLeave={() => setHover(null)}
                    style={{
                      padding: '9px 10px', borderRadius: 7, cursor: 'pointer',
                      font: '500 13px var(--ao-font)', color: 'var(--ao-text-2)',
                      background: hover === a.id ? 'var(--ao-surface-muted)' : 'transparent',
                    }}
                  >
                    {label(a)}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
