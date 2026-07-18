export const publicLinks = Object.freeze({
  terms:
    process.env.NEXT_PUBLIC_TERMS_URL ?? 'https://www.deltcrm.com/terms',
  privacy:
    process.env.NEXT_PUBLIC_PRIVACY_URL ?? 'https://www.deltcrm.com/privacy',
  help:
    process.env.NEXT_PUBLIC_HELP_URL ?? 'https://www.deltcrm.com/help',
});
