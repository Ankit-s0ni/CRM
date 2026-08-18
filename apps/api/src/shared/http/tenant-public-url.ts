type TenantPublicUrlInput = {
  subdomain: string;
  path: string;
  searchParams?: Record<string, string | undefined>;
};

export function buildTenantPublicUrl(input: TenantPublicUrlInput) {
  const configuredOrigin = process.env.PUBLIC_APP_ORIGIN?.trim();
  const baseDomain = process.env.PUBLIC_BASE_DOMAIN?.trim() || 'liqaahq.com';
  const origin =
    configuredOrigin ||
    `https://${input.subdomain.trim().toLowerCase()}.${baseDomain}`;
  const url = new URL(input.path, ensureTrailingSlash(origin));

  for (const [key, value] of Object.entries(input.searchParams ?? {})) {
    if (value) url.searchParams.set(key, value);
  }

  return url.toString();
}

function ensureTrailingSlash(value: string) {
  return value.endsWith('/') ? value : `${value}/`;
}
