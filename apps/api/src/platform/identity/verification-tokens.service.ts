import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../shared/database/prisma.service';
import { randomBytes, randomInt } from 'crypto';
import { TokenPurpose, Prisma } from '@prisma/client';
import { createHash } from 'crypto';

@Injectable()
export class VerificationTokensService {
  constructor(private readonly prisma: PrismaService) {}

  async createToken(
    tenantId: string,
    email: string,
    purpose: TokenPurpose,
    payload?: Prisma.InputJsonValue,
    userId?: string,
  ) {
    const token =
      purpose === TokenPurpose.EMAIL_VERIFY
        ? `${randomInt(100000, 1000000)}`
        : randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    const tokenHash = this.hashToken(token);

    await this.prisma.forTenant((tx) =>
      tx.verificationToken.create({
        data: {
          tenantId,
          userId: userId ?? null,
          tokenHash,
          purpose,
          email,
          expiresAt,
          payload: payload ? payload : Prisma.JsonNull,
        },
      }),
    );

    return token;
  }

  async consumeToken(token: string, purpose: TokenPurpose) {
    const tokenHash = this.hashToken(token);

    const verificationToken = await this.prisma.forTenant(async (tx) => {
      const candidate = await tx.verificationToken.findFirst({
        where: { tokenHash, purpose, consumedAt: null },
      });

      if (!candidate) {
        throw new BadRequestException('Invalid or expired token');
      }

      if (candidate.expiresAt < new Date()) {
        await tx.verificationToken.updateMany({
          where: { id: candidate.id, consumedAt: null },
          data: { consumedAt: new Date() },
        });
        throw new BadRequestException('Token has expired');
      }

      const claimed = await tx.verificationToken.updateMany({
        where: { id: candidate.id, consumedAt: null },
        data: { consumedAt: new Date() },
      });
      if (claimed.count !== 1) {
        throw new BadRequestException('Invalid or expired token');
      }

      return candidate;
    });

    return verificationToken;
  }

  private hashToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }
}
