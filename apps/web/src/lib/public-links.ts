import { APP_DOMAIN } from './app-domain';

export const publicLinks = Object.freeze({
  terms:
    process.env.NEXT_PUBLIC_TERMS_URL ?? `https://www.${APP_DOMAIN}/terms`,
  privacy:
    process.env.NEXT_PUBLIC_PRIVACY_URL ?? `https://www.${APP_DOMAIN}/privacy`,
  help:
    process.env.NEXT_PUBLIC_HELP_URL ?? `https://www.${APP_DOMAIN}/help`,
});

