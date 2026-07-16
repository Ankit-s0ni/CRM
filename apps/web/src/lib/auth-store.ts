import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  email: string;
  tenantId: string;
  workspace: string;
}

interface PendingAuthContext {
  tenantId: string | null;
  workspace: string | null;
  email: string | null;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  pendingAuth: PendingAuthContext;
  setAuth: (user: User, accessToken: string, refreshToken: string) => void;
  setPendingAuth: (context: Partial<PendingAuthContext>) => void;
  clearPendingAuth: () => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      pendingAuth: {
        tenantId: null,
        workspace: null,
        email: null,
      },
      setAuth: (user, accessToken, refreshToken) =>
        set({
          user,
          accessToken,
          refreshToken,
          pendingAuth: {
            tenantId: user.tenantId,
            workspace: user.workspace,
            email: user.email,
          },
        }),
      setPendingAuth: (context) =>
        set((state) => ({
          pendingAuth: {
            ...state.pendingAuth,
            ...context,
          },
        })),
      clearPendingAuth: () =>
        set({
          pendingAuth: {
            tenantId: null,
            workspace: null,
            email: null,
          },
        }),
      clearAuth: () =>
        set((state) => ({
          user: null,
          accessToken: null,
          refreshToken: null,
          pendingAuth: state.pendingAuth,
        })),
    }),
    {
      name: 'auth-storage', // saves to localStorage
    }
  )
);
