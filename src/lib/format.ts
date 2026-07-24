/* =====================================================================
   Formatting helpers — ported from the prototype's logic so dates,
   times and status chips render identically.
   ===================================================================== */

import type { FilingStatus, EmployeeStatus, TimeEntryStatus } from '@/types/domain';

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MON_FULL = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const MON_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** 'Tue June 24, 2026' — table date format. */
export function fmtTableDate(iso: string): string {
  const d = new Date(`${iso}T00:00`);
  return `${DOW[d.getDay()]} ${MON_FULL[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

/** '14 Mar 2024' — long compact format (profile/directory). */
export function fmtLong(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(`${iso}T00:00`);
  return `${d.getDate()} ${MON_SHORT[d.getMonth()]} ${d.getFullYear()}`;
}

/** 'Jun 24, 2:15 PM' — compact date + time from an ISO datetime (or '—'). */
export function fmtDateTimeShort(iso?: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  let h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, '0');
  const ap = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${MON_SHORT[d.getMonth()]} ${d.getDate()}, ${h}:${m} ${ap}`;
}

/** '8:00am' — 12-hour time from 'HH:mm'. */
export function fmtTime12(t?: string | null): string {
  if (!t) return '';
  const [hStr, m = '00'] = t.split(':');
  let h = parseInt(hStr, 10);
  const ap = h >= 12 ? 'pm' : 'am';
  h = h % 12 || 12;
  return `${h}:${m}${ap}`;
}

/** Live wall-clock string '08:02:15 AM' used by the dashboard. */
export function liveClock(d = new Date()): string {
  let h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, '0');
  const s = String(d.getSeconds()).padStart(2, '0');
  const ap = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${String(h).padStart(2, '0')}:${m}:${s} ${ap}`;
}

/** '8:02 AM' — short 12-hour clock time (no seconds), for check-in stamps. */
export function fmtClockTime(d = new Date()): string {
  let h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, '0');
  const ap = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${m} ${ap}`;
}

/** Long date for the dashboard header, e.g. 'Tuesday, June 24, 2026'. */
export function fmtHeaderDate(d = new Date()): string {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return `${days[d.getDay()]}, ${MON_FULL[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

/** Maps any status to the chip modifier class defined in global.css. */
export function chipClass(status: FilingStatus | EmployeeStatus | TimeEntryStatus | string): string {
  switch (status) {
    case 'Approved': return 'ao-chip ao-chip--approved';
    case 'Pending':  return 'ao-chip ao-chip--pending';
    case 'Declined': return 'ao-chip ao-chip--declined';
    case 'Added':    return 'ao-chip ao-chip--added';
    case 'Active':   return 'ao-chip ao-chip--active';
    default:         return 'ao-chip ao-chip--default';
  }
}

export function initials(name: string): string {
  return name.split(' ').map((w) => w[0]).slice(0, 2).join('');
}
