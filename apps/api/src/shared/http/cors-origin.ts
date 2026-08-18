const LOCAL_APPLICATION_HOSTS = new Set([
  'localhost',
  '127.0.0.1',
  '::1',
  '[::1]',
]);

export function isTrustedApplicationOrigin(origin: string): boolean {
  try {
    const url = new URL(origin);
    return (
      url.hostname === 'liqaahq.com' ||
      url.hostname.endsWith('.liqaahq.com') ||
      LOCAL_APPLICATION_HOSTS.has(url.hostname)
    );
  } catch {
    return false;
  }
}
