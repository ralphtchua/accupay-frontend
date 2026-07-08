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
    if (error.response?.status === 401 || error.response?.status === 403) {
      tokenService.remove();
    }

    return Promise.reject(error);
  },
);

export default api;
