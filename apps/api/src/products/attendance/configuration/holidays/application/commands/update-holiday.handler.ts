import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ConflictException, Inject, NotFoundException } from '@nestjs/common';
import { UpdateHolidayCommand } from './update-holiday.command';
import { PrismaService } from '../../../../../../shared/database/prisma.service';
import { IHolidayRepository } from '../../domain/holiday.repository.interface';
import { IOfficeRepository } from '../../../offices/domain/office.repository.interface';
import {
  dateOnly,
  normalizeName,
} from '../../../attendance-config.rules';
import { AuditService } from '../../../../../../platform/audit/public';

@CommandHandler(UpdateHolidayCommand)
export class UpdateHolidayHandler implements ICommandHandler<UpdateHolidayCommand> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    @Inject(IHolidayRepository) private readonly holidayRepository: IHolidayRepository,
    @Inject(IOfficeRepository) private readonly officeRepository: IOfficeRepository,
  ) {}

  async execute(command: UpdateHolidayCommand) {
    const { id, tenantId, dto, updatedBy } = command;

    return this.prisma.forTenant(async (tx) => {
      const current = await this.holidayRepository.findById(id, tenantId, tx);
      if (!current) throw new NotFoundException('Configuration not found');

      const officeLocationId =
        dto.officeLocationId === undefined
          ? (current.officeLocationId ?? undefined)
          : dto.officeLocationId;

      if (officeLocationId) {
        const office = await this.officeRepository.findById(officeLocationId, tenantId, tx);
        if (!office) throw new NotFoundException('Office not found');
      }

      const holidayDate =
        dto.holidayDate ?? current.holidayDate.toISOString().slice(0, 10);

      const existing = await this.holidayRepository.findUniqueHoliday(tenantId, holidayDate, officeLocationId, id, tx);
      if (existing) {
        throw new ConflictException({
          code: 'HOLIDAY_EXISTS',
          message: 'A holiday already exists for this date and scope',
        });
      }

      const holiday = await this.holidayRepository.update(id, {
        holidayName: dto.holidayName
          ? normalizeName(dto.holidayName)
          : current.holidayName,
        holidayDate: dateOnly(holidayDate),
        officeLocationId: officeLocationId ?? null,
      }, tx);

      await this.audit.append(tx, {
        tenantId,
        actorUserId: updatedBy,
        action: 'attendance.holiday.updated',
        module: 'attendance',
        entityType: 'TenantHoliday',
        entityId: id,
        oldValue: current,
        newValue: holiday,
      });

      return { data: holiday };
    });
  }
}
