import { tokenService } from "@/services/TokenService";
import axios from "axios";
import type { AxiosInstance, InternalAxiosRequestConfig } from "axios";
const api: AxiosInstance = axios.create({
  // Relative by default so requests hit the same origin: in dev the Vite proxy
  // forwards /api to the C# API; in prod the API serves the SPA on the same host.
  // Set VITE_API_URL only when pointing at a remote tunnel (e.g. ngrok).
  baseURL:
    (import.meta as { env?: Record<string, string> }).env?.VITE_API_URL ?? "",
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = tokenService.get();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Only a 401 (unauthenticated) means the token is bad/expired. A 403
    // (forbidden) is a valid session hitting an endpoint it isn't permitted to
    // use — e.g. an employee touching an admin-only API like /api/leaves/ledger
    // — and must NOT clear the token, or the whole session breaks.
    if (error.response?.status === 401) {
      tokenService.remove();
    }

    return Promise.reject(error);
  },
);

export default api;
