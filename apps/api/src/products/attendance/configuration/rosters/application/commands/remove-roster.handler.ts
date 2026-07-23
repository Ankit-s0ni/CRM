import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject, NotFoundException } from '@nestjs/common';
import { RemoveRosterCommand } from './remove-roster.command';
import { PrismaService } from '../../../../../../shared/database/prisma.service';
import { IRosterRepository } from '../../domain/roster.repository.interface';
import { AuditService } from '../../../../../../platform/audit/public';

@CommandHandler(RemoveRosterCommand)
export class RemoveRosterHandler implements ICommandHandler<RemoveRosterCommand> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    @Inject(IRosterRepository) private readonly rosterRepository: IRosterRepository,
  ) {}

  async execute(command: RemoveRosterCommand) {
    const { id, tenantId, deletedBy } = command;

    return this.prisma.forTenant(async (tx) => {
      const roster = await this.rosterRepository.findById(id, tx);
      if (!roster) throw new NotFoundException('Configuration not found');

      await this.rosterRepository.delete(id, tx);

      await this.audit.append(tx, {
        tenantId,
        actorUserId: deletedBy,
        action: 'attendance.roster.deleted',
        module: 'attendance',
        entityType: 'EmployeeShiftRoster',
        entityId: id,
        oldValue: roster,
      });

      return { success: true };
    });
  }
}
