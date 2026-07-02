/* =====================================================================
   Domain types — mirror the MySQL schema (access_offshoring_schema.sql).
   These are the single source of truth for the mock data layer today
   and the real API responses tomorrow. Keep them in sync with the DB.
   ===================================================================== */

export type FilingKind = 'TimeLog' | 'Overtime' | 'Leave';
export type FilingStatus = 'Pending' | 'Approved' | 'Declined';
export type TimeLogSubtype = 'TIME IN' | 'TIME OUT';
export type EmployeeStatus = 'Pending' | 'Active' | 'Suspended' | 'Archived';
export type TimeEntryKind = 'standard' | 'added' | 'overtime';
export type TimeEntryStatus = 'Logged' | 'Pending' | 'Approved' | 'Declined';

/** The three top-level shells from the prototype's "View as" switch. */
export type ViewGroup = 'employee' | 'approver' | 'admin';

export interface Client {
  id: string;
  name: string;
}

export interface EmployeeType {
  id: string;
  name: string;
  isActive: boolean;
  sortOrder: number;
}

export interface Role {
  id: string;
  name: string;
  viewGroup: ViewGroup;
}

export interface RolePermission {
  code: string;
  label: string;
  allowed: boolean;
}

export type AccrualMethod = 'annual_grant' | 'monthly';

export interface LeaveType {
  id: string;
  name: string;
  accrualMethod: AccrualMethod;
  defaultDays: number;
  accrualRateDays: number;
  maxAccrualDays: number | null;
  carryOver: boolean;
  isActive: boolean;
}

export interface Settings {
  timezone: string;
  workWeek: string;
  standardHoursDay: number;
  emailTimelog: boolean;
  emailOvertime: boolean;
  emailLeave: boolean;
  autoRemind48h: boolean;
  accupayConnected: boolean;
  accupayRealtimeSync: boolean;
  accupayLastSyncAt: string | null;
  accupayLastRecordCount: number | null;
}

export interface Employee {
  id: string;
  empCode: string;          // 'AO-00481'
  name: string;             // display name (first + last)
  title: string | null;
  clientName: string | null;
  roleName: string;
  employeeType: string;
  email: string;
  phone: string | null;
  status: EmployeeStatus;
  dateHired: string | null; // ISO date or null while Pending
  /** Per-filing-type approver emails. */
  approvers: Record<'timelog' | 'leave' | 'ot', string[]>;
}

export interface TimeEntry {
  id: string;
  employeeId: string;
  workDate: string;         // ISO date
  timeIn: string | null;    // 'HH:mm'
  timeOut: string | null;
  hours: number | null;
  kind: TimeEntryKind;
  status: TimeEntryStatus;
}

/** Unified filing — one shape for TimeLog / Overtime / Leave. */
export interface Filing {
  id: string;
  employeeId: string;
  employeeName: string;
  kind: FilingKind;
  timelogSubtype?: TimeLogSubtype;
  leaveType?: string;
  filingDate: string;       // ISO date (prototype dateIso)
  startTime?: string;       // 'HH:mm'
  endTime?: string;
  days?: number;
  hours?: number;
  reason: string;
  status: FilingStatus;
}

export interface LeaveBalance {
  leaveType: string;
  usedDays: number;
  entitledDays: number;
  hoursLeft: number;
}

export interface DashboardStats {
  weekHours: string;        // '31.5 h'
  overtimeHours: string;    // '2.0 h'
  pendingCount: number;
}

/** Shape returned for the current signed-in user. */
export interface CurrentUser {
  employee: Employee;
  viewGroup: ViewGroup;     // active view (employee/approver/admin)
}
