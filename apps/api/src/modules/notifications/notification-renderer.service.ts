import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';

@Injectable()
export class NotificationRendererService {
  render(
    template: {
      subject: string | null;
      bodyTemplate: string;
      requiredVariables: Prisma.JsonValue;
    },
    variables: Record<string, unknown>,
  ) {
    const required = Array.isArray(template.requiredVariables)
      ? template.requiredVariables.filter(
          (value): value is string => typeof value === 'string',
        )
      : [];
    const missing = required.filter(
      (key) => variables[key] === undefined || variables[key] === null,
    );
    if (missing.length) {
      throw new UnprocessableEntityException({
        code: 'NOTIFICATION_TEMPLATE_VARIABLE_MISSING',
        message: 'Notification payload does not satisfy its template',
        details: { missing },
      });
    }
    return {
      subject: template.subject
        ? interpolate(template.subject, variables)
        : null,
      body: interpolate(template.bodyTemplate, variables),
    };
  }
}

function interpolate(value: string, variables: Record<string, unknown>) {
  return value.replace(/{{\s*([a-zA-Z0-9_.-]+)\s*}}/g, (_, key: string) =>
    escapeText(variables[key]),
  );
}

function escapeText(value: unknown) {
  const text =
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
      ? String(value)
      : '';
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
