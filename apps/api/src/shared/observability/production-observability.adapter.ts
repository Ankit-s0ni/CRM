import { Injectable } from '@nestjs/common';
import { trace } from '@opentelemetry/api';
import * as Sentry from '@sentry/node';
import type { ErrorReporter, TraceRecorder } from './observability.port';
import { ObservabilityAlertService } from './observability-alert.service';

@Injectable()
export class ProductionObservabilityAdapter
  implements ErrorReporter, TraceRecorder
{
  constructor(private readonly alerts: ObservabilityAlertService) {}

  captureException(
    error: unknown,
    context: { requestId: string; path: string },
  ) {
    Sentry.withScope((scope) => {
      scope.setTag('request_id', context.requestId || 'unknown');
      scope.setTag('request_path', context.path);
      Sentry.captureException(error);
    });
    void this.alerts.notifyServerError(context);
  }

  record(name: string, attributes: Record<string, string | number | boolean>) {
    const span = trace.getTracer('deltcrm-api').startSpan(name, { attributes });
    span.end();
  }
}
