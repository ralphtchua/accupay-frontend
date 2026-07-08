import api from '@/config/AxiosConfig';

/* =====================================================================
   EmployeesService — the admin employee directory + detail (real API).
   Read-only for now: the API supports listing/fetching employees, but
   NOT reset-password, role assignment, or approver assignment (no such
   endpoints exist). See docs/BACKEND_TODO_employees.md.
   ===================================================================== */

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
}

function unwrapList<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[];
  const p = payload as { items?: T[]; data?: T[] } | null;
  return p?.items ?? p?.data ?? [];
}

/** All employees in the org (admin EmployeeRead; admin bypasses). */
export async function getEmployees(): Promise<ApiEmployee[]> {
  const { data } = await api.get('/api/employees', { params: { pageSize: 500 } });
  return unwrapList<ApiEmployee>(data);
}

/** Full detail for one employee. */
export async function getEmployee(id: number): Promise<ApiEmployee | null> {
  const { data } = await api.get<ApiEmployee>(`/api/employees/${id}`);
  return data && (data as ApiEmployee).id != null ? data : null;
}
