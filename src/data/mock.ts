import type {
  Employee, Filing, TimeEntry, LeaveBalance,
  Client, EmployeeType, Role, LeaveType, Settings,
} from '@/types/domain';

/* =====================================================================
   Mock seed data — lifted directly from the Rev 3 prototype state so the
   UI renders identical content. When the C# API is ready, the functions
   in src/lib/api.ts switch from these arrays to fetch() calls; the
   components never change.
   ===================================================================== */

export const MOCK_EMPLOYEES: Employee[] = [
  {
    id: 'e1', empCode: 'AO-00481', name: 'Maria Santos', title: 'Data Analyst',
    clientName: 'Acme Corp', roleName: 'Employee', employeeType: 'Full-time employee',
    email: 'maria.s@acme.co', phone: '+63 917 555 0188', status: 'Active',
    dateHired: '2024-03-14',
    approvers: { timelog: ['ops@acme.co'], leave: ['ops@acme.co'], ot: ['ops@acme.co'] },
  },
  {
    id: 'e2', empCode: 'AO-00502', name: 'John Cruz', title: 'Developer',
    clientName: 'Globex', roleName: 'Contractor', employeeType: 'Independent contractor',
    email: 'john.c@globex.io', phone: '+63 918 555 0142', status: 'Active',
    dateHired: '2024-09-02',
    approvers: { timelog: ['pm@globex.io'], leave: ['pm@globex.io'], ot: ['pm@globex.io'] },
  },
  {
    id: 'e3', empCode: 'AO-00012', name: 'Ana Reyes', title: 'HR Administrator',
    clientName: null, roleName: 'HR Administrator', employeeType: 'Internal · Admin',
    email: 'ana.r@accessoffshoring.com', phone: '+63 917 555 0100', status: 'Active',
    dateHired: '2022-01-10',
    approvers: { timelog: [], leave: [], ot: [] },
  },
  {
    id: 'e4', empCode: 'AO-00540', name: 'Liza Tan', title: 'Designer',
    clientName: 'Acme Corp', roleName: 'Employee', employeeType: 'Full-time employee',
    email: 'liza.t@acme.co', phone: '+63 919 555 0177', status: 'Pending',
    dateHired: null,
    approvers: { timelog: ['ops@acme.co'], leave: ['ops@acme.co', 'hr@acme.co'], ot: ['ops@acme.co'] },
  },
];

export const MOCK_TIME_ENTRIES: TimeEntry[] = [
  { id: 't1', employeeId: 'e1', workDate: '2026-06-23', timeIn: '08:00', timeOut: '17:00', hours: 8.0, kind: 'standard', status: 'Logged' },
  { id: 't2', employeeId: 'e1', workDate: '2026-06-20', timeIn: '17:00', timeOut: '18:30', hours: 1.5, kind: 'overtime', status: 'Pending' },
  { id: 't3', employeeId: 'e1', workDate: '2026-06-19', timeIn: '08:00', timeOut: null,    hours: null, kind: 'added',  status: 'Approved' },
  { id: 't4', employeeId: 'e1', workDate: '2026-06-18', timeIn: '07:58', timeOut: '17:05', hours: 8.1, kind: 'standard', status: 'Logged' },
  { id: 't5', employeeId: 'e1', workDate: '2026-06-17', timeIn: '08:03', timeOut: '17:00', hours: 7.9, kind: 'standard', status: 'Logged' },
];

export const MOCK_FILINGS: Filing[] = [
  { id: 'f1', employeeId: 'e1', employeeName: 'Maria Santos', kind: 'Leave', leaveType: 'Vacation', filingDate: '2026-06-23', startTime: '08:00', endTime: '17:00', days: 1, hours: 8.0, reason: 'Family trip', status: 'Approved' },
  { id: 'f2', employeeId: 'e1', employeeName: 'Maria Santos', kind: 'Overtime', filingDate: '2026-06-20', startTime: '08:00', endTime: '18:30', hours: 2.5, reason: 'Month-end reporting deadline', status: 'Pending' },
  { id: 'f3', employeeId: 'e1', employeeName: 'Maria Santos', kind: 'Overtime', filingDate: '2026-06-19', startTime: '08:00', endTime: '14:30', hours: 2.0, reason: 'Release deadline', status: 'Pending' },
  { id: 'f4', employeeId: 'e1', employeeName: 'Maria Santos', kind: 'TimeLog', timelogSubtype: 'TIME IN', filingDate: '2026-06-18', startTime: '08:00', reason: 'Forgot to clock in', status: 'Approved' },
  { id: 'f5', employeeId: 'e1', employeeName: 'Maria Santos', kind: 'TimeLog', timelogSubtype: 'TIME OUT', filingDate: '2026-06-17', startTime: '18:00', reason: 'Forgot to clock out', status: 'Pending' },
  { id: 'f6', employeeId: 'e4', employeeName: 'Liza Tan', kind: 'Leave', leaveType: 'Vacation', filingDate: '2026-05-02', startTime: '08:00', endTime: '17:00', days: 2, hours: 16.0, reason: 'Family event', status: 'Pending' },
  { id: 'f7', employeeId: 'e2', employeeName: 'John Cruz', kind: 'TimeLog', timelogSubtype: 'TIME IN', filingDate: '2026-06-16', startTime: '08:00', reason: 'Forgot to clock in', status: 'Pending' },
  { id: 'f8', employeeId: 'e1', employeeName: 'Maria Santos', kind: 'Leave', leaveType: 'Sick', filingDate: '2026-06-10', startTime: '08:00', endTime: '17:00', days: 1, hours: 8.0, reason: 'Flu recovery', status: 'Approved' },
];

