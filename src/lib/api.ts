/* =====================================================================
   API layer — THE single integration seam.

   Today every function resolves from in-memory mock data (with a small
   simulated latency). State mutations (create filing, approve/decline,
   save settings) update module-level arrays so the UI behaves like a
   real app within a session. When the C# API (via ngrok) is ready,
   replace each body with a fetch() to the matching endpoint in
   openapi.yaml. Pages/components import only from here.
   ===================================================================== */

import type {
  Employee, Filing, TimeEntry, LeaveBalance, DashboardStats,
  Client, EmployeeType, Role, RolePermission, LeaveType, Settings,
  FilingKind, TimeLogSubtype,
} from '@/types/domain';
import {
  MOCK_EMPLOYEES, MOCK_FILINGS, MOCK_TIME_ENTRIES, MOCK_LEAVE_BALANCES,
  MOCK_CLIENTS, MOCK_EMPLOYEE_TYPES, MOCK_ROLES, MOCK_LEAVE_TYPES,
  MOCK_SETTINGS, MOCK_ROLE_PERMS, PERMISSION_DEFS, CURRENT_EMPLOYEE_ID,
} from '@/data/mock';

/** Simulated latency so loading states are real during development. */
const delay = <T,>(value: T, ms = 220): Promise<T> =>
  new Promise((resolve) => setTimeout(() => resolve(value), ms));

/** Base URL for the future C# API. Set VITE_API_URL to the ngrok tunnel. */
export const API_BASE: string =
  (import.meta as { env?: Record<string, string> }).env?.VITE_API_URL ?? '';

/* ---- Mutable session state (clones so we never mutate the seed) ----- */
let filings: Filing[] = MOCK_FILINGS.map((f) => ({ ...f }));
let entries: TimeEntry[] = MOCK_TIME_ENTRIES.map((e) => ({ ...e }));
let employees: Employee[] = MOCK_EMPLOYEES.map((e) => ({ ...e, approvers: { ...e.approvers } }));
let settings: Settings = { ...MOCK_SETTINGS };
const rolePerms: Record<string, string[]> = JSON.parse(JSON.stringify(MOCK_ROLE_PERMS));
let nextId = 1000;
const newId = () => `gen${nextId++}`;

/* ---- Current user --------------------------------------------------- */
export function getCurrentEmployee(): Promise<Employee> {
  const me = MOCK_EMPLOYEES.find((e) => e.id === CURRENT_EMPLOYEE_ID)!;
  return delay(me);
}

/* ---- Dashboard ------------------------------------------------------ */
export function getDashboardStats(employeeId: string): Promise<DashboardStats> {
  const pending = filings.filter((f) => f.employeeId === employeeId && f.status === 'Pending').length;
  return delay({ weekHours: '31.5 h', overtimeHours: '2.0 h', pendingCount: pending });
}

export function getMyFilings(employeeId: string): Promise<Filing[]> {
  const mine = filings
    .filter((f) => f.employeeId === employeeId)
    .sort((a, b) => +new Date(b.filingDate) - +new Date(a.filingDate));
  return delay(mine);
}

/* ---- Time entries --------------------------------------------------- */
export function getTimeEntries(employeeId: string, from?: string, to?: string): Promise<TimeEntry[]> {
  const inRange = (iso: string) => (!from || iso >= from) && (!to || iso <= to);
  const rows = entries
    .filter((e) => e.employeeId === employeeId && inRange(e.workDate))
    .sort((a, b) => +new Date(b.workDate) - +new Date(a.workDate));
  return delay(rows);
}

/* ---- Leave ---------------------------------------------------------- */
export function getLeaveBalances(_employeeId: string): Promise<LeaveBalance[]> {
  return delay(MOCK_LEAVE_BALANCES);
}
/** Leave filings for the current user — backs the Leave requests log. */
export function getMyLeaveFilings(employeeId: string): Promise<Filing[]> {
  const rows = filings
    .filter((f) => f.employeeId === employeeId && f.kind === 'Leave')
    .sort((a, b) => +new Date(b.filingDate) - +new Date(a.filingDate));
  return delay(rows);
}
export function getLeaveTypes(): Promise<LeaveType[]> {
  return delay(MOCK_LEAVE_TYPES.filter((t) => t.isActive));
}
/** The user's leave filings, for the Leave Balances log table. */
export function getMyLeaves(employeeId: string): Promise<Filing[]> {
  const mine = filings
    .filter((f) => f.employeeId === employeeId && f.kind === 'Leave')
    .sort((a, b) => +new Date(b.filingDate) - +new Date(a.filingDate));
  return delay(mine);
}

/* ---- Check in / out ------------------------------------------------- */
export function setCheckedIn(checkedIn: boolean): Promise<{ checkedIn: boolean }> {
  return delay({ checkedIn });
}

/* ---- Create filings ------------------------------------------------- */
function pushFiling(f: Omit<Filing, 'id' | 'employeeId' | 'employeeName' | 'status'>): Promise<Filing> {
  const me = MOCK_EMPLOYEES.find((e) => e.id === CURRENT_EMPLOYEE_ID)!;
  const filing: Filing = {
    id: newId(), employeeId: me.id, employeeName: me.name, status: 'Pending', ...f,
  };
  filings = [filing, ...filings];
  return delay(filing);
}

