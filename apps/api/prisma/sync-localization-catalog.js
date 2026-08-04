const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const { PrismaClient, LocalizationStatus } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

const connectionString =
  process.env.DATABASE_URL ??
  'postgresql://app_admin:admin_password@localhost:5433/hrms_dev?schema=public';
const pool = new Pool({ connectionString });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
const TX_TIMEOUT = 120000;
const root = resolve(__dirname, '../../..');

async function main() {
  const source = readJson(resolve(root, 'localization/tenant-ui.source.json'));
  const arabic = readJson(resolve(root, 'localization/tenant-ui.ar.json'));
  const arabicByKey = new Map(
    arabic.translations
      .filter(({ value }) => value.trim())
      .map(({ key, value }) => [key, value.trim()]),
  );
  let translatedCount = 0;

  await prisma.$transaction(async (tx) => {
    const existingArabic = await tx.localeTranslation.findMany({
      where: {
        localePack: { locale: 'ar' },
        status: LocalizationStatus.PUBLISHED,
      },
      include: {
        key: { select: { defaultMessage: true } },
        localePack: { select: { version: true } },
      },
      orderBy: { localePack: { version: 'desc' } },
    });
    const translationMemory = new Map();
    for (const translation of existingArabic) {
      if (!translationMemory.has(translation.key.defaultMessage)) {
        translationMemory.set(
          translation.key.defaultMessage,
          translation.value.trim(),
        );
      }
    }

    const keys = new Map();
    const sourceByKey = new Map();
    for (const entry of source.entries) {
      const key = await tx.localizationKey.upsert({
        where: { key: entry.key },
        create: {
          key: entry.key,
          namespace: entry.namespace,
          defaultMessage: entry.defaultMessage,
          description: entry.description,
        },
        update: {
          namespace: entry.namespace,
          defaultMessage: entry.defaultMessage,
          description: entry.description,
        },
      });
      keys.set(entry.key, key);
      sourceByKey.set(entry.key, entry);
    }

    const draft = await ensureDraftPack(tx, 'ar');
    for (const [keyName, key] of keys) {
      const sourceEntry = sourceByKey.get(keyName);
      const value =
        arabicByKey.get(keyName) ??
        translationMemory.get(sourceEntry.defaultMessage);
      if (!value) continue;
      await tx.localeTranslation.upsert({
        where: {
          localePackId_keyId: {
            localePackId: draft.id,
            keyId: key.id,
          },
        },
        create: {
          localePackId: draft.id,
          keyId: key.id,
          value,
          status: LocalizationStatus.DRAFT,
        },
        update: {
          value,
          status: LocalizationStatus.DRAFT,
          reviewedAt: null,
          reviewedBy: null,
        },
      });
      translatedCount += 1;
    }

  }, { timeout: TX_TIMEOUT });

  console.log(
    `Registered ${source.entries.length} English keys and ${translatedCount} Arabic draft translations.`,
  );
}

async function ensureDraftPack(tx, locale) {
  const currentDraft = await tx.localePack.findFirst({
    where: { locale, status: LocalizationStatus.DRAFT },
    orderBy: { version: 'desc' },
  });
  if (currentDraft) {
    await inheritPublishedTranslations(tx, locale, currentDraft.id);
    return currentDraft;
  }

  const latest = await tx.localePack.findFirst({
    where: { locale },
    orderBy: { version: 'desc' },
    select: { version: true },
  });
  const created = await tx.localePack.create({
    data: {
      locale,
      displayName: 'Arabic',
      nativeName: 'العربية',
      direction: 'RTL',
      status: LocalizationStatus.DRAFT,
      version: (latest?.version ?? 0) + 1,
    },
  });
  await inheritPublishedTranslations(tx, locale, created.id);
  return created;
}

async function inheritPublishedTranslations(tx, locale, targetPackId) {
  const published = await tx.localePack.findFirst({
    where: { locale, status: LocalizationStatus.PUBLISHED },
    orderBy: { version: 'desc' },
    include: {
      translations: {
        where: { status: LocalizationStatus.PUBLISHED },
      },
    },
  });
  if (!published?.translations.length) return;

  await tx.localeTranslation.createMany({
    data: published.translations.map((translation) => ({
      localePackId: targetPackId,
      keyId: translation.keyId,
      value: translation.value,
      status: LocalizationStatus.DRAFT,
    })),
    skipDuplicates: true,
  });
}

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
