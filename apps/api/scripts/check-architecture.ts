import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, relative, resolve, sep } from 'node:path';

type ProductDefinition = {
  name: string;
  owner: string;
  compositionRoot?: string;
  publicEntry?: string;
  readme?: string;
  physicalRoots: Array<{ id: string; path: string }>;
};

type BoundaryConfig = {
  products: ProductDefinition[];
  publicEntries: Record<string, string | string[]>;
  foundationModules: string[];
  legacyAllowedDependencies: Record<string, string[]>;
  legacyDomainFrameworkFiles: string[];
  legacyInternalImportPaths: string[];
  legacyCycleGroups: string[][];
};

const apiRoot = resolve(__dirname, '..');
const sourceRoot = resolve(apiRoot, 'src');
const config = JSON.parse(
  readFileSync(resolve(apiRoot, 'architecture/module-boundaries.json'), 'utf8'),
) as BoundaryConfig;
const failures: string[] = [];
const warnings: string[] = [];
const dependencyGraph = new Map<string, Set<string>>();
let publicContractImports = 0;
let legacyInternalImports = 0;
const compositionRoots = new Set(
  config.products.flatMap((product) =>
    product.compositionRoot ? [product.compositionRoot] : [],
  ),
);
const productByPhysicalRoot = new Map(
  config.products.flatMap((product) =>
    product.physicalRoots.map((root) => [root.id, product.name] as const),
  ),
);
const physicalRoots = config.products
  .flatMap((product) => product.physicalRoots)
  .map((root) => ({ ...root, absolutePath: resolve(apiRoot, root.path) }))
  .sort((left, right) => right.absolutePath.length - left.absolutePath.length);
const publicEntries = new Map(
  Object.entries(config.publicEntries).map(([module, paths]) => [
    module,
    (Array.isArray(paths) ? paths : [paths]).map((path) =>
      resolve(apiRoot, path),
    ),
  ]),
);

function listTypeScriptFiles(path: string): string[] {
  if (!existsSync(path)) return [];
  return readdirSync(path).flatMap((entry) => {
    const candidate = resolve(path, entry);
    return statSync(candidate).isDirectory()
      ? listTypeScriptFiles(candidate)
      : entry.endsWith('.ts') && !entry.endsWith('.spec.ts')
        ? [candidate]
        : [];
  });
}

function repositoryPath(path: string): string {
  return relative(apiRoot, path).split(sep).join('/');
}

function physicalModule(path: string): string | undefined {
  const normalizedPath = path.endsWith('.ts') ? path : `${path}.ts`;
  for (const [module, entries] of publicEntries) {
    if (entries.includes(normalizedPath)) return module;
  }
  return physicalRoots.find(
    (root) =>
      path === root.absolutePath ||
      path.startsWith(`${root.absolutePath}${sep}`),
  )?.id;
}

function isDependencyAllowed(
  sourceModule: string,
  targetModule: string,
): boolean {
  if (config.foundationModules.includes(targetModule)) return true;
  if (config.foundationModules.includes(sourceModule)) {
    return config.foundationModules.includes(targetModule);
  }
  return (config.legacyAllowedDependencies[sourceModule] ?? []).includes(
    targetModule,
  );
}

function stronglyConnectedGroups(graph: Map<string, Set<string>>): string[][] {
  let nextIndex = 0;
  const stack: string[] = [];
  const onStack = new Set<string>();
  const indexes = new Map<string, number>();
  const lowLinks = new Map<string, number>();
  const groups: string[][] = [];

  function visit(node: string) {
    indexes.set(node, nextIndex);
    lowLinks.set(node, nextIndex);
    nextIndex += 1;
    stack.push(node);
    onStack.add(node);

    for (const dependency of graph.get(node) ?? []) {
      if (!indexes.has(dependency)) {
        visit(dependency);
        lowLinks.set(
          node,
          Math.min(lowLinks.get(node)!, lowLinks.get(dependency)!),
        );
      } else if (onStack.has(dependency)) {
        lowLinks.set(
          node,
          Math.min(lowLinks.get(node)!, indexes.get(dependency)!),
        );
      }
    }

    if (lowLinks.get(node) !== indexes.get(node)) return;
    const group: string[] = [];
    let current: string;
    do {
      current = stack.pop()!;
      onStack.delete(current);
      group.push(current);
    } while (current !== node);
    if (group.length > 1) groups.push(group.sort());
  }

  for (const node of graph.keys()) {
    if (!indexes.has(node)) visit(node);
  }
  return groups;
}

