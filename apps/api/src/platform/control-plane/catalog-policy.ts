import { ModuleAvailability } from '@prisma/client';

export type CatalogModule = {
  key: string;
  availability: ModuleAvailability;
  dependencyKeys: string[];
  conflictKeys: string[];
};

export type CatalogCapability = {
  key: string;
  availability: ModuleAvailability;
  isCore: boolean;
  requiredModuleKeys: string[];
  dependencyKeys: string[];
  conflictKeys: string[];
};

export type CatalogSelection = {
  moduleKeys: string[];
  capabilityKeys: string[];
  autoIncludedCapabilityKeys: string[];
};

export class CatalogSelectionError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

export function resolveCatalogSelection(input: {
  modules: CatalogModule[];
  capabilities: CatalogCapability[];
  requestedModuleKeys: string[];
  requestedCapabilityKeys: string[];
}): CatalogSelection {
  const moduleByKey = new Map(input.modules.map((item) => [item.key, item]));
  const capabilityByKey = new Map(
    input.capabilities.map((item) => [item.key, item]),
  );
  const moduleKeys = normalized(input.requestedModuleKeys);
  const requestedCapabilities = normalized(input.requestedCapabilityKeys);
  const selectedModules = new Set(moduleKeys);

  for (const key of moduleKeys) {
    const module = moduleByKey.get(key);
    if (!module) fail('CATALOG_ITEM_NOT_FOUND', `Unknown product ${key}`);
    if (module.availability !== ModuleAvailability.AVAILABLE) {
      fail('CATALOG_ITEM_NOT_AVAILABLE', `${key} is not available`);
    }
    for (const dependency of module.dependencyKeys) {
      if (!selectedModules.has(dependency)) {
        fail('ADD_ON_PARENT_REQUIRED', `${key} requires ${dependency}`);
      }
    }
    const conflict = module.conflictKeys.find((key) =>
      selectedModules.has(key),
    );
    if (conflict) {
      fail('CAPABILITY_CONFLICT', `${module.key} conflicts with ${conflict}`);
    }
  }

  if (moduleKeys.length === 0) {
    fail('PLAN_ENTITLEMENT_INVALID', 'At least one product is required');
  }

  const selectedCapabilities = new Set(requestedCapabilities);
  for (const capability of input.capabilities) {
    if (
      capability.isCore &&
      capability.requiredModuleKeys.every((key) => selectedModules.has(key))
    ) {
      selectedCapabilities.add(capability.key);
    }
  }

  const visiting = new Set<string>();
  const visited = new Set<string>();
  const visit = (key: string) => {
    if (visited.has(key)) return;
    if (visiting.has(key)) {
      fail(
        'CAPABILITY_DEPENDENCY_CYCLE',
        `Circular capability dependency at ${key}`,
      );
    }
    const capability = capabilityByKey.get(key);
    if (!capability) {
      fail('CATALOG_ITEM_NOT_FOUND', `Unknown capability ${key}`);
    }
    if (capability.availability !== ModuleAvailability.AVAILABLE) {
      fail('CATALOG_ITEM_NOT_AVAILABLE', `${key} is not available`);
    }
    const missingModule = capability.requiredModuleKeys.find(
      (required) => !selectedModules.has(required),
    );
    if (missingModule) {
      fail(
        'CAPABILITY_PARENT_REQUIRED',
        `${key} requires product or add-on ${missingModule}`,
      );
    }
    visiting.add(key);
    for (const dependency of capability.dependencyKeys) {
      selectedCapabilities.add(dependency);
      visit(dependency);
    }
    visiting.delete(key);
    visited.add(key);
  };

  for (const key of [...selectedCapabilities]) visit(key);

  for (const key of selectedCapabilities) {
    const capability = capabilityByKey.get(key)!;
    const conflict = capability.conflictKeys.find((item) =>
      selectedCapabilities.has(item),
    );
    if (conflict) {
      fail('CAPABILITY_CONFLICT', `${key} conflicts with ${conflict}`);
    }
  }

  return {
    moduleKeys,
    capabilityKeys: [...selectedCapabilities].sort(),
    autoIncludedCapabilityKeys: [...selectedCapabilities]
      .filter((key) => !requestedCapabilities.includes(key))
      .sort(),
  };
}

function normalized(keys: string[]) {
  return [...new Set(keys.map((key) => key.trim().toUpperCase()))].sort();
}

function fail(code: string, message: string): never {
  throw new CatalogSelectionError(code, message);
}
