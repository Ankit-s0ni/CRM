import axios from "axios";
import { usePlatformAuthStore } from "./platform-auth-store";
import type { PlatformSessionResponse } from "./platform-types";

export const platformApiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:4001",
  headers: { "Content-Type": "application/json" },
});

platformApiClient.interceptors.request.use((config) => {
  const token = usePlatformAuthStore.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

platformApiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const request = error.config;
    const store = usePlatformAuthStore.getState();
    if (error.response?.status !== 401 || request?._platformRetry || !store.refreshToken) {
      return Promise.reject(error);
    }

    request._platformRetry = true;
    try {
      const { data } = await axios.post<PlatformSessionResponse>(
        `${platformApiClient.defaults.baseURL}/platform/auth/refresh`,
        { refreshToken: store.refreshToken },
      );
      store.setSession(data);
      request.headers.Authorization = `Bearer ${data.accessToken}`;
      return platformApiClient(request);
    } catch (refreshError) {
      store.clearSession();
      if (typeof window !== "undefined") window.location.assign("/platform/login");
      return Promise.reject(refreshError);
    }
  },
);

