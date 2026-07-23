import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../shared/database/prisma.service';
import { TenantContextService } from '../tenancy/public';
import {
  type EmployeeHistoryCategory,
  EmployeeHistoryQueryDto,
} from './dto/employee-history-query.dto';
import { resolveAccessibleEmployeeIds } from './employee-access';

type HistoryActor = {
  userId: string;
  displayName: string | null;
  email: string;
};

type HistoryChange = {
  field: string;
  from: unknown;
  to: unknown;
};

type HistoryItem = {
  id: string;
  occurredAt: Date;
  effectiveAt: Date | null;
  eventType: string | null;
  category: EmployeeHistoryCategory;
  action: string;
  title: string;
  actorUserId: string | null;
  actor: HistoryActor | null;
  changes: HistoryChange[];
  metadata: unknown;
  requestId: string | null;
  impersonated: boolean;
};

@Injectable()
export class EmployeeHistoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly context: TenantContextService,
  ) {}

  async list(
    employeeId: string,
    userId: string,
    query: EmployeeHistoryQueryDto,
  ) {
    const tenantId = this.requireTenantId();
    const limit = query.limit ?? 25;
    const offset = decodeCursor(query.cursor);
    // Categories are derived from audited action names. Fetch the bounded
    // employee stream before filtering so sparse categories paginate correctly.
    const fetchSize = query.category
      ? 10_001
      : Math.min(offset + limit + 1, 10_001);

    return this.prisma.forTenant(async (tx) => {
      const accessibleIds = await resolveAccessibleEmployeeIds(tx, userId);
      if (accessibleIds && !accessibleIds.includes(employeeId)) this.notFound();

      const employee = await tx.employee.findUnique({
        where: { id: employeeId },
        select: { id: true },
      });
      if (!employee) this.notFound();

      const [auditRows, employmentRows] = await Promise.all([
        tx.tenantAuditLog.findMany({
          where: {
            tenantId,
            OR: [
              { entityId: employeeId },
              {
                newValue: {
                  path: ['employeeId'],
                  equals: employeeId,
                },
              },
              {
                oldValue: {
                  path: ['employeeId'],
                  equals: employeeId,
                },
              },
            ],
          },
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          take: fetchSize,
        }),
        tx.employmentEvent.findMany({
          where: { employeeId },
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          take: fetchSize,
        }),
      ]);

      const actorIds = [
        ...new Set(
          [
            ...auditRows.map(({ actorUserId }) => actorUserId),
            ...employmentRows.map(({ createdBy }) => createdBy),
          ].filter((id): id is string => Boolean(id)),
        ),
      ];
      const actors = actorIds.length
        ? await tx.user.findMany({
            where: { tenantId, id: { in: actorIds } },
            select: {
              id: true,
              email: true,
              employee: { select: { fullName: true } },
            },
          })
        : [];
      const actorById = new Map<string, HistoryActor>(
        actors.map((actor) => [
          actor.id,
          {
            userId: actor.id,
            displayName: actor.employee?.fullName ?? null,
            email: actor.email,
          },
        ]),
      );

      const items: HistoryItem[] = [
        ...auditRows.map((row) => {
          const category = categoryFor(row.action, row.module);
          return {
            id: `audit:${row.id}`,
            occurredAt: row.createdAt,
            effectiveAt: null,
            eventType: null,
            category,
            action: row.action,
            title: titleFor(row.action),
            actorUserId: row.actorUserId,
            actor: row.actorUserId
              ? (actorById.get(row.actorUserId) ?? null)
              : null,
            changes: changesFor(row.oldValue, row.newValue),
            metadata: metadataFor(row.oldValue, row.newValue),
            requestId: row.requestId,
            impersonated: Boolean(row.impersonationSessionId),
          };
        }),
        ...employmentRows.map((row) => ({
          id: `employment:${row.id}`,
          occurredAt: row.createdAt,
          effectiveAt: row.effectiveDate,
          eventType: row.eventType,
          category: 'LIFECYCLE' as const,
          action: `employment.${row.eventType.toLowerCase()}`,
          title: titleFor(`employment.${row.eventType.toLowerCase()}`),
          actorUserId: row.createdBy,
          actor: row.createdBy ? (actorById.get(row.createdBy) ?? null) : null,
          changes: [],
          metadata: row.payload,
          requestId: null,
          impersonated: false,
        })),
      ]
        .filter((item) => !query.category || item.category === query.category)
        .sort(
          (left, right) =>
            right.occurredAt.getTime() - left.occurredAt.getTime() ||
            right.id.localeCompare(left.id),
        );

      const page = items.slice(offset, offset + limit);
      const hasMore = items.length > offset + limit;
      return {
        data: page.map(({ actorUserId, ...item }) => {
          void actorUserId;
          return item;
        }),
        pagination: {
          limit,
          nextCursor: hasMore ? encodeCursor(offset + limit) : null,
          hasMore,
        },
      };
    });
  }

  private requireTenantId() {
    const tenantId = this.context.tenantId;
    if (!tenantId) {
      throw new BadRequestException({
        code: 'WORKSPACE_HEADER_REQUIRED',
        message: 'Workspace header required',
      });
    }
    return tenantId;
  }

  private notFound(): never {
    throw new NotFoundException({
      code: 'EMPLOYEE_NOT_FOUND',
      message: 'Employee not found',
    });
  }
}

