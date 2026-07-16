import { Global, Module } from '@nestjs/common';
import { NoopObservabilityAdapter } from './noop-observability.adapter';
import { ERROR_REPORTER, TRACE_RECORDER } from './observability.port';

@Global()
@Module({
  providers: [
    NoopObservabilityAdapter,
    {
      provide: ERROR_REPORTER,
      useExisting: NoopObservabilityAdapter,
    },
    {
      provide: TRACE_RECORDER,
      useExisting: NoopObservabilityAdapter,
    },
  ],
  exports: [ERROR_REPORTER, TRACE_RECORDER],
})
export class ObservabilityModule {}
