import { Injectable } from '@nestjs/common';
import nodemailer, { type Transporter } from 'nodemailer';
import type SMTPTransport from 'nodemailer/lib/smtp-transport';

export type DeliveryResult = {
  providerRef?: string;
  providerCode?: string;
  terminal?: boolean;
};

export interface PushNotificationPort {
  send(input: {
    token: string;
    title: string;
    body: string;
    data: Record<string, string>;
  }): Promise<DeliveryResult>;
}

export interface EmailNotificationPort {
  send(input: {
    email: string;
    subject: string;
    body: string;
    html?: string;
  }): Promise<DeliveryResult>;
}

export const PUSH_NOTIFICATION_PORT = Symbol('PUSH_NOTIFICATION_PORT');
export const EMAIL_NOTIFICATION_PORT = Symbol('EMAIL_NOTIFICATION_PORT');

@Injectable()
export class ConfiguredPushNotificationAdapter implements PushNotificationPort {
  async send(input: {
    token: string;
    title: string;
    body: string;
    data: Record<string, string>;
  }) {
    const endpoint = process.env.FCM_GATEWAY_URL;
    if (!endpoint) return { providerRef: `dev:${input.token.slice(-8)}` };
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${process.env.FCM_GATEWAY_TOKEN ?? ''}`,
      },
      body: JSON.stringify(input),
    });
    const body = (await response.json().catch(() => ({}))) as {
      id?: string;
      code?: string;
    };
    if (!response.ok) {
      const error = new Error(body.code ?? `FCM_${response.status}`);
      Object.assign(error, {
        providerCode: body.code,
        terminal: ['UNREGISTERED', 'INVALID_ARGUMENT'].includes(
          body.code ?? '',
        ),
      });
      throw error;
    }
    return { providerRef: body.id, providerCode: body.code };
  }
}

@Injectable()
export class ConfiguredEmailNotificationAdapter implements EmailNotificationPort {
  private transporter?: Transporter<SMTPTransport.SentMessageInfo>;

  async send(input: {
    email: string;
    subject: string;
    body: string;
    html?: string;
  }) {
    if (process.env.MAIL_PROVIDER === 'smtp' || process.env.SMTP_HOST) {
      return this.sendWithSmtp(input);
    }

    const endpoint = process.env.EMAIL_GATEWAY_URL;
    if (!endpoint) {
      if (process.env.NODE_ENV === 'production') {
        throw new Error('MAIL_PROVIDER_NOT_CONFIGURED');
      }
      return { providerRef: `preview:${input.email}` };
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${process.env.EMAIL_GATEWAY_TOKEN ?? ''}`,
      },
      body: JSON.stringify(input),
    });
    const body = (await response.json().catch(() => ({}))) as {
      id?: string;
      code?: string;
    };
    if (!response.ok) {
      const error = new Error(body.code ?? `EMAIL_${response.status}`);
      Object.assign(error, { providerCode: body.code, terminal: false });
      throw error;
    }
    return { providerRef: body.id, providerCode: body.code };
  }

  private async sendWithSmtp(input: {
    email: string;
    subject: string;
    body: string;
    html?: string;
  }) {
    const username = requireEnvironment('SMTP_USERNAME');
    const result = await this.getTransporter().sendMail({
      from: {
        address: process.env.MAIL_FROM_ADDRESS?.trim() || username,
        name: process.env.MAIL_FROM_NAME?.trim() || 'DeltCRM',
      },
      replyTo: process.env.MAIL_REPLY_TO?.trim() || undefined,
      to: input.email,
      subject: input.subject,
      text: input.body,
      html: input.html,
    });

    return {
      providerRef: result.messageId,
      providerCode: result.response,
    };
  }

  private getTransporter(): Transporter<SMTPTransport.SentMessageInfo> {
    if (this.transporter) return this.transporter;

    const host = requireEnvironment('SMTP_HOST');
    const port = parsePort(process.env.SMTP_PORT);
    const secure = environmentBoolean('SMTP_SECURE', port === 465);

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      requireTLS: environmentBoolean('SMTP_REQUIRE_TLS', port === 587),
      auth: {
        user: requireEnvironment('SMTP_USERNAME'),
        pass: requireEnvironment('SMTP_PASSWORD'),
      },
      tls: {
        servername: host,
        rejectUnauthorized: true,
      },
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 20_000,
    });

    return this.transporter;
  }
}

function requireEnvironment(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name}_NOT_CONFIGURED`);
  return value;
}

function parsePort(value?: string) {
  const port = Number(value ?? '587');
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error('SMTP_PORT_INVALID');
  }
  return port;
}

function environmentBoolean(name: string, fallback: boolean) {
  const value = process.env[name]?.trim().toLowerCase();
  if (!value) return fallback;
  return value === 'true';
}
