import api from '@/config/AxiosConfig';
import type { AxiosError } from 'axios';
import { tokenService } from '@/services/TokenService';

/* =====================================================================
   TimeLogsService — employee self-service time logs.
     GET  /api/self-service/timelogs/employee → the employee's own logs
     POST /api/self-service/timelogs          → CheckIn  (creates today's log)
     PUT  /api/self-service/timelogs/{id}     → CheckOut (stamps the end time)

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

function unwrapItems<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[];
  const p = payload as { items?: T[]; data?: T[] } | null;
  return p?.items ?? p?.data ?? [];
}

const pad = (n: number) => String(n).padStart(2, '0');
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
/** Local wall-clock 'YYYY-MM-DDTHH:mm:ss' (no zone — the API reads it as-is). */
const localDateTime = (d: Date) =>
  `${ymd(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;

function apiError(err: unknown): string {
  const e = err as AxiosError<Record<string, string>>;
  const data = e.response?.data;
  if (data && typeof data === 'object') {
    const msg = data.Error ?? data.error ?? data.title ?? data.message;
    if (msg) return String(msg);
  }
  if (e.response?.status === 500) {
    return 'Server error (500). Check the API console for the stack trace.';
  }
  return e.message || 'Could not update your time log.';
}

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
    throw new Error(apiError(err));
  }
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
    throw new Error(apiError(err));
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
    const { data } = await api.get('/api/self-service/timelogs/employee', {
      params: { dateFrom: from, dateTo: to, pageSize: 500 },
    });
    return unwrapItems<TimeLogEntry>(data).map((t) => ({
      id: t.id,
      date: t.date,
      startTime: t.startTime,
      endTime: t.endTime,
      branchName: t.branchName,
    }));
  } catch (err) {
    throw new Error(apiError(err));
  }
}

export type TodayLogState =
  | { state: 'none' } // no log today, can check in
  | { state: 'open'; id: number; startISO: string } // checked in, not out yet
  | { state: 'done' }; // already checked in and out today

/** The employee's check-in/out state for today (one check-in/out per day). */
export async function getTodaysLogState(): Promise<TodayLogState> {
  const today = ymd(new Date());
  try {
    const logs = await getMyTimeLogs(today, today);
    const open = logs
      .filter((l) => l.startTime && !l.endTime)
      .sort((a, b) => ((a.startTime ?? '') < (b.startTime ?? '') ? 1 : -1))[0];
    if (open?.startTime) return { state: 'open', id: open.id, startISO: open.startTime };
    if (logs.some((l) => l.startTime && l.endTime)) return { state: 'done' };
    return { state: 'none' };
  } catch {
    return { state: 'none' };
  }
}
