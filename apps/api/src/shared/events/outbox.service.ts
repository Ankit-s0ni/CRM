import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { PrismaTransaction } from '../database/prisma.service';

export interface OutboxEventInput {
  tenantId?: string;
  eventKey: string;
  payload: Prisma.InputJsonValue;
}

@Injectable()
export class OutboxService {
  append(transaction: PrismaTransaction, event: OutboxEventInput) {
    return transaction.outboxEvent.create({
      data: {
        tenantId: event.tenantId,
        eventKey: event.eventKey,
        payload: event.payload,
      },
    });
  }
}
