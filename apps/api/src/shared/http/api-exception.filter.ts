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
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;
    const exceptionBody = this.getExceptionBody(exception);
    const requestId = String(request.headers['x-request-id'] ?? '');

    if (status >= 500) {
      this.errorReporter.captureException(exception, {
        requestId,
        path: request.originalUrl,
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
      [HttpStatus.UNPROCESSABLE_ENTITY]: 'UNPROCESSABLE_ENTITY',
      [HttpStatus.TOO_MANY_REQUESTS]: 'TOO_MANY_REQUESTS',
    };

    return codeByStatus[status] ?? 'INTERNAL_SERVER_ERROR';
  }
}
