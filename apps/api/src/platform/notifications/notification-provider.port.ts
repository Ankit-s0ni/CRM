import { Injectable } from '@nestjs/common';

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
  async send(input: { email: string; subject: string; body: string }) {
    const endpoint = process.env.EMAIL_GATEWAY_URL;
    if (!endpoint) return { providerRef: `dev:${input.email}` };
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
}
