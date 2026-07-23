import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ConflictException, Inject, NotFoundException } from '@nestjs/common';
import { CreateRosterCommand } from './create-roster.command';
import { PrismaService } from '../../../../../../shared/database/prisma.service';
import { IRosterRepository } from '../../domain/roster.repository.interface';
import { dateOnly } from '../../../attendance-config.rules';
import { AuditService } from '../../../../../../platform/audit/public';

@CommandHandler(CreateRosterCommand)
export class CreateRosterHandler implements ICommandHandler<CreateRosterCommand> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    @Inject(IRosterRepository) private readonly rosterRepository: IRosterRepository,
  ) {}

  async execute(command: CreateRosterCommand) {
    const { tenantId, dto, createdBy } = command;

    return this.prisma.forTenant(async (tx) => {
      const [employee, shift] = await Promise.all([
        tx.employee.findUnique({ where: { id: dto.employeeId } }),
        tx.shift.findUnique({ where: { id: dto.shiftId } }),
      ]);

      if (!employee || employee.status !== 'ACTIVE' || !shift) {
        throw new NotFoundException('Configuration not found');
      }

      const primaryOffice = await tx.employeeOfficeAssignment.findFirst({
        where: { employeeId: dto.employeeId, isPrimary: true },
        select: { officeLocationId: true },
      });

      const rosterDate = dateOnly(dto.rosterDate);

      const isHoliday = Boolean(
        await tx.tenantHoliday.findFirst({
          where: {
            holidayDate: rosterDate,
            OR: [
              { officeLocationId: null },
              ...(primaryOffice ? [{ officeLocationId: primaryOffice.officeLocationId }] : []),
            ],
          },
        })
      );

      if (isHoliday) {
        throw new ConflictException({
          code: 'ROSTER_HOLIDAY',
          message: 'A roster cannot be assigned on this employee holiday',
        });
      }

      const existing = await this.rosterRepository.findByEmployeeAndDate(dto.employeeId, dto.rosterDate, tx);
      if (existing) {
        if (existing.shiftId === dto.shiftId) {
          return { data: existing, idempotent: true };
        }
        throw new ConflictException({
          code: 'ROSTER_CONFLICT',
          message: 'Employee already has a roster assignment for this date',
        });
      }

      const roster = await this.rosterRepository.create({
        tenantId,
        employeeId: dto.employeeId,
        shiftId: dto.shiftId,
        rosterDate,
      }, tx);

      await this.audit.append(tx, {
        tenantId,
        actorUserId: createdBy,
        action: 'attendance.roster.created',
        module: 'attendance',
        entityType: 'EmployeeShiftRoster',
        entityId: roster.id,
        newValue: roster,
      });

      return { data: roster };
    });
  }
}
