import type { ReactNode } from 'react';

/* =====================================================================
   ConfirmModal — backdrop dialog with Cancel + confirm action.
   Matches the prototype's check-in/out confirmation modal.
   ===================================================================== */

interface ConfirmModalProps {
  open: boolean;
  title: string;
  body: ReactNode;
  confirmLabel: string;
  confirmVariant?: 'primary' | 'success' | 'danger';
  confirmDisabled?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  width?: number;
}

export function ConfirmModal({
  open, title, body, confirmLabel, confirmVariant = 'primary', confirmDisabled = false,
  onConfirm, onCancel, width = 384,
}: ConfirmModalProps) {
  if (!open) return null;

  const confirmBg =
    confirmVariant === 'danger' ? 'var(--ao-danger)'
    : confirmVariant === 'success' ? 'var(--ao-success)'
    : 'var(--ao-primary)';

  return (
    <div className="ao-modal-backdrop" onClick={onCancel}>
      <div className="ao-modal" style={{ width }} onClick={(e) => e.stopPropagation()}>
        <div style={{ font: '700 18px var(--ao-font)', color: 'var(--ao-text)', marginBottom: 7 }}>
          {title}
        </div>
        <div style={{ font: '400 14px/1.5 var(--ao-font)', color: 'var(--ao-text-3)', marginBottom: 22 }}>
          {body}
        </div>
        <div style={{ display: 'flex', gap: 11 }}>
          <button
            onClick={onCancel}
            className="ao-btn ao-btn--ghost"
            style={{ flex: 1, height: 44, font: '600 14px var(--ao-font)' }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={confirmDisabled}
            className="ao-btn"
            style={{ flex: 1, height: 44, color: '#fff', background: confirmBg, opacity: confirmDisabled ? 0.5 : 1, cursor: confirmDisabled ? 'not-allowed' : 'pointer' }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
