import { UnauthorizedException } from '@nestjs/common';
import * as argon2 from 'argon2';
import type { PrismaService } from '../../shared/database/prisma.service';
import { AuthService } from './auth.service';

describe('AuthService password change', () => {
  it('verifies the current password, updates the hash and revokes sessions', async () => {
    const passwordHash = await argon2.hash('Current123!');
    const update = jest.fn().mockResolvedValue({});
    const updateMany = jest.fn().mockResolvedValue({ count: 2 });
    const prisma = {
      forTenant: (callback: (tx: unknown) => unknown) =>
        callback({
          user: {
            findUnique: jest
              .fn()
              .mockResolvedValue({ id: 'user-id', passwordHash }),
            update,
          },
          refreshToken: { updateMany },
        }),
    } as unknown as PrismaService;
    const service = new AuthService(
      prisma,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    );

    await expect(
      service.changePassword('user-id', 'Current123!', 'Changed123!'),
    ).resolves.toEqual({ message: 'Password updated successfully' });
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'user-id' },
        data: expect.objectContaining({ passwordChangedAt: expect.any(Date) }),
      }),
    );
    expect(updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'user-id', revokedAt: null },
      }),
    );
  });

  it('rejects an incorrect current password', async () => {
    const passwordHash = await argon2.hash('Current123!');
    const prisma = {
      forTenant: (callback: (tx: unknown) => unknown) =>
        callback({
          user: {
            findUnique: jest
              .fn()
              .mockResolvedValue({ id: 'user-id', passwordHash }),
          },
        }),
    } as unknown as PrismaService;
    const service = new AuthService(
      prisma,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    );

    await expect(
      service.changePassword('user-id', 'Wrong123!', 'Changed123!'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
