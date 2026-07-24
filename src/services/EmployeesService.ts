import api from '@/config/AxiosConfig';
import { itemsOf, apiError } from '@/lib/apiUtils';

/* =====================================================================
   EmployeesService — the admin employee directory + detail (real API).
     GET /api/employees             -> directory
     GET /api/employees/{id}        -> detail (+ assigned approvers)
     PUT /api/employees/{id}/approvers -> replace this employee's approvers
   Role assignment + reset password live on the roles/account services.
   ===================================================================== */

/** An approver assigned to an employee (returned on the employee detail). */
export interface EmployeeApproverLink {
  id: number;
  approverID: number;
  approver?: {
    firstName?: string;
    lastName?: string;
    emailAddress?: string;
    companyName?: string;
  } | null;
}

export interface ApiEmployee {
  id: number; // employee RowID
  employeeNo?: string;
  fullName?: string;
  firstName?: string;
  lastName?: string;
  employeeType?: string;
  employmentStatus?: string;
  emailAddress?: string;
  mobileNo?: string;
  workPhone?: string;
  startDate?: string; // ISO
  position?: { id: number; name: string } | null;
  employeeApprovers?: EmployeeApproverLink[];
}

/** All employees in the org (admin EmployeeRead; admin bypasses). */
export async function getEmployees(): Promise<ApiEmployee[]> {
  const { data } = await api.get('/api/employees', { params: { pageSize: 500 } });
  return itemsOf<ApiEmployee>(data);
}

/**
 * Employees in AccuPay that don't yet have a login account — computed by the
 * backend (GET /api/employeeusers/employees, UserCreate-gated) rather than
 * diffing employees against users client-side, so it's authoritative.
 */
export async function getUnregisteredEmployees(): Promise<ApiEmployee[]> {
  try {
    const { data } = await api.get('/api/employeeusers/employees', { params: { pageSize: 500 } });
    return itemsOf<ApiEmployee>(data);
  } catch (err) {
    throw new Error(apiError(err, 'Could not load unregistered employees.'));
  }
}

/** Full detail for one employee (includes assigned approvers). */
export async function getEmployee(id: number): Promise<ApiEmployee | null> {
  const { data } = await api.get<ApiEmployee>(`/api/employees/${id}`);
  return data && (data as ApiEmployee).id != null ? data : null;
}

/**
 * Replace an employee's assigned approvers with the given master-approver ids.
 * PUT /api/employees/{id}/approvers (EmployeeUpdate). The backend syncs the
 * set (removes the ones not listed, adds the new ones).
 */
export async function updateEmployeeApprovers(id: number, approverIds: number[]): Promise<void> {
  try {
    await api.put(`/api/employees/${id}/approvers`, { approverIds });
  } catch (err) {
    throw new Error(apiError(err, 'Could not update approvers.'));
  }
}
