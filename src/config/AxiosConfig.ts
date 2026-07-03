import { tokenService } from "@/services/TokenService";
import axios from "axios";
import type { AxiosInstance, InternalAxiosRequestConfig } from "axios";
const api: AxiosInstance = axios.create({
  baseURL: "https://localhost:5001",
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
