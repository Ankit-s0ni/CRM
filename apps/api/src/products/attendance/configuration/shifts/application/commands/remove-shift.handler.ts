import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ConflictException, Inject, NotFoundException } from '@nestjs/common';
import { RemoveShiftCommand } from './remove-shift.command';
import { PrismaService } from '../../../../../../shared/database/prisma.service';
import { IShiftRepository } from '../../domain/shift.repository.interface';
import { AuditService } from '../../../../../../platform/audit/public';

@CommandHandler(RemoveShiftCommand)
export class RemoveShiftHandler implements ICommandHandler<RemoveShiftCommand> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    @Inject(IShiftRepository) private readonly shiftRepository: IShiftRepository,
  ) {}

  async execute(command: RemoveShiftCommand) {
    const { id, tenantId, deletedBy } = command;

    return this.prisma.forTenant(async (tx) => {
      const shift = await this.shiftRepository.findByIdWithCounts(id, tenantId, tx);
      if (!shift) throw new NotFoundException('Shift not found');

      if (
        shift._count.rosters ||
        shift._count.defaultFor ||
        shift._count.appliedLogs
      ) {
        throw new ConflictException({
          code: 'SHIFT_IN_USE',
          message: 'Shift cannot be deleted while employees or rosters reference it',
        });
      }

      await this.shiftRepository.delete(id, tx);

      await this.audit.append(tx, {
        tenantId,
        actorUserId: deletedBy,
        action: 'attendance.shift.deleted',
        module: 'attendance',
        entityType: 'Shift',
        entityId: id,
        oldValue: shift,
      });

      return { success: true };
    });
  }
}
