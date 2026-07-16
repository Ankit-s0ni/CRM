import { AuditService } from './audit.service';
import { TenantContextService } from '../tenancy/tenant-context.service';

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
});
