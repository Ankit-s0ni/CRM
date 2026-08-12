import { createHash } from 'node:crypto';
import { lstat, readFile, readdir } from 'node:fs/promises';
import { resolve, relative } from 'node:path';
import process from 'node:process';

const repositoryRoot = process.cwd();
const localMobileRoot = resolve(repositoryRoot, 'apps/mobile');
const peerMobileRoot = resolve(
  repositoryRoot,
  process.env.MOBILE_PARITY_PEER ?? '../deltcrm-hrms/apps/mobile',
);

const parityInputs = [
  'analysis_options.yaml',
  'dart_test.yaml',
  'assets',
  'config',
  'l10n.yaml',
  'lib',
  'integration_test',
  'pubspec.lock',
  'pubspec.yaml',
  'test',
  'android/app/build.gradle.kts',
  'android/app/src',
  'android/build.gradle.kts',
  'android/gradle.properties',
  'android/gradle/wrapper/gradle-wrapper.properties',
  'android/settings.gradle.kts',
  'ios/Podfile',
  'ios/Podfile.lock',
  'ios/Runner',
  'ios/Runner.xcodeproj/project.pbxproj',
];

async function collectFiles(root, input, output) {
  if (input === 'test/failures' || input.startsWith('test/failures/')) return;
  const absolutePath = resolve(root, input);
  const stats = await lstat(absolutePath);
  if (stats.isSymbolicLink()) return;
  if (stats.isFile()) {
    output.push(input);
    return;
  }

  const entries = await readdir(absolutePath, { withFileTypes: true });
  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    if (entry.isSymbolicLink()) continue;
    const child = relative(root, resolve(absolutePath, entry.name));
    if (child === 'test/failures' || child.startsWith('test/failures/')) continue;
    await collectFiles(root, child, output);
  }
}

async function snapshot(root) {
  const files = [];
  for (const input of parityInputs) await collectFiles(root, input, files);

  const hashes = new Map();
  for (const file of files.sort()) {
    const bytes = await readFile(resolve(root, file));
    hashes.set(file, createHash('sha256').update(bytes).digest('hex'));
  }
  return hashes;
}

function compare(local, peer) {
  const paths = new Set([...local.keys(), ...peer.keys()]);
  return [...paths]
    .sort()
    .filter((path) => local.get(path) !== peer.get(path))
    .map((path) => ({
      path,
      local: local.has(path) ? local.get(path) : 'missing',
      peer: peer.has(path) ? peer.get(path) : 'missing',
    }));
}

try {
  const [localSnapshot, peerSnapshot] = await Promise.all([
    snapshot(localMobileRoot),
    snapshot(peerMobileRoot),
  ]);
  const differences = compare(localSnapshot, peerSnapshot);

  if (differences.length > 0) {
    console.error('Mobile source parity failed. The HRMS repository is canonical.');
    for (const difference of differences.slice(0, 50)) {
      console.error(`- ${difference.path} (local=${difference.local}, peer=${difference.peer})`);
    }
    if (differences.length > 50) {
      console.error(`- ${differences.length - 50} additional difference(s) omitted`);
    }
    process.exitCode = 1;
  } else {
    console.log(`Mobile source parity passed (${localSnapshot.size} files).`);
  }
} catch (error) {
  console.error(`Mobile source parity could not run: ${error.message}`);
  console.error(`Expected peer mobile directory: ${peerMobileRoot}`);
  process.exitCode = 1;
}
