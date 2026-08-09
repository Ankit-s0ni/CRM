import type { DynamicModule, ForwardReference, Type } from '@nestjs/common';
import { MODULE_METADATA } from '@nestjs/common/constants';
import { Test } from '@nestjs/testing';
import { HrmsApiModule } from './hrms-api.module';
import { PlatformApiModule } from './platform-api.module';

type ModuleReference =
  | Type<unknown>
  | DynamicModule
  | ForwardReference
  | undefined;

function resolveModuleType(reference: ModuleReference): Type<unknown> | undefined {
  if (!reference) return undefined;
  if (typeof reference === 'function') return reference;
  if ('forwardRef' in reference) {
    return resolveModuleType(reference.forwardRef() as ModuleReference);
  }
  return reference.module;
}

function collectControllerNames(root: Type<unknown>) {
  const visited = new Set<Type<unknown>>();
  const controllers = new Set<string>();

  const visit = (moduleType: Type<unknown>) => {
    if (visited.has(moduleType)) return;
    visited.add(moduleType);

    const moduleControllers =
      (Reflect.getMetadata(MODULE_METADATA.CONTROLLERS, moduleType) as
        | Type<unknown>[]
        | undefined) ?? [];
    for (const controller of moduleControllers) {
      controllers.add(controller.name);
    }

    const imports =
      (Reflect.getMetadata(MODULE_METADATA.IMPORTS, moduleType) as
        | ModuleReference[]
        | undefined) ?? [];
    for (const imported of imports) {
      const importedType = resolveModuleType(imported);
      if (importedType) visit(importedType);
    }
  };

  visit(root);
  return controllers;
}

describe('API composition boundaries', () => {
  it('keeps HRMS controllers out of the Platform API', () => {
    const controllers = collectControllerNames(PlatformApiModule);

    expect(controllers).toContain('PlatformTenantsController');
    expect(controllers).toContain('ProductIntegrationController');
    expect(controllers).not.toContain('EmployeesController');
    expect(controllers).not.toContain('AttendanceRuntimeController');
    expect(controllers).not.toContain('PayrollFoundationController');
  });

  it('keeps login and Platform control-plane controllers out of the HRMS API', () => {
    const controllers = collectControllerNames(HrmsApiModule);

    expect(controllers).toContain('EmployeesController');
    expect(controllers).toContain('AttendanceRuntimeController');
    expect(controllers).toContain('PayrollFoundationController');
    expect(controllers).not.toContain('AuthController');
    expect(controllers).not.toContain('PlatformTenantsController');
    expect(controllers).not.toContain('ProductIntegrationController');
  });

  it.each([
    ['Platform', PlatformApiModule],
    ['HRMS', HrmsApiModule],
  ])('compiles the %s API dependency graph', async (_name, rootModule) => {
    const moduleRef = await Test.createTestingModule({
      imports: [rootModule],
    }).compile();

    await moduleRef.close();
  });
});
