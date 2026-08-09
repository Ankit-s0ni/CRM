import axios from "axios";
import { usePlatformAuthStore } from "./platform-auth-store";
import type { PlatformSessionResponse } from "./platform-types";

export const platformApiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:4001",
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
    "x-auth-client": "web",
  },
});

let refreshRequest: Promise<void> | null = null;

platformApiClient.interceptors.request.use((config) => {
  if (isUnsafeMethod(config.method)) {
    const csrfToken = readCookie("deltcrm_csrf");
    if (csrfToken) config.headers["x-csrf-token"] = csrfToken;
  }
  return config;
});

platformApiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const request = error.config;
    const store = usePlatformAuthStore.getState();
    if (
      error.response?.status !== 401 ||
      request?._platformRetry ||
      !store.hasSession
    ) {
      return Promise.reject(error);
    }

    request._platformRetry = true;
    try {
      if (!refreshRequest) {
        refreshRequest = refreshPlatformBrowserSession().finally(() => {
          refreshRequest = null;
        });
      }
      await refreshRequest;
      return platformApiClient(request);
    } catch (refreshError) {
      store.clearSession();
      if (typeof window !== "undefined") window.location.assign("/platform/login");
      return Promise.reject(refreshError);
    }
  },
);

async function refreshPlatformBrowserSession(): Promise<void> {
  const csrfToken = readCookie("deltcrm_csrf");
  const { data } = await axios.post<PlatformSessionResponse>(
    `${platformApiClient.defaults.baseURL}/platform/auth/refresh`,
    {},
    {
      withCredentials: true,
      headers: {
        "x-auth-client": "web",
        ...(csrfToken ? { "x-csrf-token": csrfToken } : {}),
      },
    },
  );
  usePlatformAuthStore.getState().setSession(data);
}

function isUnsafeMethod(method?: string): boolean {
  return !["get", "head", "options"].includes((method ?? "get").toLowerCase());
}

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const entry = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${name}=`));
  return entry ? decodeURIComponent(entry.slice(name.length + 1)) : null;
}
