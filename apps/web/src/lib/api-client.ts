import axios from 'axios';
import { useAuthStore } from './auth-store';

export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001',
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use(
  (config) => {
    const { accessToken, user, pendingAuth } = useAuthStore.getState();
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
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
      const { refreshToken, clearAuth, setAuth, user, pendingAuth } = useAuthStore.getState();
      
      if (!refreshToken) {
        clearAuth();
        const params = new URLSearchParams();
        if (pendingAuth.tenantId) params.set('tenantId', pendingAuth.tenantId);
        if (pendingAuth.workspace) params.set('workspace', pendingAuth.workspace);
        if (pendingAuth.email) params.set('email', pendingAuth.email);
        window.location.href = params.toString() ? `/login?${params.toString()}` : '/login';
        return Promise.reject(error);
      }

      try {
        const response = await axios.post(
          `${apiClient.defaults.baseURL}/auth/refresh`,
          { refreshToken },
          {
            headers: {
              ...(user?.tenantId ? { 'x-tenant-id': user.tenantId } : {}),
              ...(user?.workspace ? { 'x-workspace-subdomain': user.workspace } : {}),
            },
          },
        );
        
        const { accessToken: newAccessToken, refreshToken: newRefreshToken } = response.data;
        
        // Ensure user is not null before updating state. If user is null but we had a refresh token, 
        // the state is corrupted. Just log out.
        if (!user) throw new Error('User context missing');
        
        setAuth(user, newAccessToken, newRefreshToken);
        
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
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
