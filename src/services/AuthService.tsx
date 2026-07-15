import api from "../config/AxiosConfig";
import type { AxiosError } from "axios";
import { User } from "@/interfaces/User";
import { tokenService } from "./TokenService";

const API_BASE = "/api/account";

export async function Auth(email: string, password: string) {
  try {
    // Go through the shared axios instance so the request uses the same
    // baseURL/proxy as every other API call (and so 401/403 is handled once).
    const { data } = await api.post<{ token: string }>(`${API_BASE}/login`, {
      email,
      password,
    });
    tokenService.set(data.token);
  } catch (err) {
    // The API returns { ErrorType: "CredentialsMismatch" | "NoOrganization" }.
    const e = err as AxiosError<{ ErrorType?: string }>;
    throw new Error(e.response?.data?.ErrorType ?? "Invalid email or password");
  }
}
export async function getCurrentEmployee() {
  const response = await api.get<User>(`${API_BASE}`);
  return response.data;
}

export interface CurrentOrganization {
  id: number | null;
  name: string;
}

export interface CurrentRole {
  id: number;
  name: string;
  isAdmin: boolean;
}

/** The organization (company) the signed-in user is currently scoped to. */
export async function getCurrentOrganization(): Promise<CurrentOrganization> {
  const { data } = await api.get<CurrentOrganization>(`${API_BASE}/organization`);
  return data;
}

/**
 * The signed-in user's role. The API returns 204 No Content (empty body) when
 * the account has no role assigned, so this can resolve to null.
 */
export async function getCurrentRole(): Promise<CurrentRole | null> {
  // Returns 204/empty when the account has no role assigned.
  const { data } = await api.get<CurrentRole | "">(`${API_BASE}/current-role`);
  return data && (data as CurrentRole).id != null ? (data as CurrentRole) : null;
}

/**
 * Change the signed-in user's own password (admin or employee).
 * POST /api/account/change-password → { OldPassword, Password }.
 * Identity validates the old password; failures come back as { Error }.
 */
export async function changePassword(
  oldPassword: string,
  newPassword: string,
): Promise<void> {
  try {
    await api.post(`${API_BASE}/change-password`, {
      oldPassword,
      password: newPassword,
    });
  } catch (err) {
    const e = err as AxiosError<{ Error?: string }>;
    throw new Error(e.response?.data?.Error ?? "Could not change password.");
  }
}

/**
 * Admin: reset another user's password. No old password required.
 * POST /api/account/change-user-password/{userId} → { Password }.
 * Requires an admin account (the endpoint is user-management gated).
 */
export async function resetUserPassword(
  userId: number,
  newPassword: string,
): Promise<void> {
  try {
    await api.post(`${API_BASE}/change-user-password/${userId}`, {
      password: newPassword,
    });
  } catch (err) {
    const e = err as AxiosError<{ Error?: string }>;
    throw new Error(e.response?.data?.Error ?? "Could not reset password.");
  }
}
