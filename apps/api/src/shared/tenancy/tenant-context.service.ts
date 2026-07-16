import { Injectable, Scope } from '@nestjs/common';
import { AsyncLocalStorage } from 'async_hooks';

export interface TenantContext {
  tenantId: string;
  userId?: string;
  roleId?: string;
  requestId?: string;
}

@Injectable({ scope: Scope.DEFAULT })
export class TenantContextService {
  private static als = new AsyncLocalStorage<TenantContext>();

  static run<T>(context: TenantContext, callback: () => T): T {
    return this.als.run(context, callback);
  }

  get tenantId(): string | undefined {
    const context = TenantContextService.als.getStore();
    return context?.tenantId;
  }

  get userId(): string | undefined {
    const context = TenantContextService.als.getStore();
    return context?.userId;
  }

  get requestId(): string | undefined {
    return TenantContextService.als.getStore()?.requestId;
  }

  get context(): TenantContext | undefined {
    return TenantContextService.als.getStore();
  }
}
