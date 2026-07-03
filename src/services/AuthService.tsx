import api from "../config/AxiosConfig";
import { User } from "@/interfaces/User";
import { tokenService } from "./TokenService";

const API_BASE = "/api/account";

export async function Auth(email: string, password: string) {
  const response = await fetch(`${API_BASE}/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || "Invalid email or password");
  }
  const data = await response.json();
  tokenService.set(data.token);
}
export async function getCurrentEmployee() {
  const response = await api.get<User>(`${API_BASE}`);
  return response.data;
}
