import { ConflictException, ForbiddenException } from '@nestjs/common';
import { InvitationsService } from './invitations.service';

describe('InvitationsService employee account linking', () => {
  const tenantId = '0197a91c-6fbb-7c65-8c6f-b89f92d4eb42';
  const inviterId = '0197a91c-78a4-7c65-8c6f-b89f92d4eb42';
  const employeeId = '0197a91c-7b32-7c65-8c6f-b89f92d4eb42';
  const roleId = '0197a91c-7fd0-7c65-8c6f-b89f92d4eb42';

  it('stores the selected employee in the signed invitation payload', async () => {
    const tx = transaction();
    const sendInvitation = jest.fn().mockResolvedValue('SENT');
    const service = new InvitationsService(
      {
        forTenant: jest.fn((callback: (client: typeof tx) => unknown) =>
          callback(tx),
        ),
        forAdmin: jest.fn((callback: (client: typeof tx) => unknown) =>
          callback(tx),
        ),
      } as never,
      { tenantId } as never,
      { append: jest.fn() } as never,
      { sendInvitation } as never,
    );

    await service.create(
      { email: 'employee@example.com', roleIds: [roleId], employeeId },
      inviterId,
      false,
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
    expect(sendInvitation).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'employee@example.com',
        workspaceName: 'Acme Logistics',
      }),
    );
  });

  it('rejects an employee that already has an account', async () => {
    const tx = transaction();
    tx.employee.findFirst.mockResolvedValue(null);
    const service = new InvitationsService(
      {
        forTenant: jest.fn((callback: (client: typeof tx) => unknown) =>
          callback(tx),
        ),
        forAdmin: jest.fn((callback: (client: typeof tx) => unknown) =>
          callback(tx),
        ),
      } as never,
      { tenantId } as never,
      { append: jest.fn() } as never,
      { sendInvitation: jest.fn() } as never,
    );

    const promise = service.create(
      { email: 'employee@example.com', roleIds: [roleId], employeeId },
      inviterId,
      false,
    );
    await expect(promise).rejects.toBeInstanceOf(ConflictException);
    await expect(promise).rejects.toMatchObject({
      response: { code: 'EMPLOYEE_ACCOUNT_EXISTS' },
    });
    expect(tx.verificationToken.create).not.toHaveBeenCalled();
  });

  it('rejects elevated-role invitations without role assignment access', async () => {
    const tx = transaction();
    tx.role.findMany.mockResolvedValue([
      { id: roleId, name: 'BUSINESS_ADMIN' },
    ]);
    const service = new InvitationsService(
      {
        forTenant: jest.fn((callback: (client: typeof tx) => unknown) =>
          callback(tx),
        ),
        forAdmin: jest.fn((callback: (client: typeof tx) => unknown) =>
          callback(tx),
        ),
      } as never,
      { tenantId } as never,
      { append: jest.fn() } as never,
      { sendInvitation: jest.fn() } as never,
    );

    const promise = service.create(
      { email: 'admin@example.com', roleIds: [roleId] },
      inviterId,
      false,
    );

    await expect(promise).rejects.toBeInstanceOf(ForbiddenException);
    await expect(promise).rejects.toMatchObject({
      response: { code: 'ROLE_ASSIGNMENT_FORBIDDEN' },
    });
    expect(tx.verificationToken.create).not.toHaveBeenCalled();
  });
});

function transaction() {
  return {
    user: { findFirst: jest.fn().mockResolvedValue(null) },
    role: {
      findMany: jest.fn().mockResolvedValue([{ id: 'role', name: 'EMPLOYEE' }]),
    },
    employee: {
      findFirst: jest.fn().mockResolvedValue({ id: 'employee' }),
    },
    verificationToken: {
      findFirst: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({ id: 'invitation' }),
    },
    tenant: {
      findUnique: jest.fn().mockResolvedValue({
        id: 'tenant-1',
        companyName: 'Acme Logistics',
        subdomain: 'acme',
        settings: { locale: 'en' },
        localePolicy: { defaultLocale: 'en' },
      }),
    },
  };
}
