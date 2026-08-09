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
      url.hostname === 'blufield.cloud' ||
      url.hostname.endsWith('.blufield.cloud') ||
      LOCAL_APPLICATION_HOSTS.has(url.hostname)
    );
  } catch {
    return false;
  }
}
