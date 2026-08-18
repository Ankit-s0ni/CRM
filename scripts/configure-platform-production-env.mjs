#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

function parseEnvironment(source) {
  const environment = {};

  for (const line of source.split(/\r?\n/)) {
    const separator = line.indexOf("=");
    if (separator <= 0 || line.trimStart().startsWith("#")) continue;

    const key = line.slice(0, separator).trim();
    const rawValue = line.slice(separator + 1).trim();

    if (rawValue.startsWith('"') && rawValue.endsWith('"')) {
      try {
        environment[key] = JSON.parse(rawValue);
        continue;
      } catch {
        // Preserve unusual legacy values rather than rewriting them.
      }
    }

    environment[key] =
      rawValue.startsWith("'") && rawValue.endsWith("'")
        ? rawValue.slice(1, -1)
        : rawValue;
  }

  return environment;
}

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, "..");
const environmentPath = path.resolve(
  process.argv[2] ?? path.join(repositoryRoot, "apps/api/.env"),
);

if (!fs.existsSync(environmentPath)) {
  throw new Error(`Platform API environment not found: ${environmentPath}`);
}

const original = fs.readFileSync(environmentPath, "utf8");
const parsed = parseEnvironment(original);
const randomSecret = (bytes = 32) =>
  crypto.randomBytes(bytes).toString("base64url");
const randomPassword = () =>
  `${randomSecret(24)}Aa1!`;
const randomBase32 = (length = 32) => {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const bytes = crypto.randomBytes(length);
  return [...bytes]
    .map((byte) => alphabet[byte % alphabet.length])
    .join("");
};
const stable = (key, create) => parsed[key] || create();
const tenantAdminPassword = stable("TENANT_ADMIN_PASSWORD", randomPassword);
const tenantHrPassword = stable("TENANT_HR_PASSWORD", randomPassword);
const tenantEmployeePassword = stable(
  "TENANT_EMPLOYEE_PASSWORD",
  randomPassword,
);
const updates = {
  NODE_ENV: "production",
  PORT: "4011",
  PLATFORM_API_PORT: "4011",
  CORS_ORIGIN: "https://platform.liqaahq.com",
  PUBLIC_BASE_DOMAIN: "liqaahq.com",
  AUTH_CSRF_COOKIE_DOMAIN: ".liqaahq.com",
  PRODUCT_TOKEN_ISSUER: "https://platformapi.liqaahq.com",
  PRODUCT_TOKEN_KEY_ID:
    parsed.PRODUCT_TOKEN_KEY_ID || "platform-prod-2026-08",
  PLATFORM_ADMIN_EMAIL:
    parsed.PLATFORM_ADMIN_EMAIL || "owner@liqaahq.com",
  PLATFORM_ADMIN_PASSWORD: stable("PLATFORM_ADMIN_PASSWORD", randomPassword),
  PLATFORM_ADMIN_MFA_SECRET: stable(
    "PLATFORM_ADMIN_MFA_SECRET",
    randomBase32,
  ),
  PLATFORM_SUPPORT_EMAIL:
    parsed.PLATFORM_SUPPORT_EMAIL || "support@liqaahq.com",
  PLATFORM_SUPPORT_PASSWORD: stable(
    "PLATFORM_SUPPORT_PASSWORD",
    randomPassword,
  ),
  PLATFORM_SUPPORT_MFA_SECRET: stable(
    "PLATFORM_SUPPORT_MFA_SECRET",
    randomBase32,
  ),
  TENANT_ADMIN_PASSWORD: tenantAdminPassword,
  TENANT_HR_PASSWORD: tenantHrPassword,
  TENANT_EMPLOYEE_PASSWORD: tenantEmployeePassword,
  ACME_ADMIN_PASSWORD:
    parsed.ACME_ADMIN_PASSWORD || tenantAdminPassword,
  ACME_HR_PASSWORD: parsed.ACME_HR_PASSWORD || tenantHrPassword,
  ACME_EMPLOYEE_PASSWORD:
    parsed.ACME_EMPLOYEE_PASSWORD || tenantEmployeePassword,
  GLOBEX_ADMIN_PASSWORD:
    parsed.GLOBEX_ADMIN_PASSWORD || tenantAdminPassword,
  GLOBEX_HR_PASSWORD: parsed.GLOBEX_HR_PASSWORD || tenantHrPassword,
  GLOBEX_EMPLOYEE_PASSWORD:
    parsed.GLOBEX_EMPLOYEE_PASSWORD || tenantEmployeePassword,
};

if (!parsed.PRODUCT_TOKEN_PRIVATE_KEY || !parsed.PRODUCT_TOKEN_PUBLIC_KEY) {
  const { privateKey, publicKey } = crypto.generateKeyPairSync("rsa", {
    modulusLength: 2048,
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
    publicKeyEncoding: { type: "spki", format: "pem" },
  });

  updates.PRODUCT_TOKEN_PRIVATE_KEY = privateKey;
  updates.PRODUCT_TOKEN_PUBLIC_KEY = publicKey;
}

let serviceCredentials;
try {
  serviceCredentials = JSON.parse(
    parsed.PRODUCT_SERVICE_CREDENTIALS_JSON || "{}",
  );
} catch {
  serviceCredentials = {};
}

const hasValidHrmsCredential =
  Array.isArray(serviceCredentials.HRMS) &&
  serviceCredentials.HRMS.some(
    (credential) =>
      typeof credential === "string" && credential.length >= 32,
  );

if (!hasValidHrmsCredential) {
  serviceCredentials.HRMS = [crypto.randomBytes(48).toString("base64url")];
}

updates.PRODUCT_SERVICE_CREDENTIALS_JSON =
  JSON.stringify(serviceCredentials);

const lines = original.split(/\r?\n/);
for (const [key, value] of Object.entries(updates)) {
  // Node's --env-file parser preserves backslashes inside double-quoted
  // values. JSON.stringify(JSON text) therefore turns {"key":...} into an
  // invalid runtime value such as {\"key\":...}. Single-quote JSON-shaped
  // values so the service receives the exact JSON document.
  const renderedValue =
    key === "PRODUCT_SERVICE_CREDENTIALS_JSON"
      ? `'${value.replaceAll("'", "\\'")}'`
      : JSON.stringify(value);
  const rendered = `${key}=${renderedValue}`;
  const index = lines.findIndex((line) => line.startsWith(`${key}=`));

  if (index >= 0) {
    lines[index] = rendered;
  } else {
    lines.push(rendered);
  }
}

const temporaryPath = `${environmentPath}.tmp`;
fs.writeFileSync(temporaryPath, `${lines.join("\n").trimEnd()}\n`, {
  mode: 0o600,
});
fs.renameSync(temporaryPath, environmentPath);
fs.chmodSync(environmentPath, 0o600);

console.log(
  "Protected Platform API environment configured idempotently without rotating or exposing existing secrets.",
);
