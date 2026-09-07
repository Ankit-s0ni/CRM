import { isTrustedApplicationOrigin } from './cors-origin';

describe('isTrustedApplicationOrigin', () => {
  it.each([
    'https://liqaahq.com',
    'https://acme.liqaahq.com',
    'https://api.liqaahq.com',
    'http://localhost:4002',
    'http://127.0.0.1:4002',
    'http://[::1]:4002',
  ])('allows a trusted application origin: %s', (origin) => {
    expect(isTrustedApplicationOrigin(origin)).toBe(true);
  });

  it.each([
    'https://evilliqaahq.com',
    'https://liqaahq.com.attacker.example',
    'https://attacker.example',
    'not-a-url',
  ])('rejects an untrusted origin: %s', (origin) => {
    expect(isTrustedApplicationOrigin(origin)).toBe(false);
  });
});
