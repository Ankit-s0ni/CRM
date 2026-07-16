export const ERROR_REPORTER = Symbol('ERROR_REPORTER');
export const TRACE_RECORDER = Symbol('TRACE_RECORDER');

export interface ErrorReporter {
  captureException(
    error: unknown,
    context: { requestId: string; path: string },
  ): void;
}

export interface TraceRecorder {
  record(
    name: string,
    attributes: Record<string, string | number | boolean>,
  ): void;
}
