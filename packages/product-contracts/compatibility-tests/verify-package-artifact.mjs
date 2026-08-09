import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const packageDirectory = dirname(fileURLToPath(new URL('../package.json', import.meta.url)));
const temporaryDirectory = mkdtempSync(join(tmpdir(), 'deltcrm-product-contracts-'));

try {
  const packOutput = execFileSync(
    'npm',
    ['pack', '--json', '--pack-destination', temporaryDirectory],
    {
      cwd: packageDirectory,
      encoding: 'utf8',
      env: {
        ...process.env,
        npm_config_cache: join(temporaryDirectory, 'npm-cache'),
      },
    },
  );
  const [artifact] = JSON.parse(packOutput);
  const publishedFiles = new Set(artifact.files.map(({ path }) => path));
  const requiredFiles = [
    'dist/src/index.js',
    'dist/src/index.d.ts',
    'dist/src/hrms.js',
    'dist/src/hrms.d.ts',
    'dist/generated/product-integration-client.js',
    'dist/generated/product-integration-client.d.ts',
    'manifests/hrms.v1.json',
    'openapi/product-integration.v1.json',
    'schemas/product-manifest.schema.json',
    'package.json',
  ];

  for (const requiredFile of requiredFiles) {
    assert.ok(
      publishedFiles.has(requiredFile),
      `Published package is missing ${requiredFile}`,
    );
  }

  const extractedDirectory = join(temporaryDirectory, 'package');
  mkdirSync(extractedDirectory);
  execFileSync(
    'tar',
    [
      '-xzf',
      join(temporaryDirectory, artifact.filename),
      '--strip-components=1',
      '-C',
      extractedDirectory,
    ],
  );

  const publishedPackage = JSON.parse(
    readFileSync(join(extractedDirectory, 'package.json'), 'utf8'),
  );
  assert.equal(publishedPackage.main, 'dist/src/index.js');
  assert.equal(publishedPackage.types, 'dist/src/index.d.ts');

  const require = createRequire(import.meta.url);
  const rootContract = require(extractedDirectory);
  const hrmsContract = require(join(extractedDirectory, 'dist/src/hrms.js'));
  const generatedClient = require(
    join(
      extractedDirectory,
      'dist/generated/product-integration-client.js',
    ),
  );

  assert.ok(rootContract.PRODUCT_PLATFORM_PORT);
  assert.equal(hrmsContract.HRMS_MANIFEST.key, 'HRMS');
  assert.equal(typeof generatedClient.ProductIntegrationClient, 'function');
  console.log('Published product contract artifact is complete and importable.');
} finally {
  rmSync(temporaryDirectory, { recursive: true, force: true });
}
