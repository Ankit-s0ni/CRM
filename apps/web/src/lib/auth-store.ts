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
  localization?: {
    defaultLanguage: "en" | "ar";
    enabledLanguages: Array<"en" | "ar">;
    catalogVersion: number;
    allowUserPreference: boolean;
    regionalArabicLocale: "ar" | "ar-OM" | "ar-AE";
    currency: string;
  };
}

export const EMPTY_PERMISSIONS: string[] = [];

interface PendingAuthContext {
  tenantId: string | null;
  workspace: string | null;
  email: string | null;
}

interface AuthState {
  user: User | null;
  hasSession: boolean;
  pendingAuth: PendingAuthContext;
  hasHydrated: boolean;
  setAuth: (user: User) => void;
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
      hasSession: false,
      pendingAuth: {
        tenantId: null,
        workspace: null,
        email: null,
      },
      hasHydrated: false,
      setAuth: (user) =>
        set({
          user,
          hasSession: true,
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
          hasSession: false,
          pendingAuth: state.pendingAuth,
        })),
      setHasHydrated: (hasHydrated) => set({ hasHydrated }),
    }),
    {
      name: 'auth-storage',
      version: 2,
      migrate: (persisted) => {
        const state = persisted as Partial<AuthState>;
        return {
          user: state.user ?? null,
          hasSession: Boolean(state.user),
          pendingAuth: state.pendingAuth ?? {
            tenantId: null,
            workspace: null,
            email: null,
          },
        };
      },
      partialize: ({ user, hasSession, pendingAuth }) => ({
        user,
        hasSession,
        pendingAuth,
      }),
      onRehydrateStorage: () => (state) => state?.setHasHydrated(true),
    }
  )
);
