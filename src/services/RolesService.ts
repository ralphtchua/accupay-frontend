import api from '@/config/AxiosConfig';
import type { AxiosError } from 'axios';

/* =====================================================================
   RolesService — roles & permissions admin (real C# API).
   Permissions are per-module with Read/Create/Update/Delete flags. A role
   carries a RolePermissions list; saving sends the FULL list (the backend
   removes any module not included), so callers send every module's flags.
   Endpoints are RoleRead/RoleUpdate/RoleCreate gated; admins bypass.
   ===================================================================== */

export interface ApiPermission {
  id: number;
  name: string;
}

export interface ApiRolePermission {
  permissionId: number;
  permissionName?: string;
  read: boolean;
  create: boolean;
  update: boolean;
  delete: boolean;
}

export interface ApiRole {
  id: number;
  name: string;
  isAdmin: boolean;
  rolePermissions: ApiRolePermission[];
}

export interface ApiUser {
  id: number;
  firstName?: string;
  lastName?: string;
  email?: string;
  /** The employee RowID this account is linked to (AspNetUser.EmployeeId,
      returned on /api/users) — used to link an employee to their account. */
  employeeId?: number | null;
}

export interface ApiUserRole {
  userId: number;
  roleId: number;
}

function unwrapList<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[];
  const p = payload as { items?: T[]; data?: T[] } | null;
  return p?.items ?? p?.data ?? [];
}

function apiError(err: unknown): string {
  const e = err as AxiosError<Record<string, string>>;
  const data = e.response?.data;
  if (data && typeof data === 'object') {
    const msg = data.Error ?? data.error ?? data.title ?? data.message;
    if (msg) return String(msg);
  }
  if (e.response?.status === 500) {
    return 'Server error (500). Check the API console for the stack trace.';
  }
  return e.message || 'Request failed.';
}

/** All roles for the current client. */
export async function getRoles(): Promise<ApiRole[]> {
  const { data } = await api.get('/api/roles', { params: { pageSize: 200 } });
  return unwrapList<ApiRole>(data).map((r) => ({
    ...r,
    rolePermissions: r.rolePermissions ?? [],
  }));
}

/** The master list of permission modules. */
export async function getPermissions(): Promise<ApiPermission[]> {
  const { data } = await api.get<unknown>('/api/permissions');
  return unwrapList<ApiPermission>(data);
}

/** Replace a role's permissions (send the complete module list). */
export async function updateRole(
  id: number,
  name: string,
  rolePermissions: ApiRolePermission[],
): Promise<void> {
  try {
    await api.put(`/api/roles/${id}`, { name, rolePermissions });
  } catch (err) {
    throw new Error(apiError(err));
  }
}

/** Create an empty role (edit its permissions afterward). */
export async function createRole(name: string): Promise<ApiRole> {
  try {
    const { data } = await api.post<ApiRole>('/api/roles', {
      name,
      rolePermissions: [],
    });
    return data;
  } catch (err) {
    throw new Error(apiError(err));
  }
}

/** Delete a role. DELETE /api/roles/{id} (RoleDelete-gated; admin bypasses). */
export async function deleteRole(id: number): Promise<void> {
  try {
    await api.delete(`/api/roles/${id}`);
  } catch (err) {
    throw new Error(apiError(err));
  }
}

/** All user accounts in the org. */
export async function getUsers(): Promise<ApiUser[]> {
  const { data } = await api.get('/api/users', { params: { pageSize: 500 } });
  return unwrapList<ApiUser>(data);
}

/** Current user→role assignments (only users that have a role). */
export async function getUserRoles(): Promise<ApiUserRole[]> {
  const { data } = await api.get<unknown>('/api/roles/user-roles');
  return unwrapList<ApiUserRole>(data);
}

/**
 * Save user→role assignments. Send the full set so existing assignments are
 * preserved regardless of whether the backend upserts or replaces. Use
 * roleId: null to clear a user's role.
 */
export async function saveUserRoles(
  assignments: { userId: number; roleId: number | null }[],
): Promise<void> {
  try {
    await api.put('/api/roles/user-roles', assignments);
  } catch (err) {
    throw new Error(apiError(err));
  }
}
