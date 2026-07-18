import { Injectable } from '@nestjs/common';

const ALERT_DEDUPLICATION_MS = 5 * 60_000;

export type OperationalAlert = {
  eventType: string;
  severity: 'warning' | 'critical';
  deduplicationKey: string;
  summary: string;
  attributes?: Record<string, string | number | boolean>;
};

export type AlertDelivery = 'sent' | 'disabled' | 'deduplicated' | 'failed';

@Injectable()
export class ObservabilityAlertService {
  private readonly lastSentAt = new Map<string, number>();

  async notifyServerError(context: { requestId: string; path: string }) {
    return this.notifyOperationalAlert({
      eventType: 'api.server_error',
      severity: 'critical',
      deduplicationKey: `server-error:${context.path}`,
      summary: 'The API returned an unhandled server error.',
      attributes: {
        requestId: context.requestId || 'unknown',
        route: context.path,
      },
    });
  }

  async notifyOperationalAlert(
    alert: OperationalAlert,
  ): Promise<AlertDelivery> {
    const url = process.env.OBSERVABILITY_ALERT_WEBHOOK_URL;
    if (!url?.startsWith('https://')) return 'disabled';

    const key = alert.deduplicationKey;
    const now = Date.now();
    if (now - (this.lastSentAt.get(key) ?? 0) < ALERT_DEDUPLICATION_MS) {
      return 'deduplicated';
    }
    this.lastSentAt.set(key, now);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          eventType: alert.eventType,
          severity: alert.severity,
          service: process.env.OTEL_SERVICE_NAME ?? 'deltcrm-api',
          environment:
            process.env.DEPLOYMENT_ENVIRONMENT ??
            process.env.NODE_ENV ??
            'unknown',
          release: process.env.RELEASE_VERSION ?? 'unknown',
          summary: alert.summary,
          ...alert.attributes,
          occurredAt: new Date(now).toISOString(),
        }),
        signal: AbortSignal.timeout(3_000),
      });
      if (!response.ok) {
        this.lastSentAt.delete(key);
        return 'failed';
      }
      return 'sent';
    } catch {
      // Alert delivery must never alter the API response path; allow retry.
      this.lastSentAt.delete(key);
      return 'failed';
    }
  }
}
