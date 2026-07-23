import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ConflictException, Inject } from '@nestjs/common';
import { CreateShiftCommand } from './create-shift.command';
import { PrismaService } from '../../../../../../shared/database/prisma.service';
import { IShiftRepository } from '../../domain/shift.repository.interface';
import {
  isOvernightShift,
  normalizeName,
  timeDate,
  serializeShift,
} from '../../../attendance-config.rules';
import { AuditService } from '../../../../../../platform/audit/public';

@CommandHandler(CreateShiftCommand)
export class CreateShiftHandler implements ICommandHandler<CreateShiftCommand> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    @Inject(IShiftRepository) private readonly shiftRepository: IShiftRepository,
  ) {}

  async execute(command: CreateShiftCommand) {
    const { tenantId, dto, createdBy } = command;
    const isOvernight = isOvernightShift(dto.startTime, dto.endTime);
    const normalizedName = normalizeName(dto.name);

    return this.prisma.forTenant(async (tx) => {
      const existing = await this.shiftRepository.findByName(normalizedName, tenantId, undefined, tx);
      if (existing) {
        throw new ConflictException({
          code: 'SHIFT_NAME_EXISTS',
          message: 'A shift with this name already exists',
        });
      }

      const shift = await this.shiftRepository.create({
        tenantId,
        name: normalizedName,
        startTime: timeDate(dto.startTime),
        endTime: timeDate(dto.endTime),
        isOvernight,
      }, tx);

      await this.audit.append(tx, {
        tenantId,
        actorUserId: createdBy,
        action: 'attendance.shift.created',
        module: 'attendance',
        entityType: 'Shift',
        entityId: shift.id,
        newValue: shift,
      });

      return { data: serializeShift(shift) };
    });
  }
}
