import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ConflictException, Inject, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { UpdateOfficeCommand } from './update-office.command';
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

@CommandHandler(UpdateOfficeCommand)
export class UpdateOfficeHandler implements ICommandHandler<UpdateOfficeCommand> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    @Inject(IOfficeRepository) private readonly officeRepository: IOfficeRepository,
  ) {}

  async execute(command: UpdateOfficeCommand) {
    const { id, tenantId, dto, updatedBy } = command;

    return this.prisma.forTenant(async (tx) => {
      const current = await this.officeRepository.findBasicById(id, tenantId, tx);
      if (!current) throw new NotFoundException('Office not found');

      const mergedLatitude = dto.latitude ?? Number(current.latitude);
      const mergedLongitude = dto.longitude ?? Number(current.longitude);
      const mergedRadius = dto.radiusMeters ?? current.radiusMeters;
      
      assertCoordinates(mergedLatitude, mergedLongitude, mergedRadius);
      const mergedTimezone = dto.timezone === undefined ? (current.timezone ?? undefined) : dto.timezone;
      if (mergedTimezone) assertTimezone(mergedTimezone);

      const mergedName = normalizeName(dto.officeName ?? current.officeName);
      
      const data: Prisma.OfficeLocationUncheckedUpdateInput = {
        officeName: mergedName,
        latitude: new Prisma.Decimal(mergedLatitude),
        longitude: new Prisma.Decimal(mergedLongitude),
        radiusMeters: mergedRadius,
        timezone: mergedTimezone ?? null,
        egressIps: normalizeNetworkEntries(dto.egressIps ?? (current.egressIps as string[])) as Prisma.InputJsonValue,
        wifiSsids: Array.from(new Set((((dto.wifiSsids ?? (current.wifiSsids as string[])) ?? []) as string[]).map((ssid) => ssid.trim()).filter(Boolean))),
      };

      const existing = await this.officeRepository.findByName(mergedName, tenantId, id, tx);
      if (existing) {
        throw new ConflictException({
          code: 'OFFICE_NAME_EXISTS',
          message: 'An office with this name already exists',
        });
      }

      const office = await this.officeRepository.update(id, data, tx);

      await this.audit.append(tx, {
        tenantId,
        actorUserId: updatedBy,
        action: 'attendance.office.updated',
        module: 'attendance',
        entityType: 'OfficeLocation',
        entityId: office.id,
        oldValue: current,
        newValue: office,
      });

      await bumpRuntimeConfigVersion(tx, tenantId);

      return { data: office };
    });
  }
}