for (const product of config.products) {
  if (!product.owner?.trim()) {
    failures.push(`${product.name} has no owner`);
  }
  if (product.physicalRoots.length === 0) {
    failures.push(`${product.name} has no physical module roots`);
  }
  for (const requiredPath of [
    product.compositionRoot,
    product.publicEntry,
    product.readme,
  ]) {
    if (requiredPath && !existsSync(resolve(apiRoot, requiredPath))) {
      failures.push(`${product.name} is missing ${requiredPath}`);
    }
  }
}

const commonFiles = listTypeScriptFiles(resolve(sourceRoot, 'common'));
if (commonFiles.length > 0) {
  failures.push(
    'src/common must stay empty; use a narrowly scoped src/shared package.',
  );
}

const importPattern = /from\s+['\"]([^'\"]+)['\"]/g;
const moduleFiles = [
  ...listTypeScriptFiles(resolve(sourceRoot, 'platform')),
  ...listTypeScriptFiles(resolve(sourceRoot, 'products')),
];
for (const file of moduleFiles) {
  const sourceModule = physicalModule(file);
  if (!sourceModule) continue;
  if (!dependencyGraph.has(sourceModule)) {
    dependencyGraph.set(sourceModule, new Set());
  }

  const contents = readFileSync(file, 'utf8');
  const lineCount = contents.split('\n').length;
  if (
    lineCount > 400 &&
    (file.endsWith('.service.ts') || file.endsWith('.controller.ts'))
  ) {
    warnings.push(`${repositoryPath(file)} has ${lineCount} lines`);
  }
  for (const match of contents.matchAll(importPattern)) {
    const importPath = match[1];
    if (!importPath.startsWith('.')) continue;

    const target = resolve(dirname(file), importPath);
    const targetModule = physicalModule(target);
    if (!targetModule || targetModule === sourceModule) continue;
    dependencyGraph.get(sourceModule)!.add(targetModule);
    if (!dependencyGraph.has(targetModule)) {
      dependencyGraph.set(targetModule, new Set());
    }

    if (compositionRoots.has(repositoryPath(file))) continue;

    const crossesProductBoundary =
      productByPhysicalRoot.get(sourceModule) !==
      productByPhysicalRoot.get(targetModule);
    const targetPublicEntries = publicEntries.get(targetModule);
    const importsPublicEntry =
      targetPublicEntries?.includes(`${target}.ts`) ?? false;
    if (crossesProductBoundary) {
      if (importsPublicEntry) {
        publicContractImports += 1;
      } else {
        legacyInternalImports += 1;
        const legacyKey = `${repositoryPath(file)}::${importPath}`;
        if (!config.legacyInternalImportPaths.includes(legacyKey)) {
          failures.push(
            `${repositoryPath(file)} adds an unapproved internal import: ${importPath}`,
          );
        }
      }
    }

    if (targetPublicEntries && !importsPublicEntry && crossesProductBoundary) {
      const legacyKey = `${repositoryPath(file)}::${importPath}`;
      if (config.legacyInternalImportPaths.includes(legacyKey)) continue;
      failures.push(
        `${repositoryPath(file)} bypasses ${targetModule}/public.ts`,
      );
    }

    if (!isDependencyAllowed(sourceModule, targetModule)) {
      failures.push(
        `new module dependency is not approved: ${repositoryPath(file)} (${sourceModule} -> ${targetModule})`,
      );
    }
  }

  if (repositoryPath(file).includes('/domain/')) {
    const isLegacyException = config.legacyDomainFrameworkFiles.includes(
      repositoryPath(file),
    );
    const importsFramework =
      contents.includes("from '@nestjs/") ||
      contents.includes("from '@prisma/") ||
      contents.includes("from 'prisma");
    if (importsFramework && !isLegacyException) {
      failures.push(`domain code imports a framework: ${repositoryPath(file)}`);
    }
  }
}

const approvedCycleGroups = new Set(
  config.legacyCycleGroups.map((group) => [...group].sort().join('|')),
);
for (const cycleGroup of stronglyConnectedGroups(dependencyGraph)) {
  const key = cycleGroup.join('|');
  if (!approvedCycleGroups.has(key)) {
    failures.push(`new circular dependency group: ${cycleGroup.join(' -> ')}`);
  }
}

for (const file of listTypeScriptFiles(resolve(sourceRoot, 'shared'))) {
  const contents = readFileSync(file, 'utf8');
  for (const match of contents.matchAll(importPattern)) {
    const importPath = match[1];
    if (!importPath.startsWith('.')) continue;
    const target = resolve(dirname(file), importPath);
    const targetModule = physicalModule(target);
    const foundationPublicEntry = targetModule
      ? publicEntries.get(targetModule)
      : undefined;
    const importsFoundationPublicEntry =
      targetModule !== undefined &&
      config.foundationModules.includes(targetModule) &&
      foundationPublicEntry !== undefined &&
      foundationPublicEntry.includes(`${target}.ts`);
    if (
      !importsFoundationPublicEntry &&
      (importPath.includes('/platform/') || importPath.includes('/products/'))
    ) {
      failures.push(
        `shared code imports a business module: ${repositoryPath(file)}`,
      );
    }
  }
}

if (process.argv.includes('--self-test')) {
  const assertions = [
    {
      passes: !isDependencyAllowed('pos', 'attendance'),
      message: 'POS must not import Attendance internals',
    },
    {
      passes: isDependencyAllowed('attendance-sync', 'attendance'),
      message:
        'the documented legacy baseline remains readable during migration',
    },
    {
      passes: compositionRoots.has(
        'src/products/attendance/attendance-product.module.ts',
      ),
      message: 'Attendance composition root must be registered',
    },
  ];
  const failedAssertions = assertions.filter((assertion) => !assertion.passes);
  for (const assertion of failedAssertions) failures.push(assertion.message);
  if (failedAssertions.length === 0) {
    console.log(
      `Architecture self-test passed (${assertions.length} assertions).`,
    );
  }
}

const appModule = readFileSync(resolve(sourceRoot, 'app.module.ts'), 'utf8');
const legacyAttendanceImports = [
  'attendance-config',
  'attendance-dashboard',
  'attendance-sync',
  'attendance-verification',
  'biometrics',
  'device-trust',
  'field-tracking',
  'leave',
  'payroll-lock',
  'regularization',
  'reporting',
  'runtime-config',
  'security-alerts',
];
for (const capability of legacyAttendanceImports) {
  if (appModule.includes(`./products/attendance/${capability}/`)) {
    failures.push(`AppModule bypasses Attendance product: ${capability}`);
  }
}
if (!appModule.includes('./products/attendance/public')) {
  failures.push(
    'AppModule must import Attendance through attendance/public.ts.',
  );
}

if (failures.length > 0) {
  console.error('Architecture check failed:\n');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log(
    `Architecture check passed (${moduleFiles.length} production module files, ${publicContractImports} public imports, ${legacyInternalImports} legacy internal imports).`,
  );
  if (warnings.length > 0) {
    console.warn(
      `Maintainability review: ${warnings.length} legacy services/controllers exceed 400 lines; no new cross-module dependency was accepted.`,
    );
  }
}
