import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { BadRequestException, Inject, NotFoundException } from '@nestjs/common';
import { BulkRostersCommand } from './bulk-rosters.command';
import { PrismaService } from '../../../../../../shared/database/prisma.service';
import { IRosterRepository } from '../../domain/roster.repository.interface';
import { dateOnly, dateRange } from '../../../attendance-config.rules';
import { AuditService } from '../../../../../../platform/audit/public';

@CommandHandler(BulkRostersCommand)
export class BulkRostersHandler implements ICommandHandler<BulkRostersCommand> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    @Inject(IRosterRepository) private readonly rosterRepository: IRosterRepository,
  ) {}

  async execute(command: BulkRostersCommand) {
    const { tenantId, dto, createdBy } = command;

    const start = dateOnly(dto.startDate);
    const end = dateOnly(dto.endDate);
    const days = Math.floor((end.getTime() - start.getTime()) / 86_400_000) + 1;

    if (days < 1 || days > 93) {
      throw new BadRequestException({
        code: 'ROSTER_RANGE_INVALID',
        message: 'Roster range must contain between 1 and 93 days',
      });
    }

    return this.prisma.forTenant(async (tx) => {
      const employees = await tx.employee.findMany({
        where: { id: { in: dto.employeeIds }, status: 'ACTIVE' },
        select: {
          id: true,
          officeAssignments: {
            where: { isPrimary: true },
            select: { officeLocationId: true },
          },
        },
      });

      if (
        employees.length !== dto.employeeIds.length ||
        !(await tx.shift.findUnique({ where: { id: dto.shiftId } }))
      ) {
        throw new NotFoundException('Configuration not found');
      }

      const dates = dateRange(start, end).filter(
        (date) => !dto.weekdays?.length || dto.weekdays.includes(date.getUTCDay()),
      );

      const requested = dto.employeeIds.flatMap((employeeId) =>
        dates.map((rosterDate) => ({
          tenantId,
          employeeId,
          shiftId: dto.shiftId,
          rosterDate,
        })),
      );

      const existing = await this.rosterRepository.findManyByEmployeesAndDateRange(dto.employeeIds, dto.startDate, dto.endDate, tx);

      const key = (employeeId: string, rosterDate: Date) =>
        `${employeeId}:${rosterDate.toISOString().slice(0, 10)}`;
      
      const existingByKey = new Map(
        existing.map((row) => [key(row.employeeId, row.rosterDate), row]),
      );

      const holidays = await tx.tenantHoliday.findMany({
        where: { holidayDate: { gte: start, lte: end } },
        select: { holidayDate: true, officeLocationId: true },
      });

      const tenantHolidayDates = new Set(
        holidays
          .filter(({ officeLocationId }) => officeLocationId === null)
          .map(({ holidayDate }) => holidayDate.toISOString().slice(0, 10)),
      );

      const officeHolidayKeys = new Set(
        holidays
          .filter(({ officeLocationId }) => officeLocationId !== null)
          .map(
            ({ holidayDate, officeLocationId }) =>
              `${officeLocationId}:${holidayDate.toISOString().slice(0, 10)}`,
          ),
      );

      const primaryOfficeByEmployee = new Map(
        employees.map((employee) => [
          employee.id,
          employee.officeAssignments[0]?.officeLocationId,
        ]),
      );

      const errors: Array<{
        employeeId: string;
        rosterDate: string;
        code: string;
      }> = [];

      const inserts = requested.filter((row) => {
        const rosterDate = row.rosterDate.toISOString().slice(0, 10);
        const primaryOffice = primaryOfficeByEmployee.get(row.employeeId);

        if (
          tenantHolidayDates.has(rosterDate) ||
          (primaryOffice && officeHolidayKeys.has(`${primaryOffice}:${rosterDate}`))
        ) {
          errors.push({
            employeeId: row.employeeId,
            rosterDate,
            code: 'ROSTER_HOLIDAY',
          });
          return false;
        }

        const found = existingByKey.get(key(row.employeeId, row.rosterDate));
        if (!found) return true;

        if (found.shiftId !== dto.shiftId) {
          errors.push({
            employeeId: row.employeeId,
            rosterDate: row.rosterDate.toISOString().slice(0, 10),
            code: 'ROSTER_CONFLICT',
          });
        }
        return false;
      });

      if (inserts.length) {
        await this.rosterRepository.createMany({ data: inserts }, tx);
      }

      await this.audit.append(tx, {
        tenantId,
        actorUserId: createdBy,
        action: 'attendance.rosters.bulk_created',
        module: 'attendance',
        entityType: 'EmployeeShiftRoster',
        newValue: { requested: requested.length, inserted: inserts.length, errors },
      });

      return {
        data: {
          requested: requested.length,
          inserted: inserts.length,
          unchanged: requested.length - inserts.length - errors.length,
          errors,
        },
      };
    });
  }
}
