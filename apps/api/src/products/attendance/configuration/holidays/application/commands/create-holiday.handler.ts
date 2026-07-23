import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ConflictException, Inject, NotFoundException } from '@nestjs/common';
import { CreateHolidayCommand } from './create-holiday.command';
import { PrismaService } from '../../../../../../shared/database/prisma.service';
import { IHolidayRepository } from '../../domain/holiday.repository.interface';
import { IOfficeRepository } from '../../../offices/domain/office.repository.interface';
import {
  dateOnly,
  normalizeName,
} from '../../../attendance-config.rules';
import { AuditService } from '../../../../../../platform/audit/public';

@CommandHandler(CreateHolidayCommand)
export class CreateHolidayHandler implements ICommandHandler<CreateHolidayCommand> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    @Inject(IHolidayRepository) private readonly holidayRepository: IHolidayRepository,
    @Inject(IOfficeRepository) private readonly officeRepository: IOfficeRepository,
  ) {}

  async execute(command: CreateHolidayCommand) {
    const { tenantId, dto, createdBy } = command;

    return this.prisma.forTenant(async (tx) => {
      if (dto.officeLocationId) {
        const office = await this.officeRepository.findById(dto.officeLocationId, tenantId, tx);
        if (!office) throw new NotFoundException('Office not found');
      }

      const existing = await this.holidayRepository.findUniqueHoliday(tenantId, dto.holidayDate, dto.officeLocationId, undefined, tx);
      if (existing) {
        throw new ConflictException({
          code: 'HOLIDAY_EXISTS',
          message: 'A holiday already exists for this date and scope',
        });
      }

      const holiday = await this.holidayRepository.create({
        tenantId,
        holidayName: normalizeName(dto.holidayName),
        holidayDate: dateOnly(dto.holidayDate),
        officeLocationId: dto.officeLocationId ?? null,
      }, tx);

      await this.audit.append(tx, {
        tenantId,
        actorUserId: createdBy,
        action: 'attendance.holiday.created',
        module: 'attendance',
        entityType: 'TenantHoliday',
        entityId: holiday.id,
        newValue: holiday,
      });

      return { data: holiday };
    });
  }
}
