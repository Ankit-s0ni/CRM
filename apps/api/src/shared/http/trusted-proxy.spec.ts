import express from 'express';
import { configureTrustedProxies, parseTrustedProxies } from './trusted-proxy';

describe('trusted proxy configuration', () => {
  it('normalizes an explicit allowlist and rejects trust-all ranges', () => {
    expect(parseTrustedProxies(' loopback, 10.0.0.0/8,loopback ')).toEqual([
      'loopback',
      '10.0.0.0/8',
    ]);
    expect(() => parseTrustedProxies('0.0.0.0/0')).toThrow('unsafe range');
    expect(() => parseTrustedProxies('::/0')).toThrow('unsafe range');
    expect(() => parseTrustedProxies('true')).toThrow('unsafe range');
  });

  it('does not trust forwarded addresses without an allowlist', () => {
    const app = express();
    configureTrustedProxies(app, '');
    expect(app.get('trust proxy')).toBe(false);
  });

  it('trusts only an explicitly allowlisted immediate proxy', () => {
    const app = express();
    configureTrustedProxies(app, 'loopback');
    const trust = app.get('trust proxy fn') as (
      address: string,
      hop: number,
    ) => boolean;

    expect(trust('127.0.0.1', 0)).toBe(true);
    expect(trust('198.51.100.10', 0)).toBe(false);
  });
});
