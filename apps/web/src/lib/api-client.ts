import axios from 'axios';
import { useAuthStore } from './auth-store';

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001';

// Public identity requests must never inherit a previously signed-in tenant.
export const publicApiClient = axios.create({
  baseURL: apiBaseUrl,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    'x-auth-client': 'web',
  },
});

export const apiClient = axios.create({
  baseURL: apiBaseUrl,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    'x-auth-client': 'web',
  },
});

let refreshRequest: Promise<void> | null = null;

apiClient.interceptors.request.use(
  (config) => {
    const { user, pendingAuth } = useAuthStore.getState();
    if (user?.tenantId) {
      config.headers['x-tenant-id'] = user.tenantId;
    } else if (pendingAuth.tenantId) {
      config.headers['x-tenant-id'] = pendingAuth.tenantId;
    }
    if (user?.workspace) {
      config.headers['x-workspace-subdomain'] = user.workspace;
    } else if (pendingAuth.workspace) {
      config.headers['x-workspace-subdomain'] = pendingAuth.workspace;
    }
    const locale =
      user?.localization?.defaultLanguage ??
      (typeof document !== 'undefined'
        ? document.cookie
            .split('; ')
            .find((row) => row.startsWith('deltcrm-language='))
            ?.split('=')[1]
        : undefined) ??
      'en';
    config.headers['Accept-Language'] = locale;
    if (isUnsafeMethod(config.method)) {
      const csrfToken = readCookie('deltcrm_csrf');
      if (csrfToken) config.headers['x-csrf-token'] = csrfToken;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // If it's a 401 Unauthorized, try to refresh the token
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const { hasSession, clearAuth, setAuth, user, pendingAuth } =
        useAuthStore.getState();
      
      if (!hasSession || !user) {
        clearAuth();
        const params = new URLSearchParams();
        if (pendingAuth.tenantId) params.set('tenantId', pendingAuth.tenantId);
        if (pendingAuth.workspace) params.set('workspace', pendingAuth.workspace);
        if (pendingAuth.email) params.set('email', pendingAuth.email);
        window.location.href = params.toString() ? `/login?${params.toString()}` : '/login';
        return Promise.reject(error);
      }

      try {
        if (!refreshRequest) {
          refreshRequest = refreshBrowserSession(user).finally(() => {
            refreshRequest = null;
          });
        }
        await refreshRequest;
        setAuth(useAuthStore.getState().user ?? user);

        if (user.tenantId) {
          originalRequest.headers['x-tenant-id'] = user.tenantId;
        }
        if (user.workspace) {
          originalRequest.headers['x-workspace-subdomain'] = user.workspace;
        }
        return apiClient(originalRequest);
      } catch (refreshError) {
        // Refresh failed, logout
        clearAuth();
        const params = new URLSearchParams();
        if (pendingAuth.tenantId) params.set('tenantId', pendingAuth.tenantId);
        if (pendingAuth.workspace) params.set('workspace', pendingAuth.workspace);
        if (pendingAuth.email) params.set('email', pendingAuth.email);
        window.location.href = params.toString() ? `/login?${params.toString()}` : '/login';
        return Promise.reject(refreshError);
      }
    }
    
    return Promise.reject(error);
  }
);

async function refreshBrowserSession(user: NonNullable<ReturnType<typeof useAuthStore.getState>['user']>) {
  const csrfToken = readCookie('deltcrm_csrf');
  const response = await axios.post(
    `${apiBaseUrl}/auth/refresh`,
    {},
    {
      withCredentials: true,
      headers: {
        'x-auth-client': 'web',
        'x-tenant-id': user.tenantId,
        'x-workspace-subdomain': user.workspace,
        ...(csrfToken ? { 'x-csrf-token': csrfToken } : {}),
      },
    },
  );
  if (response.data?.user) useAuthStore.getState().setAuth(response.data.user);
}

function isUnsafeMethod(method?: string): boolean {
  return !['get', 'head', 'options'].includes((method ?? 'get').toLowerCase());
}

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const entry = document.cookie
    .split('; ')
    .find((row) => row.startsWith(`${name}=`));
  return entry ? decodeURIComponent(entry.slice(name.length + 1)) : null;
}
