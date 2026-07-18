import { randomUUID } from 'node:crypto';
import * as Sentry from '@sentry/node';
import { trace } from '@opentelemetry/api';
import { startObservability } from '../src/shared/observability/observability-bootstrap';
import { ObservabilityAlertService } from '../src/shared/observability/observability-alert.service';

const required = [
  'SENTRY_DSN',
  'OTEL_EXPORTER_OTLP_ENDPOINT',
  'OTEL_SERVICE_NAME',
  'RELEASE_VERSION',
  'OBSERVABILITY_ALERT_WEBHOOK_URL',
] as const;

async function main() {
  for (const name of required) {
    if (!process.env[name]?.trim()) throw new Error(`${name} is required`);
  }
  if (process.env.NODE_ENV !== 'production') {
    throw new Error(
      'NODE_ENV=production is required so real exporters are exercised',
    );
  }

  const drillId = randomUUID();
  const observability = startObservability();
  try {
    Sentry.captureMessage(`DeltCRM GA observability drill ${drillId}`, {
      level: 'warning',
      tags: { drill_id: drillId, drill_type: 'sprint8-ga' },
    });

    const tracer = trace.getTracer('deltcrm-ga-drill');
    tracer.startActiveSpan('ga.observability_drill', (span) => {
      span.setAttribute('deltcrm.drill_id', drillId);
      span.setAttribute(
        'deployment.environment.name',
        process.env.DEPLOYMENT_ENVIRONMENT ?? 'production',
      );
      span.end();
    });

    const delivery =
      await new ObservabilityAlertService().notifyOperationalAlert({
        eventType: 'ga.observability_drill',
        severity: 'warning',
        deduplicationKey: `ga-drill:${drillId}`,
        summary: 'Synthetic Sprint 8 GA observability routing drill.',
        attributes: { drillId },
      });
    if (delivery !== 'sent')
      throw new Error(`Alert webhook delivery was ${delivery}`);

    console.log(
      JSON.stringify({
        drillId,
        alertDelivery: delivery,
        sentAt: new Date().toISOString(),
      }),
    );
    console.log(
      'Verify this drill ID in Sentry, the OTel backend, and the on-call destination before marking the monitoring gate PASS.',
    );
  } finally {
    await observability.shutdown();
  }
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
