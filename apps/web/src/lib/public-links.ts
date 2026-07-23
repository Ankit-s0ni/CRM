const appDomain = process.env.NEXT_PUBLIC_APP_DOMAIN ?? 'blufield.cloud';

export const publicLinks = Object.freeze({
  terms:
    process.env.NEXT_PUBLIC_TERMS_URL ?? `https://www.${appDomain}/terms`,
  privacy:
    process.env.NEXT_PUBLIC_PRIVACY_URL ?? `https://www.${appDomain}/privacy`,
  help:
    process.env.NEXT_PUBLIC_HELP_URL ?? `https://www.${appDomain}/help`,
});
