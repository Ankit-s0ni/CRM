import { Injectable, NestMiddleware } from '@nestjs/common';
import { randomBytes, randomUUID } from 'crypto';
import type { NextFunction, Request, Response } from 'express';

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(request: Request, response: Response, next: NextFunction) {
    const requestId =
      this.readRequestId(request.headers['x-request-id']) ?? randomUUID();
    const traceId =
      this.readTraceId(request.headers['x-trace-id']) ??
      this.readTraceparent(request.headers.traceparent) ??
      randomBytes(16).toString('hex');

    request.headers['x-request-id'] = requestId;
    request.headers['x-trace-id'] = traceId;
    response.setHeader('x-request-id', requestId);
    response.setHeader('x-trace-id', traceId);
    next();
  }

  private readRequestId(value: string | string[] | undefined) {
    const requestId = Array.isArray(value) ? value[0] : value;
    const normalized = requestId?.trim();
    return normalized && normalized.length <= 128 ? normalized : null;
  }

  private readTraceId(value: string | string[] | undefined) {
    const traceId = Array.isArray(value) ? value[0] : value;
    const normalized = traceId?.trim().toLowerCase();
    return normalized &&
      /^[0-9a-f]{32}$/.test(normalized) &&
      !/^0+$/.test(normalized)
      ? normalized
      : null;
  }

  private readTraceparent(value: string | string[] | undefined) {
    const traceparent = Array.isArray(value) ? value[0] : value;
    const match = traceparent
      ?.trim()
      .toLowerCase()
      .match(/^00-([0-9a-f]{32})-[0-9a-f]{16}-[0-9a-f]{2}$/);
    return match?.[1] && !/^0+$/.test(match[1]) ? match[1] : null;
  }
}
