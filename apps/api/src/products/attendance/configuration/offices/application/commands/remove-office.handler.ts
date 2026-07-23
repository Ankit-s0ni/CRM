import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ConflictException, Inject, NotFoundException } from '@nestjs/common';
import { RemoveOfficeCommand } from './remove-office.command';
import { PrismaService } from '../../../../../../shared/database/prisma.service';
import { IOfficeRepository } from '../../domain/office.repository.interface';
import { AuditService } from '../../../../../../platform/audit/public';
import { bumpRuntimeConfigVersion } from '../../../../../../shared/runtime-config/runtime-config-version';

@CommandHandler(RemoveOfficeCommand)
export class RemoveOfficeHandler implements ICommandHandler<RemoveOfficeCommand> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    @Inject(IOfficeRepository) private readonly officeRepository: IOfficeRepository,
  ) {}

  async execute(command: RemoveOfficeCommand) {
    const { id, tenantId, removedBy } = command;

    return this.prisma.forTenant(async (tx) => {
      const office = await this.officeRepository.findBasicById(id, tenantId, tx);
      if (!office) throw new NotFoundException('Office not found');

      const attendanceEvidence = await this.officeRepository.countVerificationLogs(id, tx);
      
      if (
        (office._count?.assignments || 0) > 0 ||
        (office._count?.holidays || 0) > 0 ||
        attendanceEvidence > 0
      ) {
        throw new ConflictException({
          code: 'OFFICE_IN_USE',
          message: 'Office cannot be deleted while assignments or holidays reference it',
        });
      }

      await this.officeRepository.delete(id, tx);

      await this.audit.append(tx, {
        tenantId,
        actorUserId: removedBy,
        action: 'attendance.office.deleted',
        module: 'attendance',
        entityType: 'OfficeLocation',
        entityId: id,
        oldValue: office,
      });

      await bumpRuntimeConfigVersion(tx, tenantId);

      return { success: true };
    });
  }
}
