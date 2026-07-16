import { OutboxService } from './outbox.service';
import type { PrismaTransaction } from '../database/prisma.service';

describe('OutboxService', () => {
  it('writes through the caller transaction', async () => {
    const create = jest.fn().mockResolvedValue({ id: 'event-id' });
    const transaction = {
      outboxEvent: { create },
    } as unknown as PrismaTransaction;
    const service = new OutboxService();

    await service.append(transaction, {
      tenantId: '019f6a51-7d5e-708b-8851-e66c242884f5',
      eventKey: 'organization.employee.created',
      payload: { employeeId: 'employee-id' },
    });

    expect(create).toHaveBeenCalledWith({
      data: {
        tenantId: '019f6a51-7d5e-708b-8851-e66c242884f5',
        eventKey: 'organization.employee.created',
        payload: { employeeId: 'employee-id' },
      },
    });
  });
});