export function createTimeLogFiling(input: {
  subtype: TimeLogSubtype; date: string; time: string; reason: string;
}): Promise<Filing> {
  return pushFiling({
    kind: 'TimeLog', timelogSubtype: input.subtype,
    filingDate: input.date, startTime: input.time, reason: input.reason,
  });
}

export function createOvertimeFiling(input: {
  date: string; from: string; to: string; hours: number; reason: string;
}): Promise<Filing> {
  return pushFiling({
    kind: 'Overtime', filingDate: input.date,
    startTime: input.from, endTime: input.to, hours: input.hours, reason: input.reason,
  });
}

export function createLeaveFiling(input: {
  leaveType: string; timing: 'Day' | 'Hour';
  from?: string; to?: string; date?: string; start?: string; end?: string;
  days?: number; hours?: number; reason: string;
}): Promise<Filing> {
  return pushFiling({
    kind: 'Leave', leaveType: input.leaveType,
    filingDate: input.date ?? input.from ?? new Date().toISOString().slice(0, 10),
    startTime: input.start, endTime: input.end,
    days: input.days, hours: input.hours, reason: input.reason,
  });
}

/* ---- Approvals ------------------------------------------------------ */
export function getPendingApprovals(): Promise<Filing[]> {
  return delay(filings.filter((f) => f.status === 'Pending'));
}
export function getApprovalHistory(): Promise<Filing[]> {
  return delay(filings.filter((f) => f.status !== 'Pending'));
}
export function decideFiling(id: string, decision: 'Approved' | 'Declined'): Promise<Filing> {
  filings = filings.map((f) => (f.id === id ? { ...f, status: decision } : f));
  return delay(filings.find((f) => f.id === id)!);
}

/* ---- Employees ------------------------------------------------------ */
export function getEmployees(q?: string): Promise<Employee[]> {
  const needle = (q ?? '').toLowerCase();
  const rows = employees.filter(
    (e) => !needle || e.name.toLowerCase().includes(needle) || e.email.toLowerCase().includes(needle),
  );
  return delay(rows);
}
export function getEmployee(id: string): Promise<Employee | undefined> {
  return delay(employees.find((e) => e.id === id));
}
export function changeEmployeeRole(id: string, roleName: string): Promise<Employee> {
  employees = employees.map((e) => (e.id === id ? { ...e, roleName } : e));
  return delay(employees.find((e) => e.id === id)!);
}
export function addApprover(id: string, cat: 'timelog' | 'leave' | 'ot', email: string): Promise<Employee> {
  employees = employees.map((e) =>
    e.id === id ? { ...e, approvers: { ...e.approvers, [cat]: [...e.approvers[cat], email] } } : e,
  );
  return delay(employees.find((e) => e.id === id)!);
}
export function removeApprover(id: string, cat: 'timelog' | 'leave' | 'ot', idx: number): Promise<Employee> {
  employees = employees.map((e) =>
    e.id === id ? { ...e, approvers: { ...e.approvers, [cat]: e.approvers[cat].filter((_, i) => i !== idx) } } : e,
  );
  return delay(employees.find((e) => e.id === id)!);
}
/** Generate a strong random password (matches the prototype generator). */
export function generatePassword(): string {
  const c = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
  let p = '';
  for (let i = 0; i < 14; i++) p += c[Math.floor(Math.random() * c.length)];
  return p;
}
export function resetEmployeePassword(_id: string, _newPassword: string): Promise<void> {
  return delay(undefined);
}

/* ---- Reference data ------------------------------------------------- */
export function getClients(): Promise<Client[]> { return delay(MOCK_CLIENTS); }
export function getEmployeeTypes(): Promise<EmployeeType[]> { return delay(MOCK_EMPLOYEE_TYPES); }
export function getRoles(): Promise<Role[]> { return delay(MOCK_ROLES); }

export function getRolePermissions(roleId: string): Promise<RolePermission[]> {
  const granted = new Set(rolePerms[roleId] ?? []);
  return delay(PERMISSION_DEFS.map((p) => ({ ...p, allowed: granted.has(p.code) })));
}
export function setRolePermission(roleId: string, code: string, allowed: boolean): Promise<void> {
  const cur = new Set(rolePerms[roleId] ?? []);
  if (allowed) cur.add(code); else cur.delete(code);
  rolePerms[roleId] = [...cur];
  return delay(undefined);
}

/* ---- Settings ------------------------------------------------------- */
export function getSettings(): Promise<Settings> { return delay({ ...settings }); }
export function saveSettings(next: Settings): Promise<Settings> {
  settings = { ...next };
  return delay({ ...settings });
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
export function runAccupaySync(): Promise<{ recordCount: number; syncedAt: string }> {
  const syncedAt = new Date().toISOString();
  settings = { ...settings, accupayLastSyncAt: syncedAt, accupayLastRecordCount: 482 };
  return delay({ recordCount: 482, syncedAt }, 900);
}

/* re-export for convenience */
export type { FilingKind };
