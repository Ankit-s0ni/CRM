import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { PrismaTransaction } from '../database/prisma.service';
import type { PlatformTransaction } from '../database/platform-database.service';

export interface OutboxEventInput {
  tenantId?: string;
  eventKey: string;
  payload: Prisma.InputJsonValue;
}

@Injectable()
export class OutboxService {
  append(
    transaction: PrismaTransaction | PlatformTransaction,
    event: OutboxEventInput,
  ): Promise<unknown> {
    const outboxEvent = transaction.outboxEvent as unknown as {
      create(input: {
        data: {
          tenantId?: string;
          eventKey: string;
          payload: Prisma.InputJsonValue;
        };
      }): Promise<unknown>;
    };
    return outboxEvent.create({
      data: {
        tenantId: event.tenantId,
        eventKey: event.eventKey,
        payload: event.payload,
      },
    });
  }
}
