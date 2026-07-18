import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { resourceFromAttributes } from '@opentelemetry/resources';
import * as Sentry from '@sentry/node';

export interface ObservabilityLifecycle {
  shutdown(): Promise<void>;
}

export function startObservability(
  environment: NodeJS.ProcessEnv = process.env,
): ObservabilityLifecycle {
  if (environment.NODE_ENV !== 'production') {
    return { shutdown: () => Promise.resolve() };
  }

  const release = environment.RELEASE_VERSION!.trim();
  Sentry.init({
    dsn: environment.SENTRY_DSN,
    environment: environment.DEPLOYMENT_ENVIRONMENT ?? 'production',
    release,
    sendDefaultPii: false,
    skipOpenTelemetrySetup: true,
  });

  const sdk = new NodeSDK({
    traceExporter: new OTLPTraceExporter({
      url: environment.OTEL_EXPORTER_OTLP_ENDPOINT,
    }),
    resource: resourceFromAttributes({
      'service.name': environment.OTEL_SERVICE_NAME!.trim(),
      'service.version': release,
      'deployment.environment.name':
        environment.DEPLOYMENT_ENVIRONMENT ?? 'production',
    }),
  });
  sdk.start();

  return {
    shutdown: async () => {
      await Promise.all([sdk.shutdown(), Sentry.close(2_000)]);
    },
  };
}
