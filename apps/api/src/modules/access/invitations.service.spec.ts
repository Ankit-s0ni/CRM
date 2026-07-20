import { ConflictException } from '@nestjs/common';
import { InvitationsService } from './invitations.service';

describe('InvitationsService employee account linking', () => {
  const tenantId = '0197a91c-6fbb-7c65-8c6f-b89f92d4eb42';
  const inviterId = '0197a91c-78a4-7c65-8c6f-b89f92d4eb42';
  const employeeId = '0197a91c-7b32-7c65-8c6f-b89f92d4eb42';
  const roleId = '0197a91c-7fd0-7c65-8c6f-b89f92d4eb42';

  it('stores the selected employee in the signed invitation payload', async () => {
    const tx = transaction();
    const service = new InvitationsService(
      {
        forTenant: jest.fn((callback: (client: typeof tx) => unknown) =>
          callback(tx),
        ),
      } as never,
      { tenantId } as never,
      { append: jest.fn() } as never,
    );

    await service.create(
      { email: 'employee@example.com', roleIds: [roleId], employeeId },
      inviterId,
    );

    expect(tx.employee.findFirst).toHaveBeenCalledWith({
      where: { id: employeeId, tenantId, userId: null },
      select: { id: true },
    });
    expect(tx.verificationToken.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        tenantId,
        email: 'employee@example.com',
        invitedBy: inviterId,
        payload: { tenantId, inviterId, roleIds: [roleId], employeeId },
      }) as unknown,
    });
  });

  it('rejects an employee that already has an account', async () => {
    const tx = transaction();
    tx.employee.findFirst.mockResolvedValue(null);
    const service = new InvitationsService(
      {
        forTenant: jest.fn((callback: (client: typeof tx) => unknown) =>
          callback(tx),
        ),
      } as never,
      { tenantId } as never,
      { append: jest.fn() } as never,
    );

    const promise = service.create(
      { email: 'employee@example.com', roleIds: [roleId], employeeId },
      inviterId,
    );
    await expect(promise).rejects.toBeInstanceOf(ConflictException);
    await expect(promise).rejects.toMatchObject({
      response: { code: 'EMPLOYEE_ACCOUNT_EXISTS' },
    });
    expect(tx.verificationToken.create).not.toHaveBeenCalled();
  });
});

function transaction() {
  return {
    user: { findFirst: jest.fn().mockResolvedValue(null) },
    role: { findMany: jest.fn().mockResolvedValue([{ id: 'role' }]) },
    employee: {
      findFirst: jest.fn().mockResolvedValue({ id: 'employee' }),
    },
    verificationToken: {
      findFirst: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({ id: 'invitation' }),
    },
  };
}
