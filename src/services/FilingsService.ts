import api from "@/config/AxiosConfig";
import type { AxiosError } from "axios";
import type { Filing, FilingStatus } from "@/types/domain";
import { tokenService } from "@/services/TokenService";

/* =====================================================================
   FilingsService — the signed-in employee's real filings from the C# API.
   The self-service endpoints auto-scope to the current employee via the
   JWT, so no id is needed. Overtime + Leave are merged into the shared
   `Filing` shape used by My Requests and the dashboard activity list.
   ===================================================================== */

/* Subset of the API DTOs we consume (dates/times are ISO date-time strings). */
interface OvertimeApiDto {
  id: number;
  employeeId: number;
  employeeName?: string;
  startTime?: string | null;
  endTime?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  status?: string;
  reason?: string;
}

interface LeaveApiDto {
  id: number;
  employeeId?: number | null;
  employeeName?: string;
  leaveType?: string;
  startTime?: string | null;
  endTime?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  status?: string;
  reason?: string;
}

/**
 * The API returns PaginatedList<T> which serializes as { items, totalCount }.
 * Parse defensively so a plain array or a { data } wrapper also works.
 */
function itemsOf<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[];
  const p = payload as { items?: T[]; data?: T[]; results?: T[] } | null;
  return p?.items ?? p?.data ?? p?.results ?? [];
}

/** Map the API's status strings onto the app's three filing statuses. */
function normalizeStatus(s?: string): FilingStatus {
  const v = (s ?? "").toLowerCase();
  if (v.includes("approve")) return "Approved";
  if (v.includes("declin") || v.includes("reject") || v.includes("disapprove")) {
    return "Declined";
  }
  return "Pending";
}

function datePart(dt?: string | null): string {
  return dt ? dt.split("T")[0] : "";
}

function timePart(dt?: string | null): string | undefined {
  const t = dt?.split("T")[1];
  return t ? t.slice(0, 5) : undefined; // 'HH:mm'
}

function hoursBetween(start?: string | null, end?: string | null): number | undefined {
  if (!start || !end) return undefined;
  const ms = new Date(end).getTime() - new Date(start).getTime();
  return Number.isFinite(ms) && ms > 0 ? ms / 3_600_000 : undefined;
}

function daysBetween(start?: string | null, end?: string | null): number | undefined {
  if (!start) return undefined;
  const s = new Date(datePart(start)).getTime();
  const e = new Date(datePart(end ?? start)).getTime();
  if (!Number.isFinite(s) || !Number.isFinite(e)) return undefined;
  return Math.max(1, Math.round((e - s) / 86_400_000) + 1); // inclusive
}

function mapOvertime(dto: OvertimeApiDto): Filing {
  return {
    id: `ot-${dto.id}`,
    employeeId: String(dto.employeeId ?? ""),
    employeeName: dto.employeeName ?? "",
    kind: "Overtime",
    filingDate: datePart(dto.startDate),
    startTime: timePart(dto.startTime),
    endTime: timePart(dto.endTime),
    hours: hoursBetween(dto.startTime, dto.endTime),
    reason: dto.reason ?? "",
    status: normalizeStatus(dto.status),
  };
}

function mapLeave(dto: LeaveApiDto): Filing {
  return {
    id: `lv-${dto.id}`,
    employeeId: String(dto.employeeId ?? ""),
    employeeName: dto.employeeName ?? "",
    kind: "Leave",
    leaveType: dto.leaveType,
    filingDate: datePart(dto.startDate),
    startTime: timePart(dto.startTime),
    endTime: timePart(dto.endTime),
    days: daysBetween(dto.startDate, dto.endDate),
    reason: dto.reason ?? "",
    status: normalizeStatus(dto.status),
  };
}

/**
 * All of the signed-in employee's filings (overtime + leave), merged and
 * sorted most-recent-first.
 */
export async function getMyFilings(): Promise<Filing[]> {
  const [otRes, lvRes] = await Promise.all([
    api.get("/api/self-service/overtimes", { params: { pageSize: 200 } }),
    api.get("/api/self-service/leaves", { params: { pageSize: 200 } }),
  ]);

  const filings: Filing[] = [
    ...itemsOf<OvertimeApiDto>(otRes.data).map(mapOvertime),
    ...itemsOf<LeaveApiDto>(lvRes.data).map(mapLeave),
  ];

  return filings.sort((a, b) =>
    a.filingDate < b.filingDate ? 1 : a.filingDate > b.filingDate ? -1 : 0,
  );
}

export interface LeaveBalance {
  leaveType: string;
  balance: number;
}

