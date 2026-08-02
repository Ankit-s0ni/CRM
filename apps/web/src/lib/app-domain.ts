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

interface WorkspaceLoginUrlInput {
  workspace: string;
  email: string;
  tenantId: string;
  origin: string;
  hostname: string;
  protocol: string;
}

export function buildWorkspaceLoginUrl({
  workspace,
  email,
  tenantId,
  origin,
  hostname,
  protocol,
}: WorkspaceLoginUrlInput) {
  const params = new URLSearchParams({ email, workspace, tenantId });
  const isLocalDevelopment =
    hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
  const baseUrl = isLocalDevelopment
    ? origin
    : `${protocol}//${workspace}.${APP_DOMAIN}`;

  return `${baseUrl}/login?${params.toString()}`;
}
