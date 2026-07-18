import { Global, Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { NoopObservabilityAdapter } from './noop-observability.adapter';
import { ERROR_REPORTER, TRACE_RECORDER } from './observability.port';
import { ObservabilityInterceptor } from './observability.interceptor';
import { ProductionObservabilityAdapter } from './production-observability.adapter';
import { ObservabilityAlertService } from './observability-alert.service';

const selectedAdapter =
  process.env.NODE_ENV === 'production'
    ? ProductionObservabilityAdapter
    : NoopObservabilityAdapter;

@Global()
@Module({
  providers: [
    NoopObservabilityAdapter,
    ObservabilityAlertService,
    ProductionObservabilityAdapter,
    {
      provide: ERROR_REPORTER,
      useExisting: selectedAdapter,
    },
    {
      provide: TRACE_RECORDER,
      useExisting: selectedAdapter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: ObservabilityInterceptor,
    },
  ],
  exports: [ERROR_REPORTER, TRACE_RECORDER, ObservabilityAlertService],
})
export class ObservabilityModule {}
