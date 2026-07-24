import api from "@/config/AxiosConfig";
import { itemsOf, apiError } from "@/lib/apiUtils";
import type { Filing, FilingStatus, TimeLogSubtype } from "@/types/domain";
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
  created?: string | null; // audit — filed at
  lastUpd?: string | null; // audit — last changed / decided at
  createdBy?: number | null; // user id who filed
  lastUpdBy?: number | null; // user id who last decided in-app
  approverEmail?: string | null; // who decided via the email link
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
  created?: string | null; // audit — filed at
  lastUpd?: string | null; // audit — last changed / decided at
  createdBy?: number | null; // user id who filed
  lastUpdBy?: number | null; // user id who last decided in-app
  approverEmail?: string | null; // who decided via the email link
}

/** Map the API's status strings onto the app's three filing statuses. */
function normalizeStatus(s?: string | null): FilingStatus {
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

/**
 * Treat an empty or default/min datetime as absent. The backend currently
 * ships the audit DTO fields unset, so `Created` comes back as
 * "0001-01-01T00:00:00" (DateTime.MinValue) and `LastUpd` as null. Returning
 * undefined for those makes the UI show "—" and lets sorting fall back to a
 * real date, and it auto-corrects once the backend populates the fields.
 */
function realDate(dt?: string | null): string | undefined {
  if (!dt) return undefined;
  const d = new Date(dt);
  if (Number.isNaN(d.getTime()) || d.getUTCFullYear() <= 1) return undefined;
  return dt;
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
    createdAt: realDate(dto.created),
    updatedAt: realDate(dto.lastUpd) ?? realDate(dto.created),
    createdById: dto.createdBy || null,
    updatedById: dto.lastUpdBy || null,
    approverEmail: dto.approverEmail || null,
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
    createdAt: realDate(dto.created),
    updatedAt: realDate(dto.lastUpd) ?? realDate(dto.created),
    createdById: dto.createdBy || null,
    updatedById: dto.lastUpdBy || null,
    approverEmail: dto.approverEmail || null,
  };
}

/* Time-log correction filings — GET /api/self-service/timelogs (paged, needs a
   date range). Note this DTO carries no id or audit timestamps, so these rows
   are read-only in My Requests (no "By"/decided date, not decidable here). */
interface TimelogFilingApiDto {
  entryType?: string | null; // 'CheckIn' | 'CheckOut'
  logDate?: string | null; // ISO date of the correction
  time?: string | null; // corrected clock time
  employee?: { firstName?: string; middleName?: string; lastName?: string } | null;
  reason?: string | null;
  status?: string | null; // Pending | Approved | Rejected
  approverEmail?: string | null;
}

/**
 * Pull 'HH:mm' from the DTO's `time`. The backend field is a TimeSpan; depending
 * on how it's serialized it can arrive as 'HH:mm:ss', 'HH:mm', or an ISO
 * date-time — and on netcoreapp3.1 System.Text.Json may not stringify a TimeSpan
 * at all, so we defensively bail on any non-string value rather than crash.
 */
function timeOfDay(t?: string | null): string | undefined {
  if (typeof t !== "string" || !t) return undefined;
  const s = t.includes("T") ? t.split("T")[1] : t;
  const m = s.match(/^(\d{1,2}):(\d{2})/);
  return m ? `${m[1].padStart(2, "0")}:${m[2]}` : undefined;
}

function mapTimelogFiling(dto: TimelogFilingApiDto, i: number): Filing {
  const subtype: TimeLogSubtype = dto.entryType === "CheckOut" ? "TIME OUT" : "TIME IN";
  const date = datePart(dto.logDate);
  const name = [dto.employee?.firstName, dto.employee?.middleName, dto.employee?.lastName]
    .filter(Boolean)
    .join(" ");
  return {
    // No backend id on this DTO — synthesize a stable-enough key for React.
    id: `tl-${date}-${i}`,
    employeeId: "",
    employeeName: name,
    kind: "TimeLog",
    timelogSubtype: subtype,
    filingDate: date,
    startTime: timeOfDay(dto.time),
    reason: dto.reason ?? "",
    status: normalizeStatus(dto.status),
    createdById: null,
    updatedById: null,
    approverEmail: dto.approverEmail || null,
  };
}

