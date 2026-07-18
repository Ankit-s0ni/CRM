import {
  CallHandler,
  ExecutionContext,
  Inject,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import type { Observable } from 'rxjs';
import { finalize, tap } from 'rxjs';
import { TRACE_RECORDER, type TraceRecorder } from './observability.port';

@Injectable()
export class ObservabilityInterceptor implements NestInterceptor {
  constructor(
    @Inject(TRACE_RECORDER) private readonly traceRecorder: TraceRecorder,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();
    const safeRequest = request as unknown as {
      method: string;
      path: string;
      route?: { path?: unknown };
    };
    const startedAt = performance.now();
    let failed = false;

    return next.handle().pipe(
      tap({ error: () => (failed = true) }),
      finalize(() => {
        this.traceRecorder.record('http.server.request', {
          'http.request.method': safeRequest.method,
          'http.route':
            typeof safeRequest.route?.path === 'string'
              ? safeRequest.route.path
              : safeRequest.path,
          'http.response.status_code': failed ? 500 : response.statusCode,
          'http.server.duration_ms': Math.round(performance.now() - startedAt),
        });
      }),
    );
  }
}
