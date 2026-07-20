import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  EMAIL_NOTIFICATION_PORT,
  type EmailNotificationPort,
} from './notification-provider.port';
import type {
  TransactionalEmailDelivery,
  TransactionalEmailPort,
} from './application/transactional-email.port';

@Injectable()
export class TransactionalEmailService implements TransactionalEmailPort {
  private readonly logger = new Logger(TransactionalEmailService.name);

  constructor(
    @Inject(EMAIL_NOTIFICATION_PORT)
    private readonly email: EmailNotificationPort,
  ) {}

  async sendVerificationCode(
    email: string,
    code: string,
  ): Promise<TransactionalEmailDelivery> {
    try {
      await this.email.send({
        email,
        subject: 'Verify your DeltCRM workspace',
        body: `Your DeltCRM verification code is ${code}. It expires in 24 hours. If you did not create this workspace, ignore this email.`,
      });
      return 'SENT';
    } catch (error) {
      this.logger.error(
        `Verification email delivery failed for ${maskEmail(email)}`,
        error instanceof Error ? error.stack : String(error),
      );
      return 'FAILED';
    }
  }
}

function maskEmail(email: string) {
  const [local, domain] = email.split('@');
  return `${local?.slice(0, 2) ?? '**'}***@${domain ?? 'unknown'}`;
}
