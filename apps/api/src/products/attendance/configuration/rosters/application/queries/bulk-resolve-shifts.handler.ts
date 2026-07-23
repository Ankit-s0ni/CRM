import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Inject, NotFoundException } from '@nestjs/common';
import { BulkResolveShiftsQuery } from './bulk-resolve-shifts.query';
import { PrismaService } from '../../../../../../shared/database/prisma.service';
import { IRosterRepository } from '../../domain/roster.repository.interface';
import { IShiftRepository } from '../../../shifts/domain/shift.repository.interface';
import { resolveShift, serializeShift } from '../../../attendance-config.rules';

@QueryHandler(BulkResolveShiftsQuery)
export class BulkResolveShiftsHandler implements IQueryHandler<BulkResolveShiftsQuery> {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(IRosterRepository) private readonly rosterRepository: IRosterRepository,
    @Inject(IShiftRepository) private readonly shiftRepository: IShiftRepository,
  ) {}

  async execute(query: BulkResolveShiftsQuery) {
    const { tenantId, employeeIds, date } = query;

    return this.prisma.forTenant(async (tx) => {
      const employees = await tx.employee.findMany({
        where: { id: { in: employeeIds }, status: 'ACTIVE', tenantId },
        include: { defaultShift: true },
      });

      if (employees.length !== new Set(employeeIds).size) {
        throw new NotFoundException('Employee not found');
      }

      const rosters = await this.rosterRepository.findManyByEmployeesAndDate(employeeIds, date, tx);

      const rosterByEmployee = new Map(
        rosters.map((roster) => [roster.employeeId, roster]),
      );

      const flexible = await this.shiftRepository.findFlexibleShift(tenantId, tx);

      return {
        data: employees.map((employee) => {
          const roster = rosterByEmployee.get(employee.id);
          const resolution = resolveShift({
            roster: roster?.shift,
            employeeDefault: employee.defaultShift,
            flexible,
          });

          if (!resolution) throw new NotFoundException('Configuration not found');

          return {
            employeeId: employee.id,
            shift: serializeShift(resolution.value),
            resolution: {
              source: resolution.source,
              rosterId: roster?.id ?? null,
            },
          };
        }),
      };
    });
  }
}