function decodeCursor(cursor?: string) {
  if (!cursor) return 0;
  try {
    const value = JSON.parse(
      Buffer.from(cursor, 'base64url').toString('utf8'),
    ) as { offset?: unknown };
    if (
      !Number.isInteger(value.offset) ||
      Number(value.offset) < 0 ||
      Number(value.offset) > 10_000
    ) {
      throw new Error('invalid');
    }
    return Number(value.offset);
  } catch {
    throw new BadRequestException({
      code: 'EMPLOYEE_HISTORY_CURSOR_INVALID',
      message: 'Employee history cursor is invalid or expired',
    });
  }
}

function encodeCursor(offset: number) {
  return Buffer.from(JSON.stringify({ offset })).toString('base64url');
}

function categoryFor(action: string, module: string): EmployeeHistoryCategory {
  const value = `${module}.${action}`.toLowerCase();
  if (/document|attachment/.test(value)) return 'DOCUMENT';
  if (/leave|regularization|exception/.test(value)) return 'LEAVE';
  if (/device|biometric|face|consent/.test(value)) return 'TRUST';
  if (/attendance|punch|checkin|checkout|payroll/.test(value)) {
    return 'ATTENDANCE';
  }
  if (/login|account|role|permission|invite|password/.test(value)) {
    return 'ACCESS';
  }
  if (/security|alert|suspend|block/.test(value)) return 'SECURITY';
  if (
    /assign|policy|office|shift|roster|department|designation|manager/.test(
      value,
    )
  ) {
    return 'ASSIGNMENT';
  }
  if (
    /created|terminated|reactivated|joined|exited|promoted|transferred/.test(
      value,
    )
  ) {
    return 'LIFECYCLE';
  }
  return 'PROFILE';
}

function titleFor(action: string) {
  const explicit: Record<string, string> = {
    'organization.employee-document.created': 'Document uploaded',
    'organization.employee-document.downloaded': 'Document downloaded',
    'organization.employee-document.deleted': 'Document deleted',
    'employment.joined': 'Employee joined',
    'employment.transferred': 'Employee transferred',
    'employment.promoted': 'Employee promoted',
    'employment.exited': 'Employee exited',
  };
  if (explicit[action]) return explicit[action];
  return action
    .split('.')
    .at(-1)!
    .replaceAll('_', ' ')
    .replaceAll('-', ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function changesFor(
  oldValue: Prisma.JsonValue | null,
  newValue: Prisma.JsonValue | null,
): HistoryChange[] {
  const before = record(oldValue);
  const after = record(newValue);
  if (!before && !after) return [];
  const keys = [
    ...new Set([...Object.keys(before ?? {}), ...Object.keys(after ?? {})]),
  ];
  return keys
    .filter((key) => !equal(before?.[key], after?.[key]))
    .slice(0, 20)
    .map((field) => ({
      field,
      from: before?.[field] ?? null,
      to: after?.[field] ?? null,
    }));
}

function metadataFor(
  oldValue: Prisma.JsonValue | null,
  newValue: Prisma.JsonValue | null,
) {
  return newValue ?? oldValue ?? null;
}

function record(value: Prisma.JsonValue | null) {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, Prisma.JsonValue>)
    : null;
}

function equal(left: unknown, right: unknown) {
  return JSON.stringify(left) === JSON.stringify(right);
}
