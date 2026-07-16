import { Injectable } from '@nestjs/common';
import type { ErrorReporter, TraceRecorder } from './observability.port';

@Injectable()
export class NoopObservabilityAdapter implements ErrorReporter, TraceRecorder {
  captureException() {}

  record() {}
}