interface LeaveBalanceApiDto {
  employeeId?: number;
  vacationLeave?: number;
  sickLeave?: number;
}

/**
 * The signed-in employee's Vacation/Sick leave balances.
 * The ledger endpoint (GET /api/leaves/ledger) is admin-scoped and returns the
 * whole org, so we filter to the current employee via the JWT employee id.
 * Requires the Leave:read permission — returns [] (handled by the caller) on 403.
 */
export async function getMyLeaveBalances(): Promise<LeaveBalance[]> {
  const empId = tokenService.getEmployeeId();
  const { data } = await api.get("/api/leaves/ledger", {
    params: { pageSize: 500 },
  });
  const rows = itemsOf<LeaveBalanceApiDto>(data);
  const mine =
    empId != null ? rows.find((r) => r.employeeId === empId) : rows[0];
  if (!mine) return [];
  return [
    { leaveType: "Vacation Leave", balance: mine.vacationLeave ?? 0 },
    { leaveType: "Sick Leave", balance: mine.sickLeave ?? 0 },
  ];
}

/** The signed-in employee's leave filings only (for the Leave Balances page). */
export async function getMyLeaves(): Promise<Filing[]> {
  const { data } = await api.get("/api/self-service/leaves", {
    params: { pageSize: 200 },
  });
  return itemsOf<LeaveApiDto>(data)
    .map(mapLeave)
    .sort((a, b) =>
      a.filingDate < b.filingDate ? 1 : a.filingDate > b.filingDate ? -1 : 0,
    );
}

export interface NewOvertimeInput {
  date: string; // 'YYYY-MM-DD'
  from: string; // 'HH:mm'
  to: string; // 'HH:mm'
  reason: string;
}

/**
 * Pull a human-readable message out of an API error. The backend returns
 * business-rule failures as HTTP 400 { Error: "..." }; unhandled ones come
 * back as a 500 (full stack trace visible in the API console / Network tab).
 */
function extractApiError(err: unknown): string {
  const e = err as AxiosError<Record<string, string>>;
  const status = e.response?.status;
  const data = e.response?.data;
  if (data && typeof data === "object") {
    const msg = data.Error ?? data.error ?? data.title ?? data.message;
    if (msg) return String(msg);
  }
  if (typeof data === "string" && data.trim() && data.length < 300) {
    return data.trim();
  }
  if (status === 500) {
    return "Server error (500). Check the API console for the stack trace.";
  }
  return e.message || "Request failed.";
}

/**
 * File an overtime request for the signed-in employee.
 * The API's SelfServiceCreateOvertimeDto wants DateTimes; it only reads the
 * time-of-day from StartTime/EndTime, so we combine them with the date.
 */
export async function createOvertime(input: NewOvertimeInput): Promise<Filing> {
  const body = {
    startDate: `${input.date}T00:00:00`,
    startTime: `${input.date}T${input.from}:00`,
    endTime: `${input.date}T${input.to}:00`,
    reason: input.reason,
  };
  try {
    const { data } = await api.post<OvertimeApiDto>(
      "/api/self-service/overtimes",
      body,
    );
    return mapOvertime(data);
  } catch (err) {
    throw new Error(extractApiError(err));
  }
}

/** The org's configured leave types (plain string list from the API). */
export async function getLeaveTypes(): Promise<string[]> {
  const { data } = await api.get<unknown>(
    "/api/self-service/leaves/leave-types",
  );
  return itemsOf<string>(data);
}

export interface NewLeaveInput {
  leaveType: string;
  timing: "Day" | "Hour";
  from?: string; // Day mode: 'YYYY-MM-DD'
  to?: string; // Day mode end (not yet accepted by the API — see note)
  date?: string; // Hour mode: 'YYYY-MM-DD'
  start?: string; // Hour mode: 'HH:mm'
  end?: string; // Hour mode: 'HH:mm'
  reason: string;
}

/**
 * File a leave request for the signed-in employee.
 * SelfServiceCreateLeaveDto takes LeaveType + StartDate (+ optional time range
 * for hourly leave). It has no EndDate, so a multi-day "Day" leave only records
 * its start date until the backend DTO is extended.
 */
export async function createLeave(input: NewLeaveInput): Promise<Filing> {
  const body =
    input.timing === "Hour"
      ? {
          leaveType: input.leaveType,
          startDate: `${input.date}T00:00:00`,
          startTime: `${input.date}T${input.start}:00`,
          endTime: `${input.date}T${input.end}:00`,
          reason: input.reason,
        }
      : {
          leaveType: input.leaveType,
          startDate: `${input.from}T00:00:00`,
          reason: input.reason,
        };
  try {
    const { data } = await api.post<LeaveApiDto>(
      "/api/self-service/leaves",
      body,
    );
    return mapLeave(data);
  } catch (err) {
    throw new Error(extractApiError(err));
  }
}

