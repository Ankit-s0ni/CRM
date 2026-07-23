import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { EmployeeCreatedEvent } from '../../domain/events/employee-created.event';
import { synchronizeSubscriptionSeats } from '../../../billing/public';
import { PrismaService } from '../../../../shared/database/prisma.service';

@EventsHandler(EmployeeCreatedEvent)
export class SyncBillingOnEmployeeCreatedHandler implements IEventHandler<EmployeeCreatedEvent> {
  constructor(private readonly prisma: PrismaService) {}

  async handle(event: EmployeeCreatedEvent) {
    const { tenantId, employeeId, createdBy } = event;

    // Use $transaction to set the RLS context
    await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.tenant_id', ${tenantId}::text, true)`;
      
      await synchronizeSubscriptionSeats(
        tx,
        tenantId,
        `employee-created:${employeeId}`,
        createdBy,
      );
    });
  }
}
