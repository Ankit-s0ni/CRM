import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ConflictException, Inject, NotFoundException } from '@nestjs/common';
import { UpdateShiftCommand } from './update-shift.command';
import { PrismaService } from '../../../../../../shared/database/prisma.service';
import { IShiftRepository } from '../../domain/shift.repository.interface';
import {
  clock,
  isOvernightShift,
  normalizeName,
  timeDate,
  serializeShift,
} from '../../../attendance-config.rules';
import { AuditService } from '../../../../../../platform/audit/public';

@CommandHandler(UpdateShiftCommand)
export class UpdateShiftHandler implements ICommandHandler<UpdateShiftCommand> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    @Inject(IShiftRepository) private readonly shiftRepository: IShiftRepository,
  ) {}

  async execute(command: UpdateShiftCommand) {
    const { id, tenantId, dto, updatedBy } = command;

    return this.prisma.forTenant(async (tx) => {
      const current = await this.shiftRepository.findById(id, tenantId, tx);
      if (!current) throw new NotFoundException('Shift not found');

      const startTime = dto.startTime ?? clock(current.startTime);
      const endTime = dto.endTime ?? clock(current.endTime);
      const name = normalizeName(dto.name ?? current.name);

      const existing = await this.shiftRepository.findByName(name, tenantId, id, tx);
      if (existing) {
        throw new ConflictException({
          code: 'SHIFT_NAME_EXISTS',
          message: 'A shift with this name already exists',
        });
      }

      const shift = await this.shiftRepository.update(id, {
        name,
        startTime: timeDate(startTime),
        endTime: timeDate(endTime),
        isOvernight: isOvernightShift(startTime, endTime),
      }, tx);

      await this.audit.append(tx, {
        tenantId,
        actorUserId: updatedBy,
        action: 'attendance.shift.updated',
        module: 'attendance',
        entityType: 'Shift',
        entityId: id,
        oldValue: current,
        newValue: shift,
      });

      return { data: serializeShift(shift) };
    });
  }
}