/** A wide date window so the paged filings endpoint returns the full history. */
function wideRange(): { from: string; to: string } {
  const now = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  const ymd = (d: Date) => `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  return {
    from: ymd(new Date(now.getFullYear() - 6, now.getMonth(), now.getDate())),
    to: ymd(new Date(now.getFullYear() + 1, now.getMonth(), now.getDate())),
  };
}

/** The signed-in employee's time-log correction filings. */
export async function getMyTimelogFilings(): Promise<Filing[]> {
  const { from, to } = wideRange();
  const { data } = await api.get("/api/self-service/timelogs", {
    params: { dateFrom: from, dateTo: to, pageSize: 500 },
  });
  return itemsOf<TimelogFilingApiDto>(data).map(mapTimelogFiling);
}

/**
 * All of the signed-in employee's filings (overtime + leave + time-log
 * corrections), merged and sorted most-recent-first. The time-log fetch is
 * isolated so a failure there (the endpoint is newer / may error) can't wipe out
 * the overtime and leave rows.
 */
export async function getMyFilings(): Promise<Filing[]> {
  const [otRes, lvRes, tlFilings] = await Promise.all([
    api.get("/api/self-service/overtimes", { params: { pageSize: 200 } }),
    api.get("/api/self-service/leaves", { params: { pageSize: 200 } }),
    getMyTimelogFilings().catch(() => [] as Filing[]),
  ]);

  const filings: Filing[] = [
    ...itemsOf<OvertimeApiDto>(otRes.data).map(mapOvertime),
    ...itemsOf<LeaveApiDto>(lvRes.data).map(mapLeave),
    ...tlFilings,
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
    throw new Error(apiError(err));
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
    throw new Error(apiError(err));
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

/** The API path segment for a filing kind (Overtime/Leave only). */
function filingBase(kind: Filing["kind"]): "overtimes" | "leaves" | null {
  return kind === "Overtime" ? "overtimes" : kind === "Leave" ? "leaves" : null;
}
const filingId = (f: Filing) => f.id.replace(/^(ot|lv)-/, "");

/**
 * Approve or reject a pending filing via the dedicated endpoints, which also
 * record who decided it: on approve we pass the admin's email, surfaced as the
 * "By" column. Only Overtime and Leave are decided here (TimeLog filings aren't
 * listable in the admin views yet). Reject takes no body — the backend doesn't
 * record the rejecter yet.
 */
export async function decideFiling(
  f: Filing,
  decision: "Approved" | "Declined",
  approverEmail?: string,
): Promise<void> {
  const base = filingBase(f.kind);
  if (!base) throw new Error("This filing type can't be decided here.");
  const id = filingId(f);
  try {
    if (decision === "Approved") {
      await api.post(`/api/${base}/filings/${id}/approve`, { approverEmail: approverEmail ?? null });
    } else {
      await api.post(`/api/${base}/filings/${id}/reject`, {});
    }
  } catch (err) {
    throw new Error(apiError(err));
  }
}

/**
 * Email this filing's assigned approvers (self-serve endpoint). Overtime/Leave
 * only. NOTE: the endpoint is still `[Permission(...Update)]`-gated on the
 * backend, so a plain Selfserve employee gets 403 — it needs Jesse to un-gate
 * the self-serve `send-approval-email` endpoints before this can be surfaced to
 * employees. Kept ready for that. Also inert until SMTP is configured.
 */
export async function sendFilingApprovalEmail(f: Filing): Promise<void> {
  const base = filingBase(f.kind);
  if (!base) throw new Error("Can't send an approval email for this filing type.");
  try {
    await api.post(`/api/self-service/${base}/filings/${filingId(f)}/send-approval-email`);
  } catch (err) {
    throw new Error(apiError(err, "Could not send the approval email."));
  }
}
