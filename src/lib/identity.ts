import type { User } from '@/interfaces/User';
import type { CurrentRole } from '@/services/AuthService';

/* =====================================================================
   Profile identity — the display fields for the header (upper right) and
   the My Profile page. Employees show their job title + employee ID; the
   real values come from the account endpoint once it exposes them. Until
   then title falls back to the role and the ID to the JWT employee RowID,
   so nothing renders blank. Admins keep the role label (no employee record).
   ===================================================================== */

export interface ProfileIdentity {
  name: string;
  roleLabel: string;
  /** Job title/position for employees (backend), else the role as a fallback. */
  title: string | null;
  /** Friendly employee number (e.g. 'AO-00481'), else '#<RowID>' from the JWT. */
  employeeId: string | null;
  isEmployee: boolean;
}

export function profileIdentity(
  user: User | null,
  employeeRowId: number | null,
  role: CurrentRole | null,
): ProfileIdentity {
  const name =
    [user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.email || '';
  const roleLabel = role?.name ?? (user?.type === 'Admin' ? 'Administrator' : 'Employee');
  const isEmployee = employeeRowId != null || user?.type === 'Employee';
  const title = user?.title ?? (isEmployee ? roleLabel : null);
  const employeeId =
    user?.employeeNo ?? (employeeRowId != null ? `#${employeeRowId}` : null);
  return { name, roleLabel, title, employeeId, isEmployee };
}
