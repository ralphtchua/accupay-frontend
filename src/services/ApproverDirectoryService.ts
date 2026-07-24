import api from '@/config/AxiosConfig';
import { itemsOf, apiError } from '@/lib/apiUtils';

/* =====================================================================
   ApproverDirectoryService — the org's master approver list (real C# API).
   Approvers are people notified to approve/reject filings; they are stored
   once here and then assigned to employees by id. Endpoints are Approver
   Read/Create/Update/Delete gated; admins bypass.
     GET    /api/approvers        -> list (paginated, ?term= search)
     POST   /api/approvers        -> create
     PUT    /api/approvers/{id}   -> update
     DELETE /api/approvers/{id}   -> delete (also unassigns from employees)
   ===================================================================== */

export interface ApproverRecord {
  id: number;
  firstName: string;
  lastName: string;
  emailAddress: string;
  companyName: string;
  organizationName?: string | null;
}

export interface ApproverInput {
  firstName: string;
  lastName: string;
  emailAddress: string;
  companyName: string;
}

/** All approvers in the org (optionally filtered by a search term). */
export async function getApprovers(term?: string): Promise<ApproverRecord[]> {
  const { data } = await api.get('/api/approvers', {
    params: { pageSize: 500, term: term || undefined },
  });
  return itemsOf<ApproverRecord>(data);
}

/** Create a new approver. */
export async function createApprover(input: ApproverInput): Promise<ApproverRecord> {
  try {
    const { data } = await api.post<ApproverRecord>('/api/approvers', input);
    return data;
  } catch (err) {
    throw new Error(apiError(err, 'Could not create the approver.'));
  }
}

/** Update an existing approver. */
export async function updateApprover(id: number, input: ApproverInput): Promise<ApproverRecord> {
  try {
    const { data } = await api.put<ApproverRecord>(`/api/approvers/${id}`, input);
    return data;
  } catch (err) {
    throw new Error(apiError(err, 'Could not update the approver.'));
  }
}

interface ApproverEmployeesDto {
  employeeApprovers?: {
    employee?: { firstName?: string; middleName?: string; lastName?: string } | null;
  }[];
}

/**
 * The names of the employees this approver is assigned to.
 * GET /api/approvers/{id}/employee (ApproverRead). The API returns only names
 * (no employee id), so this is a display list, not linkable to detail.
 */
export async function getApproverEmployees(id: number): Promise<string[]> {
  const { data } = await api.get<ApproverEmployeesDto>(`/api/approvers/${id}/employee`);
  return (data.employeeApprovers ?? [])
    .map((ea) => {
      const e = ea.employee;
      return e ? [e.firstName, e.middleName, e.lastName].filter(Boolean).join(' ').trim() : '';
    })
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));
}

/** Delete an approver (removes it from every employee it was assigned to). */
export async function deleteApprover(id: number): Promise<void> {
  try {
    await api.delete(`/api/approvers/${id}`);
  } catch (err) {
    throw new Error(apiError(err, 'Could not delete the approver.'));
  }
}
