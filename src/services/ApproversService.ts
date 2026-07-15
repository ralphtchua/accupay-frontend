/* =====================================================================
   ApproversService — per-employee approver email addresses.

   Interim FRONTEND storage (localStorage): an approver is just an email
   that will be notified when this employee files a request — it does NOT
   need an app account. Keyed by the employee's RowID. One list per
   employee. This maps cleanly onto the future backend approver table
   (see the backend TODO); until that exists it's local to this browser.
   ===================================================================== */

const KEY = 'ao_employee_approvers';

type Store = Record<string, string[]>; // employeeId -> approver emails

function read(): Store {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as Store) : {};
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function write(store: Store): void {
  localStorage.setItem(KEY, JSON.stringify(store));
}

/** The approver emails assigned to an employee (in the order added). */
export function getApprovers(employeeId: number): string[] {
  const list = read()[String(employeeId)];
  return Array.isArray(list) ? list : [];
}

/** Replace an employee's approver list (empty clears it). */
export function setApprovers(employeeId: number, emails: string[]): void {
  const store = read();
  if (emails.length) store[String(employeeId)] = emails;
  else delete store[String(employeeId)];
  write(store);
}

/** Basic email-shape check. */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}
