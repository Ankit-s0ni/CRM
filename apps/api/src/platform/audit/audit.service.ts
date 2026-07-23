import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { PrismaTransaction } from '../../shared/database/prisma.service';
import { TenantContextService } from '../tenancy/public';

export type AuditInput = {
  tenantId: string;
  actorUserId?: string;
  action: string;
  module: string;
  entityType?: string;
  entityId?: string;
  oldValue?: unknown;
  newValue?: unknown;
};

export type EmployeeActivityAuditInput = AuditInput & {
  employeeId: string;
};

const SENSITIVE_KEY = /password|token|secret|hash|credential|embedding/i;

@Injectable()
export class AuditService {
  constructor(private readonly tenantContextService: TenantContextService) {}

  append(tx: PrismaTransaction, input: AuditInput) {
    return tx.tenantAuditLog.create({
      data: {
        tenantId: input.tenantId,
        actorUserId:
          input.actorUserId ?? this.tenantContextService.userId ?? null,
        impersonationSessionId:
          this.tenantContextService.context?.impersonationSessionId ?? null,
        action: input.action,
        module: input.module,
        entityType: input.entityType ?? null,
        entityId: input.entityId ?? null,
        oldValue: this.json(input.oldValue),
        newValue: this.json(input.newValue),
        requestId: this.tenantContextService.requestId ?? null,
        ipAddress: this.tenantContextService.context?.ipAddress ?? null,
        userAgent: this.tenantContextService.context?.userAgent ?? null,
      },
    });
  }

  appendEmployeeActivity(
    tx: PrismaTransaction,
    input: EmployeeActivityAuditInput,
  ) {
    const { employeeId, ...audit } = input;
    return this.append(tx, {
      ...audit,
      oldValue:
        audit.oldValue === undefined
          ? undefined
          : this.withEmployeeId(employeeId, audit.oldValue),
      newValue: this.withEmployeeId(employeeId, audit.newValue),
    });
  }

  sanitize(value: unknown): unknown {
    if (value instanceof Date) return value.toISOString();
    if (Prisma.Decimal.isDecimal(value)) return value.toString();
    if (Array.isArray(value)) return value.map((item) => this.sanitize(item));
    if (!value || typeof value !== 'object') return value;
    return Object.fromEntries(
      Object.entries(value)
        .filter(([key]) => !SENSITIVE_KEY.test(key))
        .map(([key, item]) => [key, this.sanitize(item)]),
    );
  }

  private json(value: unknown) {
    if (value === undefined) return undefined;
    return this.sanitize(value) as Prisma.InputJsonValue;
  }

  private withEmployeeId(employeeId: string, value: unknown) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return { ...(value as Record<string, unknown>), employeeId };
    }
    return value === undefined ? { employeeId } : { employeeId, value };
  }
}
