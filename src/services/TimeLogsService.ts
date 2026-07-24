import api from '@/config/AxiosConfig';
import { itemsOf, apiError } from '@/lib/apiUtils';
import { tokenService } from '@/services/TokenService';

/* =====================================================================
   TimeLogsService — employee self-service time logs.
     GET  /api/timelogs/employee              → the employee's own logs
     POST /api/self-service/timelogs          → CheckIn  (creates today's log)
     PUT  /api/self-service/timelogs/{id}     → CheckOut (stamps the end time)

   The GET lives on the main TimeLogs controller (not self-service) but is
   still self-scoped to the caller via the JWT and needs no extra permission.

   All state is backend-sourced. The GET lets the dashboard restore the
   checked-in state across refreshes and powers the Time Logs page.
   ===================================================================== */

export interface TimeLogResult {
  id: number;
  employeeId: number;
  date: string;
  startTime?: string | null;
  endTime?: string | null;
}

/** One of the employee's time logs (a check-in, optionally checked out). */
export interface TimeLogEntry {
  id: number;
  date: string; // ISO (LogDate)
  startTime?: string | null; // ISO datetime
  endTime?: string | null; // ISO datetime
  branchName?: string | null;
}

const pad = (n: number) => String(n).padStart(2, '0');
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
/** Local wall-clock 'YYYY-MM-DDTHH:mm:ss' (no zone — the API reads it as-is). */
const localDateTime = (d: Date) =>
  `${ymd(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;

function requireEmployeeId(): number {
  const id = tokenService.getEmployeeId();
  if (!id) {
    throw new Error('This login has no linked employee record, so time logs are unavailable.');
  }
  return id;
}

/** Check in now — creates today's time log stamped with the current time. */
export async function checkIn(): Promise<TimeLogResult> {
  const employeeId = requireEmployeeId();
  const now = new Date();
  try {
    const { data } = await api.post<TimeLogResult>('/api/self-service/timelogs', {
      employeeId,
      date: `${ymd(now)}T00:00:00`,
      startTime: localDateTime(now),
    });
    return data;
  } catch (err) {
    throw new Error(apiError(err, 'Could not update your time log.'));
  }
}

/* ---- Time-log correction filings (routed to an approver) ------------ */

export type TimeLogEntryType = 'CheckIn' | 'CheckOut';

export interface NewTimeLogFiling {
  entryType: TimeLogEntryType; // CheckIn / CheckOut
  date: string; // 'YYYY-MM-DD'
  time: string; // 'HH:mm'
  reason: string;
}

/**
 * File a time-log correction (forgot to clock in/out) for the signed-in
 * employee. POST /api/self-service/timelogs/filings -> { id, status }.
 * The backend reads only the time-of-day from `time`, so we combine it with
 * the date. Stays Pending until an approver decides on it.
 */
export async function createTimeLogFiling(
  input: NewTimeLogFiling,
): Promise<{ id: number; status: string }> {
  const employeeId = requireEmployeeId();
  try {
    const { data } = await api.post<{ id: number; status: string }>(
      '/api/self-service/timelogs/filings',
      {
        employeeId,
        entryType: input.entryType,
        logDate: `${input.date}T00:00:00`,
        time: `${input.date}T${input.time}:00`,
        reason: input.reason,
      },
    );
    return { id: data.id, status: data.status };
  } catch (err) {
    throw new Error(apiError(err, 'Could not file your time-log correction.'));
  }
}

/**
 * Send the approver email for a filing. Admin/approver only
 * (TimeLogUpdate-gated) and only sends if the employee has approvers seeded
 * in the backend, so callers should treat a failure as non-fatal.
 */
export async function sendTimeLogFilingApprovalEmail(id: number): Promise<void> {
  await api.post(`/api/self-service/timelogs/filings/${id}/send-approval-email`);
}

/** Check out now — stamps the end time on the given open time log. */
export async function checkOut(timeLogId: number): Promise<TimeLogResult> {
  const employeeId = requireEmployeeId();
  const now = new Date();
  try {
    const { data } = await api.put<TimeLogResult>(`/api/self-service/timelogs/${timeLogId}`, {
      employeeId,
      date: `${ymd(now)}T00:00:00`,
      endTime: localDateTime(now),
    });
    return data;
  } catch (err) {
    throw new Error(apiError(err, 'Could not update your time log.'));
  }
}

/**
 * The current employee's own time logs within a date range (inclusive).
 * Defaults to the last 30 days when no range is given.
 */
export async function getMyTimeLogs(dateFrom?: string, dateTo?: string): Promise<TimeLogEntry[]> {
  requireEmployeeId();
  const to = dateTo || ymd(new Date());
  const from = dateFrom || ymd(new Date(Date.now() - 30 * 86_400_000));
  try {
    const { data } = await api.get('/api/timelogs/employee', {
      params: { dateFrom: from, dateTo: to, pageSize: 500 },
    });
    return itemsOf<TimeLogEntry>(data).map((t) => ({
      id: t.id,
      date: t.date,
      startTime: t.startTime,
      endTime: t.endTime,
      branchName: t.branchName,
    }));
  } catch (err) {
    throw new Error(apiError(err, 'Could not update your time log.'));
  }
}

/** A forgotten check-out stays registered, but can no longer be closed after
    this window — the dashboard resets to "Check In". */
export const CHECKOUT_WINDOW_MS = 20 * 60 * 60 * 1000; // 20 hours

export type CheckStatus =
  | { state: 'in'; id: number; startISO: string } // checked in within 20h — can check out
  | { state: 'done' } // already checked in today (by check-in date) — one check-in per day
  | { state: 'out' }; // not checked in today — can check in

/**
 * The employee's check-in/out state. Looks back a couple of days so an overnight
 * shift/forgotten check-out is still seen.
 *   1. Open log within 20h            -> 'in'   (can check out, even an overnight shift)
 *   2. Already checked in *today*      -> 'done' (one check-in per calendar day)
 *   3. Otherwise                       -> 'out'  (can check in)
 * "Today" is keyed on the check-in's date, so a shift that started yesterday and
 * is checked out today does NOT use up today's check-in. An open log older than
 * the 20h window is left registered (abandoned) rather than kept as "checked in".
 */
export async function getCheckInStatus(): Promise<CheckStatus> {
  const now = Date.now();
  const today = ymd(new Date());
  const from = ymd(new Date(now - 2 * 86_400_000));
  try {
    const logs = await getMyTimeLogs(from, today);
    const open = logs
      .filter((l) => l.startTime && !l.endTime)
      .sort((a, b) => ((a.startTime ?? '') < (b.startTime ?? '') ? 1 : -1))[0];
    if (open?.startTime && now - new Date(open.startTime).getTime() < CHECKOUT_WINDOW_MS) {
      return { state: 'in', id: open.id, startISO: open.startTime };
    }
    // Any log whose *check-in day* is today means they've used today's check-in.
    if (logs.some((l) => l.startTime && l.date.split('T')[0] === today)) {
      return { state: 'done' };
    }
    return { state: 'out' };
  } catch {
    return { state: 'out' };
  }
}
