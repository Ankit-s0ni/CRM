import { AuditService } from './audit.service';
import { TenantContextService } from '../tenancy/public';

describe('AuditService', () => {
  it('removes sensitive values recursively', () => {
    const service = new AuditService(new TenantContextService());
    expect(
      service.sanitize({
        email: 'user@example.com',
        passwordHash: 'hidden',
        nested: { refreshToken: 'hidden', status: 'ACTIVE' },
      }),
    ).toEqual({
      email: 'user@example.com',
      nested: { status: 'ACTIVE' },
    });
  });

  it('attributes audit records from the request context', async () => {
    const context = new TenantContextService();
    const service = new AuditService(context);
    const create: jest.MockedFunction<
      (args: unknown) => Promise<{ id: string }>
    > = jest
      .fn<Promise<{ id: string }>, [unknown]>()
      .mockResolvedValue({ id: 'audit-id' });

    await TenantContextService.run(
      {
        tenantId: 'tenant-id',
        userId: 'user-id',
        requestId: 'request-id',
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent',
      },
      () =>
        service.append({ tenantAuditLog: { create } } as never, {
          tenantId: 'tenant-id',
          action: 'employee.updated',
          module: 'organization',
        }),
    );

    const call = create.mock.calls[0]?.[0] as {
      data: Record<string, unknown>;
    };
    expect(call.data).toMatchObject({
      actorUserId: 'user-id',
      requestId: 'request-id',
      ipAddress: '127.0.0.1',
      userAgent: 'test-agent',
    });
  });
});
