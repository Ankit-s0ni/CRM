import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { BadRequestException, Inject, NotFoundException } from '@nestjs/common';
import { ReplaceOfficeEmployeesCommand } from './replace-office-employees.command';
import { PrismaService } from '../../../../../../shared/database/prisma.service';
import { IOfficeRepository } from '../../domain/office.repository.interface';
import { AuditService } from '../../../../../../platform/audit/public';

@CommandHandler(ReplaceOfficeEmployeesCommand)
export class ReplaceOfficeEmployeesHandler implements ICommandHandler<ReplaceOfficeEmployeesCommand> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    @Inject(IOfficeRepository) private readonly officeRepository: IOfficeRepository,
  ) {}

  async execute(command: ReplaceOfficeEmployeesCommand) {
    const { officeId, tenantId, dto, replacedBy } = command;

    const primary = new Set(dto.primaryEmployeeIds ?? []);
    if ([...primary].some((employeeId) => !dto.employeeIds.includes(employeeId))) {
      throw new BadRequestException({
        code: 'OFFICE_ASSIGNMENT_INVALID',
        message: 'Primary employees must be included in employeeIds',
      });
    }

    return this.prisma.forTenant(async (tx) => {
      const office = await this.officeRepository.findBasicById(officeId, tenantId, tx);
      if (!office) throw new NotFoundException('Office not found');

      const employees = await tx.employee.findMany({
        where: { id: { in: dto.employeeIds }, status: 'ACTIVE', tenantId },
        select: { id: true },
      });
      if (employees.length !== dto.employeeIds.length) {
        throw new NotFoundException('Employee not found');
      }

      const oldValue = await this.officeRepository.findAssignmentsByOffice(officeId, tenantId, tx);
      
      await this.officeRepository.deleteAssignmentsByOffice(officeId, tenantId, tx);

      if (dto.employeeIds.length) {
        const createData = dto.employeeIds.map((employeeId) => ({
          tenantId,
          employeeId,
          officeLocationId: officeId,
          isPrimary: primary.has(employeeId),
        }));
        await this.officeRepository.createAssignments(createData, tx);
      }

      const assignments = await this.officeRepository.findAssignmentsByOffice(officeId, tenantId, tx);

      await this.audit.append(tx, {
        tenantId,
        actorUserId: replacedBy,
        action: 'attendance.office.assignments.replaced',
        module: 'attendance',
        entityType: 'OfficeLocation',
        entityId: officeId,
        oldValue: { assignments: oldValue },
        newValue: { assignments },
      });

      return { data: assignments };
    });
  }
}
