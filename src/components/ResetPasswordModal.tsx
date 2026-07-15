import { useEffect, useState } from 'react';
import { ConfirmModal } from '@/components/ConfirmModal';
import { Field, TextInput } from '@/components/form';

/* =====================================================================
   ResetPasswordModal — admin action to set a new password for another
   user (no old password required). Used by the Roles user-assignments
   tab and the Employees detail view. Validates length + confirmation;
   the parent performs the actual API call in onSubmit.
   ===================================================================== */

interface ResetPasswordModalProps {
  open: boolean;
  /** Whose password is being reset — shown in the modal copy. */
  subjectName: string;
  saving?: boolean;
  onCancel: () => void;
  onSubmit: (newPassword: string) => void;
}

export function ResetPasswordModal({
  open, subjectName, saving = false, onCancel, onSubmit,
}: ResetPasswordModalProps) {
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');

  // Start each open with blank fields (the component stays mounted between uses).
  useEffect(() => {
    if (open) { setNext(''); setConfirm(''); }
  }, [open]);

  const tooShort = next.length > 0 && next.length < 8;
  const mismatch = confirm.length > 0 && next !== confirm;
  const canSubmit = next.length >= 8 && next === confirm && !saving;

  function submit() { if (canSubmit) onSubmit(next); }

  return (
    <ConfirmModal
      open={open}
      title="Reset password"
      width={420}
      confirmLabel={saving ? 'Resetting…' : 'Reset password'}
      confirmDisabled={!canSubmit}
      onCancel={onCancel}
      onConfirm={submit}
      body={
        <div style={{ marginTop: 4 }}>
          <div style={{ font: '400 13px var(--ao-font)', color: 'var(--ao-muted)', marginBottom: 12 }}>
            Set a new password for <strong>{subjectName}</strong>. They can change it themselves afterward.
          </div>
          <Field label="New password" hint="At least 8 characters.">
            <TextInput type="password" value={next} onChange={(e) => setNext(e.target.value)} />
          </Field>
          <Field label="Confirm new password">
            <TextInput type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          </Field>
          {tooShort && <div style={{ font: '500 12px var(--ao-font)', color: 'var(--ao-danger)' }}>Password must be at least 8 characters.</div>}
          {mismatch && <div style={{ font: '500 12px var(--ao-font)', color: 'var(--ao-danger)' }}>Passwords don't match.</div>}
        </div>
      }
    />
  );
}
