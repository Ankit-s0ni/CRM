import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const sourcePath = resolve('docs/openapi.json');
const outputPath = resolve('docs/openapi/platform-mobile-control-plane.v1.json');
const source = JSON.parse(await readFile(sourcePath, 'utf8'));

const requiredOperations = [
  ['post', '/auth/mobile-login'],
  ['post', '/auth/refresh'],
  ['post', '/auth/logout'],
  ['post', '/auth/change-password'],
  ['get', '/auth/me'],
  ['post', '/product-integration/token'],
  ['get', '/notifications'],
  ['get', '/notifications/unread-count'],
  ['post', '/notifications/{id}/read'],
  ['post', '/notifications/read-all'],
];

const missing = requiredOperations.filter(
  ([method, path]) => !source.paths?.[path]?.[method],
);
if (missing.length > 0) {
  throw new Error(
    `Platform mobile OpenAPI is missing required operations: ${missing
      .map(([method, path]) => `${method.toUpperCase()} ${path}`)
      .join(', ')}`,
  );
}

const selectedPaths = {};
for (const [, path] of requiredOperations) selectedPaths[path] = source.paths[path];

const mobileDocument = {
  openapi: source.openapi,
  info: {
    title: 'Delsia Platform Mobile Control Plane API',
    version: '1.0.0',
    description:
      'Platform-owned mobile identity, HRMS product-token exchange, and notification operations.',
  },
  servers: source.servers,
  paths: selectedPaths,
  components: source.components,
  security: source.security,
};

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(mobileDocument, null, 2)}\n`);
console.log(
  `Exported ${requiredOperations.length} Platform mobile operations to ${outputPath}`,
);
