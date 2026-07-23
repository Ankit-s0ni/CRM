/**
 * Single source of truth for the application domain.
 *
 * Set NEXT_PUBLIC_APP_DOMAIN in your .env file:
 *   NEXT_PUBLIC_APP_DOMAIN=blufield.cloud
 *
 * This intentionally has NO hardcoded brand-specific fallback so that
 * changing the domain in the future only requires updating the env var.
 */
export const APP_DOMAIN: string =
  process.env.NEXT_PUBLIC_APP_DOMAIN || 'your-domain.com';
