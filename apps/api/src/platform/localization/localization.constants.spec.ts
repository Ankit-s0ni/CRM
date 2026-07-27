import {
  assertMatchingPlaceholders,
  localeFallbackChain,
  normalizeEnabledLanguages,
  publicLanguageForLocale,
  regionalLocaleForCountry,
  resolveCatalogLocale,
} from './localization.constants';

describe('localization constants', () => {
  it('inherits regional Arabic through base Arabic and English', () => {
    expect(localeFallbackChain('ar-OM')).toEqual(['en', 'ar', 'ar-OM']);
    expect(localeFallbackChain('ar-AE')).toEqual(['en', 'ar', 'ar-AE']);
    expect(localeFallbackChain('ar')).toEqual(['en', 'ar']);
  });

  it('resolves the supported office markets', () => {
    expect(regionalLocaleForCountry('OM')).toBe('ar-OM');
    expect(regionalLocaleForCountry('AE')).toBe('ar-AE');
    expect(regionalLocaleForCountry('IN')).toBe('ar');
  });

  it('keeps public language separate from regional Arabic resolution', () => {
    expect(publicLanguageForLocale('ar-OM')).toBe('ar');
    expect(normalizeEnabledLanguages(['en', 'ar-AE'])).toEqual(['en', 'ar']);
    expect(resolveCatalogLocale('ar', 'ar-OM')).toBe('ar-OM');
    expect(resolveCatalogLocale('en', 'ar-AE')).toBe('en');
  });

  it('rejects missing, renamed, or additional placeholders', () => {
    expect(
      assertMatchingPlaceholders(
        'Welcome, {name}. You have {count} tasks.',
        'مرحباً {name}. لديك {count} مهام.',
      ),
    ).toBeNull();
    expect(
      assertMatchingPlaceholders(
        'Welcome, {name}. You have {count} tasks.',
        'مرحباً {user}.',
      ),
    ).toEqual({
      expected: ['count', 'name'],
      received: ['user'],
    });
  });
});
