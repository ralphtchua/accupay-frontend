import type { ReactNode } from 'react';

/* =====================================================================
   Form primitives — label + control wrappers used by the filing forms,
   profile, and settings. Styling comes from .ao-input / .ao-label.
   ===================================================================== */

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label className="ao-label">{label}</label>
      {children}
      {hint && <div style={{ font: '400 11px var(--ao-font)', color: 'var(--ao-muted)', marginTop: 5 }}>{hint}</div>}
    </div>
  );
}

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className="ao-input" {...props} />;
}

export function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className="ao-input"
      style={{ height: 92, padding: '10px 12px', resize: 'vertical', lineHeight: 1.5 }}
      {...props}
    />
  );
}

export function Select({
  value, onChange, options, placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
}) {
  return (
    <select className="ao-input" value={value} onChange={(e) => onChange(e.target.value)}>
      {placeholder && <option value="">{placeholder}</option>}
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}

/** Pill segmented control (e.g. leave timing Day/Hour, OT preset). */
export function Segmented<T extends string>({
  value, onChange, options,
}: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[] }) {
  return (
    <div style={{ display: 'inline-flex', gap: 3, background: '#eef1f5', padding: 4, borderRadius: 9 }}>
      {options.map((o) => {
        const active = value === o.value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            style={{
              border: 'none', cursor: 'pointer', padding: '8px 18px', borderRadius: 7,
              font: '600 13px var(--ao-font)', transition: '.15s',
              background: active ? 'var(--ao-primary)' : 'transparent',
              color: active ? '#fff' : 'var(--ao-text-3)',
            }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/** On/off toggle switch (settings & permissions). */
export function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      style={{
        width: 42, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer',
        background: checked ? 'var(--ao-primary)' : '#cdd5df', position: 'relative',
        transition: 'background .15s', flexShrink: 0,
      }}
    >
      <span
        style={{
          position: 'absolute', top: 3, left: checked ? 21 : 3, width: 18, height: 18,
          borderRadius: '50%', background: '#fff', transition: 'left .15s',
          boxShadow: '0 1px 2px rgba(0,0,0,.2)',
        }}
      />
    </button>
  );
}

/** Blue envelope callout shown above filing submit buttons (prototype). */
export function EmailCallout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      display: 'flex', gap: 11, alignItems: 'flex-start', background: 'var(--ao-surface-soft)',
      border: '1px solid var(--ao-border-info)', borderRadius: 10, padding: '13px 14px', marginBottom: 20,
    }}>
      <div style={{
        width: 22, height: 22, borderRadius: '50%', background: 'var(--ao-primary)', color: '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'center', font: '700 12px var(--ao-font)', flexShrink: 0,
      }}>✉</div>
      <div style={{ font: '400 12px/1.5 var(--ao-font)', color: '#3a4a6b' }}>{children}</div>
    </div>
  );
}
