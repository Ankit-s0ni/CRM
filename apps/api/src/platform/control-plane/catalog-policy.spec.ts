import { ModuleAvailability } from '@prisma/client';
import {
  CatalogSelectionError,
  resolveCatalogSelection,
  type CatalogCapability,
} from './catalog-policy';

const modules = [
  {
    key: 'ATTENDANCE',
    availability: ModuleAvailability.AVAILABLE,
    dependencyKeys: [],
    conflictKeys: [],
  },
  {
    key: 'FIELD_TRACKING',
    availability: ModuleAvailability.AVAILABLE,
    dependencyKeys: ['ATTENDANCE'],
    conflictKeys: [],
  },
];

const capabilities: CatalogCapability[] = [
  {
    key: 'ATTENDANCE_CORE',
    availability: ModuleAvailability.AVAILABLE,
    isCore: true,
    requiredModuleKeys: ['ATTENDANCE'],
    dependencyKeys: [],
    conflictKeys: [],
  },
  {
    key: 'ATTENDANCE_REPORTS_BASIC',
    availability: ModuleAvailability.AVAILABLE,
    isCore: true,
    requiredModuleKeys: ['ATTENDANCE'],
    dependencyKeys: ['ATTENDANCE_CORE'],
    conflictKeys: [],
  },
  {
    key: 'ATTENDANCE_REPORTS_ADVANCED',
    availability: ModuleAvailability.AVAILABLE,
    isCore: false,
    requiredModuleKeys: ['ATTENDANCE'],
    dependencyKeys: ['ATTENDANCE_REPORTS_BASIC'],
    conflictKeys: [],
  },
  {
    key: 'ATTENDANCE_FIELD_TRACKING',
    availability: ModuleAvailability.AVAILABLE,
    isCore: false,
    requiredModuleKeys: ['ATTENDANCE', 'FIELD_TRACKING'],
    dependencyKeys: ['ATTENDANCE_CORE'],
    conflictKeys: [],
  },
];

describe('resolveCatalogSelection', () => {
  it('automatically includes core and transitive capability dependencies', () => {
    expect(
      resolveCatalogSelection({
        modules,
        capabilities,
        requestedModuleKeys: ['ATTENDANCE'],
        requestedCapabilityKeys: ['ATTENDANCE_REPORTS_ADVANCED'],
      }),
    ).toEqual({
      moduleKeys: ['ATTENDANCE'],
      capabilityKeys: [
        'ATTENDANCE_CORE',
        'ATTENDANCE_REPORTS_ADVANCED',
        'ATTENDANCE_REPORTS_BASIC',
      ],
      autoIncludedCapabilityKeys: [
        'ATTENDANCE_CORE',
        'ATTENDANCE_REPORTS_BASIC',
      ],
    });
  });

  it('rejects field tracking without its add-on', () => {
    expect(() =>
      resolveCatalogSelection({
        modules,
        capabilities,
        requestedModuleKeys: ['ATTENDANCE'],
        requestedCapabilityKeys: ['ATTENDANCE_FIELD_TRACKING'],
      }),
    ).toThrow(
      expect.objectContaining({
        code: 'CAPABILITY_PARENT_REQUIRED',
      }) as CatalogSelectionError,
    );
  });

  it('rejects an add-on without its parent product', () => {
    expect(() =>
      resolveCatalogSelection({
        modules,
        capabilities,
        requestedModuleKeys: ['FIELD_TRACKING'],
        requestedCapabilityKeys: [],
      }),
    ).toThrow(
      expect.objectContaining({
        code: 'ADD_ON_PARENT_REQUIRED',
      }) as CatalogSelectionError,
    );
  });
});
