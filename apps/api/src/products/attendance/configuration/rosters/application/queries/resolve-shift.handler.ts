import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Inject, NotFoundException } from '@nestjs/common';
import { ResolveShiftQuery } from './resolve-shift.query';
import { PrismaService } from '../../../../../../shared/database/prisma.service';
import { IRosterRepository } from '../../domain/roster.repository.interface';
import { IShiftRepository } from '../../../shifts/domain/shift.repository.interface';
import { resolveShift, serializeShift } from '../../../attendance-config.rules';

@QueryHandler(ResolveShiftQuery)
export class ResolveShiftHandler implements IQueryHandler<ResolveShiftQuery> {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(IRosterRepository) private readonly rosterRepository: IRosterRepository,
    @Inject(IShiftRepository) private readonly shiftRepository: IShiftRepository,
  ) {}

  async execute(query: ResolveShiftQuery) {
    const { tenantId, employeeId, date } = query;

    return this.prisma.forTenant(async (tx) => {
      const employee = await tx.employee.findUnique({
        where: { id: employeeId },
        include: { defaultShift: true },
      });
      if (!employee || employee.tenantId !== tenantId) throw new NotFoundException('Employee not found');

      const roster = await this.rosterRepository.findByEmployeeAndDate(employeeId, date, tx);
      const flexible = await this.shiftRepository.findFlexibleShift(tenantId, tx);

      const resolution = resolveShift({
        roster: roster?.shift,
        employeeDefault: employee.defaultShift,
        flexible,
      });

      if (!resolution) throw new NotFoundException('Configuration not found');

      return {
        data: serializeShift(resolution.value),
        resolution: { source: resolution.source, rosterId: roster?.id ?? null },
      };
    });
  }
}
