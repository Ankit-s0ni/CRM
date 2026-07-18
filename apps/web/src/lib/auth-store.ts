import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface User {
  id: string;
  email: string;
  tenantId: string;
  workspace: string;
  roles?: string[];
  permissions?: string[];
  companyName?: string;
  logoUrl?: string | null;
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
  hasHydrated: boolean;
  setAuth: (user: User, accessToken: string, refreshToken: string) => void;
  setUser: (user: User) => void;
  setPendingAuth: (context: Partial<PendingAuthContext>) => void;
  clearPendingAuth: () => void;
  clearAuth: () => void;
  setHasHydrated: (value: boolean) => void;
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
      hasHydrated: false,
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
      setUser: (user) => set({ user }),
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
      setHasHydrated: (hasHydrated) => set({ hasHydrated }),
    }),
    {
      name: 'auth-storage',
      partialize: ({ user, accessToken, refreshToken, pendingAuth }) => ({ user, accessToken, refreshToken, pendingAuth }),
      onRehydrateStorage: () => (state) => state?.setHasHydrated(true),
    }
  )
);
