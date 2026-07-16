import { generateTotp, verifyTotp } from './totp';

describe('platform TOTP', () => {
  it('matches the RFC 6238 SHA-1 test vector truncated to six digits', () => {
    const secret = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ';
    expect(generateTotp(secret, 59_000)).toBe('287082');
    expect(verifyTotp(secret, '287082', 59_000)).toBe(true);
    expect(verifyTotp(secret, '000000', 59_000)).toBe(false);
  });
});
