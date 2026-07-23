import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject, NotFoundException } from '@nestjs/common';
import { RemoveHolidayCommand } from './remove-holiday.command';
import { PrismaService } from '../../../../../../shared/database/prisma.service';
import { IHolidayRepository } from '../../domain/holiday.repository.interface';
import { AuditService } from '../../../../../../platform/audit/public';

@CommandHandler(RemoveHolidayCommand)
export class RemoveHolidayHandler implements ICommandHandler<RemoveHolidayCommand> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    @Inject(IHolidayRepository) private readonly holidayRepository: IHolidayRepository,
  ) {}

  async execute(command: RemoveHolidayCommand) {
    const { id, tenantId, deletedBy } = command;

    return this.prisma.forTenant(async (tx) => {
      const holiday = await this.holidayRepository.findById(id, tenantId, tx);
      if (!holiday) throw new NotFoundException('Configuration not found');

      await this.holidayRepository.delete(id, tx);

      await this.audit.append(tx, {
        tenantId,
        actorUserId: deletedBy,
        action: 'attendance.holiday.deleted',
        module: 'attendance',
        entityType: 'TenantHoliday',
        entityId: id,
        oldValue: holiday,
      });

      return { success: true };
    });
  }
}
