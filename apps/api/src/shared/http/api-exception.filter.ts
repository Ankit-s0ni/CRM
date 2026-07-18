import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Inject,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import {
  ERROR_REPORTER,
  type ErrorReporter,
} from '../observability/observability.port';

interface ExceptionBody {
  code?: string;
  message?: string | string[];
  details?: unknown;
}

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  constructor(
    @Inject(ERROR_REPORTER) private readonly errorReporter: ErrorReporter,
  ) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const context = host.switchToHttp();
    const request = context.getRequest<Request>();
    const response = context.getResponse<Response>();
    const status: number =
      exception instanceof HttpException
        ? exception.getStatus()
        : (numericStatus(exception) ?? HttpStatus.INTERNAL_SERVER_ERROR);
    const exceptionBody = this.getExceptionBody(exception);
    const requestId = String(request.headers['x-request-id'] ?? '');
    if (
      status === 429 &&
      typeof exceptionBody.details === 'object' &&
      exceptionBody.details &&
      'retryAfterSeconds' in exceptionBody.details
    ) {
      response.setHeader(
        'Retry-After',
        String(exceptionBody.details.retryAfterSeconds),
      );
    }

    if (status >= 500) {
      this.errorReporter.captureException(exception, {
        requestId,
        path: safeRequestPath(request),
      });
    }

    response.status(status).json({
      statusCode: status,
      code: exceptionBody.code ?? this.defaultCode(status),
      message: this.message(exceptionBody.message, status),
      ...(exceptionBody.details === undefined
        ? {}
        : { details: exceptionBody.details }),
      requestId,
      path: request.originalUrl,
      timestamp: new Date().toISOString(),
    });
  }

  private getExceptionBody(exception: unknown): ExceptionBody {
    if (!(exception instanceof HttpException)) {
      return {};
    }

    const response = exception.getResponse();
    return typeof response === 'string' ? { message: response } : response;
  }

  private message(message: string | string[] | undefined, status: number) {
    if (Array.isArray(message)) {
      return message[0] ?? 'Request failed';
    }

    if (message) {
      return message;
    }

    return status === 500 ? 'An unexpected error occurred' : 'Request failed';
  }

  private defaultCode(status: number) {
    const codeByStatus: Record<number, string> = {
      [HttpStatus.BAD_REQUEST]: 'BAD_REQUEST',
      [HttpStatus.UNAUTHORIZED]: 'UNAUTHORIZED',
      [HttpStatus.FORBIDDEN]: 'FORBIDDEN',
      [HttpStatus.NOT_FOUND]: 'NOT_FOUND',
      [HttpStatus.CONFLICT]: 'CONFLICT',
      [HttpStatus.PAYLOAD_TOO_LARGE]: 'PING_BATCH_TOO_LARGE',
      [HttpStatus.UNPROCESSABLE_ENTITY]: 'UNPROCESSABLE_ENTITY',
      [HttpStatus.TOO_MANY_REQUESTS]: 'TOO_MANY_REQUESTS',
    };

    return codeByStatus[status] ?? 'INTERNAL_SERVER_ERROR';
  }
}

function safeRequestPath(request: Request) {
  const route = request.route as { path?: unknown } | undefined;
  if (typeof route?.path === 'string') {
    return `${request.baseUrl}${route.path}` || '/';
  }
  return request.path
    .replace(
      /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/gi,
      ':id',
    )
    .replace(/\b\d+\b/g, ':number');
}

function numericStatus(exception: unknown) {
  if (!exception || typeof exception !== 'object') return undefined;
  const value = 'status' in exception ? exception.status : undefined;
  return typeof value === 'number' && value >= 400 && value < 600
    ? value
    : undefined;
}
