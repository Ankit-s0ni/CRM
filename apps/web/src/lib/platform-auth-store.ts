import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { PlatformSessionResponse, PlatformUser } from "./platform-types";

type PlatformAuthState = {
  user: PlatformUser | null;
  hasSession: boolean;
  impersonation: null | { sessionId: string; accessToken: string; expiresAt: string; targetEmail: string; workspaceName: string };
  hasHydrated: boolean;
  setSession: (session: PlatformSessionResponse) => void;
  clearSession: () => void;
  setImpersonation: (value: NonNullable<PlatformAuthState["impersonation"]>) => void;
  clearImpersonation: () => void;
  setHasHydrated: (value: boolean) => void;
};

export const usePlatformAuthStore = create<PlatformAuthState>()(
  persist(
    (set) => ({
      user: null,
      hasSession: false,
      impersonation: null,
      hasHydrated: false,
      setSession: (session) =>
        set({
          user: session.user,
          hasSession: true,
        }),
      clearSession: () =>
        set({ user: null, hasSession: false, impersonation: null }),
      setImpersonation: (impersonation) => set({ impersonation }),
      clearImpersonation: () => set({ impersonation: null }),
      setHasHydrated: (hasHydrated) => set({ hasHydrated }),
    }),
    {
      name: "deltcrm-platform-auth",
      version: 2,
      migrate: (persisted) => {
        const state = persisted as Partial<PlatformAuthState>;
        return {
          user: state.user ?? null,
          hasSession: Boolean(state.user),
          impersonation: null,
        };
      },
      partialize: ({ user, hasSession }) => ({ user, hasSession }),
      onRehydrateStorage: () => (state) => state?.setHasHydrated(true),
    },
  ),
);
