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
const updates = {
  NODE_ENV: "production",
  PORT: "4011",
  PLATFORM_API_PORT: "4011",
  CORS_ORIGIN: "https://platform.blufield.cloud",
  PUBLIC_BASE_DOMAIN: "blufield.cloud",
  AUTH_CSRF_COOKIE_DOMAIN: ".blufield.cloud",
  PRODUCT_TOKEN_ISSUER: "https://platformapi.blufield.cloud",
  PRODUCT_TOKEN_KEY_ID:
    parsed.PRODUCT_TOKEN_KEY_ID || "platform-prod-2026-08",
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
  const rendered = `${key}=${JSON.stringify(value)}`;
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
  "Protected Platform API environment configured without exposing secret values.",
);
