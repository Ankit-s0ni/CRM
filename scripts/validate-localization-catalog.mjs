import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const source = readJson("localization/tenant-ui.source.json");
const arabic = readJson("localization/tenant-ui.ar.json");
const overrides = readJson("localization/tenant-ui.ar.overrides.json");
const arabicByKey = new Map(
  arabic.translations.map(({ key, value }) => [key, value]),
);
const intentionallyUntranslated = new Set(
  overrides.intentionallyUntranslated ?? [],
);
const failures = [];

for (const entry of source.entries) {
  const value = arabicByKey.get(entry.key);
  if (!value?.trim()) {
    failures.push(`${entry.key}: missing Arabic value`);
    continue;
  }
  if (
    !/[\u0600-\u06ff]/.test(value) &&
    !intentionallyUntranslated.has(entry.defaultMessage)
  ) {
    failures.push(`${entry.key}: Arabic script is missing`);
  }
  if (!samePlaceholders(entry.defaultMessage, value)) {
    failures.push(`${entry.key}: placeholder mismatch`);
  }
}

const sourceKeys = new Set(source.entries.map(({ key }) => key));
for (const { key } of arabic.translations) {
  if (!sourceKeys.has(key)) failures.push(`${key}: unknown Arabic key`);
}

if (failures.length) {
  console.error(
    `Localization catalog validation failed (${failures.length} issues):`,
  );
  failures.slice(0, 50).forEach((failure) => console.error(`- ${failure}`));
  process.exitCode = 1;
} else {
  console.log(
    `Localization catalog valid: ${source.entries.length} English and Arabic entries.`,
  );
}

function samePlaceholders(sourceMessage, translatedMessage) {
  return (
    placeholders(sourceMessage).join("|") ===
    placeholders(translatedMessage).join("|")
  );
}

function placeholders(message) {
  return [...message.matchAll(/\{[^{}]+\}/g)]
    .map(([placeholder]) => placeholder)
    .sort();
}

function readJson(path) {
  return JSON.parse(readFileSync(resolve(root, path), "utf8"));
}
