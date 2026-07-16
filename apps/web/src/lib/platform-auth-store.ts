import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { PlatformSessionResponse, PlatformUser } from "./platform-types";

type PlatformAuthState = {
  user: PlatformUser | null;
  accessToken: string | null;
  refreshToken: string | null;
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
      accessToken: null,
      refreshToken: null,
      impersonation: null,
      hasHydrated: false,
      setSession: (session) =>
        set({
          user: session.user,
          accessToken: session.accessToken,
          refreshToken: session.refreshToken,
        }),
      clearSession: () => set({ user: null, accessToken: null, refreshToken: null, impersonation: null }),
      setImpersonation: (impersonation) => set({ impersonation }),
      clearImpersonation: () => set({ impersonation: null }),
      setHasHydrated: (hasHydrated) => set({ hasHydrated }),
    }),
    {
      name: "deltcrm-platform-auth",
      partialize: ({ user, accessToken, refreshToken, impersonation }) => ({ user, accessToken, refreshToken, impersonation }),
      onRehydrateStorage: () => (state) => state?.setHasHydrated(true),
    },
  ),
);
