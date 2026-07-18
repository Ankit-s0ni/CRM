const UNSAFE_PROXY_RANGES = new Set(['true', '*', '0.0.0.0/0', '::/0']);

type ProxyConfigurableApp = {
  set(setting: 'trust proxy', value: string[]): unknown;
};

export function configureTrustedProxies(
  app: ProxyConfigurableApp,
  configured = process.env.TRUSTED_PROXIES,
) {
  const proxies = parseTrustedProxies(configured);
  if (proxies.length) app.set('trust proxy', proxies);
  return proxies;
}

export function parseTrustedProxies(configured?: string) {
  const proxies = (configured ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  const unsafe = proxies.find((value) =>
    UNSAFE_PROXY_RANGES.has(value.toLowerCase()),
  );
  if (unsafe) {
    throw new Error(`TRUSTED_PROXIES contains unsafe range: ${unsafe}`);
  }
  return [...new Set(proxies)];
}
