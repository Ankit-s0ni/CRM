import { isTrustedApplicationOrigin } from './cors-origin';

describe('isTrustedApplicationOrigin', () => {
  it.each([
    'https://blufield.cloud',
    'https://acme.blufield.cloud',
    'https://api.blufield.cloud',
    'http://localhost:4002',
    'http://127.0.0.1:4002',
    'http://[::1]:4002',
  ])('allows a trusted application origin: %s', (origin) => {
    expect(isTrustedApplicationOrigin(origin)).toBe(true);
  });

  it.each([
    'https://evilblufield.cloud',
    'https://blufield.cloud.attacker.example',
    'https://attacker.example',
    'not-a-url',
  ])('rejects an untrusted origin: %s', (origin) => {
    expect(isTrustedApplicationOrigin(origin)).toBe(false);
  });
});
