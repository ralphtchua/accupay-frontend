/* =====================================================================
   Mock API seam — only the Settings screen (org settings + email
   templates) still resolves from in-memory mock data, with a small
   simulated latency. Everything else now uses the real C# API via the
   services under src/services.
   ===================================================================== */

import type { Settings } from '@/types/domain';
import { MOCK_SETTINGS } from '@/data/mock';

/** Simulated latency so loading states are real during development. */
const delay = <T,>(value: T, ms = 220): Promise<T> =>
  new Promise((resolve) => setTimeout(() => resolve(value), ms));

/* ---- Settings ------------------------------------------------------- */
let settings: Settings = { ...MOCK_SETTINGS };
export function getSettings(): Promise<Settings> { return delay({ ...settings }); }
export function saveSettings(next: Settings): Promise<Settings> {
  settings = { ...next };
  return delay({ ...settings });
}
export function runAccupaySync(): Promise<{ recordCount: number; syncedAt: string }> {
  const syncedAt = new Date().toISOString();
  settings = { ...settings, accupayLastSyncAt: syncedAt, accupayLastRecordCount: 482 };
  return delay({ recordCount: 482, syncedAt }, 900);
}

/* ---- Email templates ------------------------------------------------ */
export interface EmailTemplate { key: string; label: string; subject: string; body: string; }
let emailTemplates: EmailTemplate[] = [
  { key: 'timelog', label: 'Time log approval', subject: 'Time log filing awaiting your approval',
    body: 'Hi {approver},\n\n{employee} filed a time log correction for {date} ({detail}).\nReason: {reason}\n\nReview it here: {link}' },
  { key: 'overtime', label: 'Overtime approval', subject: 'Overtime filing awaiting your approval',
    body: 'Hi {approver},\n\n{employee} filed {hours} h of overtime on {date}.\nReason: {reason}\n\nReview it here: {link}' },
  { key: 'leave', label: 'Leave approval', subject: 'Leave request awaiting your approval',
    body: 'Hi {approver},\n\n{employee} requested {leaveType} leave ({detail}).\nReason: {reason}\n\nReview it here: {link}' },
];
export function getEmailTemplates(): Promise<EmailTemplate[]> { return delay(emailTemplates.map((t) => ({ ...t }))); }
export function saveEmailTemplate(key: string, subject: string, body: string): Promise<EmailTemplate> {
  emailTemplates = emailTemplates.map((t) => (t.key === key ? { ...t, subject, body } : t));
  return delay(emailTemplates.find((t) => t.key === key)!);
}