export const MOCK_LEAVE_BALANCES: LeaveBalance[] = [
  { leaveType: 'Vacation',  usedDays: 7.0, entitledDays: 12, hoursLeft: 56.0 },
  { leaveType: 'Sick',      usedDays: 9.0, entitledDays: 10, hoursLeft: 72.0 },
  { leaveType: 'Emergency', usedDays: 3.0, entitledDays: 3,  hoursLeft: 24.0 },
];

export const MOCK_CLIENTS: Client[] = [
  { id: 'c1', name: 'Acme Corp' },
  { id: 'c2', name: 'Globex' },
];

export const MOCK_EMPLOYEE_TYPES: EmployeeType[] = [
  { id: 'et1', name: 'Full-time employee', isActive: true, sortOrder: 1 },
  { id: 'et2', name: 'Independent contractor', isActive: true, sortOrder: 2 },
  { id: 'et3', name: 'Internal · Admin', isActive: true, sortOrder: 3 },
];

export const MOCK_ROLES: Role[] = [
  { id: 'r1', name: 'Employee', viewGroup: 'employee' },
  { id: 'r2', name: 'Contractor', viewGroup: 'employee' },
  { id: 'r3', name: 'Approver', viewGroup: 'approver' },
  { id: 'r5', name: 'HR Administrator', viewGroup: 'admin' },
  { id: 'r6', name: 'Administrator', viewGroup: 'admin' },
];

/** Permission catalog (permDefs) + per-role matrix (permsByRole). */
export const PERMISSION_DEFS: { code: string; label: string }[] = [
  { code: 'dashboard', label: 'Dashboard / Check In-Out' },
  { code: 'addedit', label: 'Add / edit time log' },
  { code: 'filing', label: 'Overtime & Leave filing' },
  { code: 'directory', label: 'Employee directory' },
  { code: 'approve', label: 'Approve / reject filings' },
  { code: 'accupay', label: 'Accupay integration' },
];

export const MOCK_ROLE_PERMS: Record<string, string[]> = {
  r1: ['dashboard', 'addedit', 'filing'],
  r2: ['dashboard', 'addedit', 'filing'],
  r3: ['dashboard', 'approve'],
  r5: ['dashboard', 'addedit', 'filing', 'directory', 'approve', 'accupay'],
  r6: ['dashboard', 'addedit', 'filing', 'directory', 'approve', 'accupay'],
};

export const MOCK_LEAVE_TYPES: LeaveType[] = [
  { id: 'lt1', name: 'Vacation', accrualMethod: 'monthly', defaultDays: 12, accrualRateDays: 1, maxAccrualDays: 12, carryOver: true, isActive: true },
  { id: 'lt2', name: 'Sick', accrualMethod: 'annual_grant', defaultDays: 10, accrualRateDays: 0, maxAccrualDays: null, carryOver: false, isActive: true },
  { id: 'lt3', name: 'Emergency', accrualMethod: 'annual_grant', defaultDays: 3, accrualRateDays: 0, maxAccrualDays: null, carryOver: false, isActive: true },
];

export const MOCK_SETTINGS: Settings = {
  timezone: 'GMT+8',
  workWeek: 'Mon-Fri',
  standardHoursDay: 8,
  emailTimelog: true,
  emailOvertime: true,
  emailLeave: true,
  autoRemind48h: false,
  accupayConnected: true,
  accupayRealtimeSync: true,
  accupayLastSyncAt: '2026-06-30T06:00:00+08:00',
  accupayLastRecordCount: 482,
};

/** The signed-in user for the prototype is Maria Santos. */
export const CURRENT_EMPLOYEE_ID = 'e1';