/* -------------------------------------------------------------------- */
/* Approver side — reads ALL filings in the org via the admin endpoints  */
/* and updates their status. These require Overtime/Leave Read+Update    */
/* permissions; an IsAdmin account bypasses them.                        */
/* -------------------------------------------------------------------- */

async function getAllFilings(): Promise<Filing[]> {
  const [otRes, lvRes] = await Promise.all([
    api.get("/api/overtimes", { params: { pageSize: 200 } }),
    api.get("/api/leaves", { params: { pageSize: 200 } }),
  ]);
  return [
    ...itemsOf<OvertimeApiDto>(otRes.data).map(mapOvertime),
    ...itemsOf<LeaveApiDto>(lvRes.data).map(mapLeave),
  ].sort((a, b) =>
    a.filingDate < b.filingDate ? 1 : a.filingDate > b.filingDate ? -1 : 0,
  );
}

/** Pending filings awaiting a decision. */
export async function getPendingApprovals(): Promise<Filing[]> {
  return (await getAllFilings()).filter((f) => f.status === "Pending");
}

/** Filings already decided (approved or declined). */
export async function getApprovalHistory(): Promise<Filing[]> {
  return (await getAllFilings()).filter((f) => f.status !== "Pending");
}

// The DB only accepts its own canonical status values (e.g. the declined
// value is typically "Disapproved", not "Rejected"), so resolve the exact
// string from the API's status list instead of hardcoding it. Cached per type.
let leaveStatusCache: string[] | null = null;
let overtimeStatusCache: string[] | null = null;

async function statusListFor(kind: Filing["kind"]): Promise<string[]> {
  try {
    if (kind === "Leave") {
      if (!leaveStatusCache) {
        const { data } = await api.get("/api/self-service/leaves/leave-statuses");
        leaveStatusCache = Array.isArray(data) ? (data as string[]) : [];
      }
      return leaveStatusCache;
    }
    if (!overtimeStatusCache) {
      const { data } = await api.get("/api/overtimes/statuslist");
      overtimeStatusCache = Array.isArray(data) ? (data as string[]) : [];
    }
    return overtimeStatusCache;
  } catch {
    return [];
  }
}

/** Pick the backend's canonical status string for the chosen decision. */
function resolveDecisionStatus(
  list: string[],
  decision: "Approved" | "Declined",
): string {
  if (decision === "Approved") {
    // "approv" but not "disapprov"
    const m = list.find((s) => {
      const l = s.toLowerCase();
      return l.includes("approv") && !l.includes("disapprov");
    });
    return m ?? "Approved";
  }
  const needles = ["disapprov", "declin", "reject", "denied"];
  const m = list.find((s) => needles.some((n) => s.toLowerCase().includes(n)));
  return m ?? "Disapproved";
}

/**
 * Approve or decline a filing by re-sending its record with a new status.
 * The Update DTOs require the full record, so we rebuild it from the filing,
 * and we use the API's own canonical status value (see resolveDecisionStatus).
 */
export async function decideFiling(
  f: Filing,
  decision: "Approved" | "Declined",
): Promise<void> {
  try {
    const status = resolveDecisionStatus(await statusListFor(f.kind), decision);
    if (f.kind === "Overtime") {
      await api.put(`/api/overtimes/${f.id.replace(/^ot-/, "")}`, {
        status,
        startDate: `${f.filingDate}T00:00:00`,
        startTime: `${f.filingDate}T${f.startTime ?? "00:00"}:00`,
        endTime: `${f.filingDate}T${f.endTime ?? "00:00"}:00`,
        reason: f.reason,
        comments: "",
      });
      return;
    }
    if (f.kind === "Leave") {
      const body: Record<string, unknown> = {
        leaveType: f.leaveType ?? "",
        status,
        startDate: `${f.filingDate}T00:00:00`,
        reason: f.reason,
        comments: "",
      };
      if (f.startTime) body.startTime = `${f.filingDate}T${f.startTime}:00`;
      if (f.endTime) body.endTime = `${f.filingDate}T${f.endTime}:00`;
      await api.put(`/api/leaves/${f.id.replace(/^lv-/, "")}`, body);
      return;
    }
    throw new Error("This filing type can't be decided here.");
  } catch (err) {
    throw new Error(extractApiError(err));
  }
}
