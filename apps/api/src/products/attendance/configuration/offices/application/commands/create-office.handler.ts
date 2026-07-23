import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { ConflictException, Inject } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { CreateOfficeCommand } from './create-office.command';
import { PrismaService } from '../../../../../../shared/database/prisma.service';
import { IOfficeRepository } from '../../domain/office.repository.interface';
import {
  assertCoordinates,
  normalizeName,
  normalizeNetworkEntries,
} from '../../../attendance-config.rules';
import { assertTimezone } from '../../../../../../platform/workspace/public';
import { AuditService } from '../../../../../../platform/audit/public';
import { bumpRuntimeConfigVersion } from '../../../../../../shared/runtime-config/runtime-config-version';

@CommandHandler(CreateOfficeCommand)
export class CreateOfficeHandler implements ICommandHandler<CreateOfficeCommand> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    @Inject(IOfficeRepository) private readonly officeRepository: IOfficeRepository,
  ) {}

  async execute(command: CreateOfficeCommand) {
    const { tenantId, dto, createdBy } = command;

    assertCoordinates(dto.latitude, dto.longitude, dto.radiusMeters);
    if (dto.timezone) assertTimezone(dto.timezone);

    const data: Prisma.OfficeLocationUncheckedCreateInput = {
      tenantId,
      officeName: normalizeName(dto.officeName),
      latitude: new Prisma.Decimal(dto.latitude),
      longitude: new Prisma.Decimal(dto.longitude),
      radiusMeters: dto.radiusMeters,
      timezone: dto.timezone ?? null,
      egressIps: normalizeNetworkEntries(dto.egressIps) as Prisma.InputJsonValue,
      wifiSsids: Array.from(new Set(((dto.wifiSsids ?? []) as string[]).map((ssid) => ssid.trim()).filter(Boolean))),
    };

    return this.prisma.forTenant(async (tx) => {
      const existing = await this.officeRepository.findByName(data.officeName, tenantId, undefined, tx);
      if (existing) {
        throw new ConflictException({
          code: 'OFFICE_NAME_EXISTS',
          message: 'An office with this name already exists',
        });
      }

      const office = await this.officeRepository.create(data, tx);

      await this.audit.append(tx, {
        tenantId,
        actorUserId: createdBy,
        action: 'attendance.office.created',
        module: 'attendance',
        entityType: 'OfficeLocation',
        entityId: office.id,
        newValue: office,
      });

      await bumpRuntimeConfigVersion(tx, tenantId);

      return { data: office };
    });
  }
}
