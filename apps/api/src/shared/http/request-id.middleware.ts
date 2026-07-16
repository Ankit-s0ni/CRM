import { Injectable, NestMiddleware } from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { NextFunction, Request, Response } from 'express';

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(request: Request, response: Response, next: NextFunction) {
    const requestId =
      this.readRequestId(request.headers['x-request-id']) ?? randomUUID();

    request.headers['x-request-id'] = requestId;
    response.setHeader('x-request-id', requestId);
    next();
  }

  private readRequestId(value: string | string[] | undefined) {
    const requestId = Array.isArray(value) ? value[0] : value;
    const normalized = requestId?.trim();
    return normalized && normalized.length <= 128 ? normalized : null;
  }
}
