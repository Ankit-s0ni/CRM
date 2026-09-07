/**
 * Single source of truth for the application domain.
 *
 * Set NEXT_PUBLIC_APP_DOMAIN in your .env file:
 *   NEXT_PUBLIC_APP_DOMAIN=liqaahq.com
 *
 * This intentionally has NO hardcoded brand-specific fallback so that
 * changing the domain in the future only requires updating the env var.
 */
export const APP_DOMAIN: string =
  process.env.NEXT_PUBLIC_APP_DOMAIN || 'liqaahq.com';

export function getApiBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_API_URL?.trim()) {
    return process.env.NEXT_PUBLIC_API_URL.trim();
  }
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    const isLocal =
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '::1' ||
      hostname.endsWith('.localhost') ||
      hostname.endsWith('.test');
    if (!isLocal) {
      return `${window.location.protocol}//api.${APP_DOMAIN}`;
    }
  }
  return 'http://localhost:4011';
}

interface WorkspaceLoginUrlInput {
  workspace: string;
  origin: string;
  hostname: string;
  protocol: string;
}

const NON_TENANT_SUBDOMAINS = new Set(["api", "app", "platform", "www"]);

export function isPlatformAdminHostname(
  hostname: string,
  appDomain = APP_DOMAIN,
) {
  const normalizedHostname = hostname.trim().toLowerCase().replace(/\.$/, "");
  const hostWithoutPort = normalizedHostname.includes(":")
    ? normalizedHostname.split(":")[0]
    : normalizedHostname;

  return (
    hostWithoutPort === `platform.${appDomain.toLowerCase()}` ||
    hostWithoutPort.startsWith("platform.")
  );
}

export function resolveWorkspaceFromHostname(
  hostname: string,
  appDomain = APP_DOMAIN,
) {
  const normalizedHostname = hostname.trim().toLowerCase().replace(/\.$/, "");
  const normalizedDomain = appDomain.trim().toLowerCase().replace(/\.$/, "");
  const hostWithoutPort = normalizedHostname.includes(":")
    ? normalizedHostname.split(":")[0]
    : normalizedHostname;

  if (
    !normalizedDomain ||
    normalizedDomain === "your-domain.com" ||
    hostWithoutPort === normalizedDomain ||
    !hostWithoutPort.endsWith(`.${normalizedDomain}`)
  ) {
    return null;
  }

  const subdomain = hostWithoutPort.slice(
    0,
    hostWithoutPort.length - normalizedDomain.length - 1,
  );
  return subdomain && !NON_TENANT_SUBDOMAINS.has(subdomain) ? subdomain : null;
}

export function buildWorkspaceLoginUrl({
  workspace,
  origin,
  hostname,
  protocol,
}: WorkspaceLoginUrlInput) {
  const isLocalDevelopment =
    hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
  if (isLocalDevelopment) {
    const params = new URLSearchParams({ workspace });
    return `${origin}/login?${params.toString()}`;
  }

  return `${protocol}//${workspace}.${APP_DOMAIN}/login`;
}
