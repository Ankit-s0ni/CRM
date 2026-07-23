import { Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';

@Injectable()
export class EmailService {
  private resend = new Resend(process.env.RESEND_API_KEY || 're_mock');
  private logger = new Logger(EmailService.name);

  async sendEmailWithAttachment(to: string, subject: string, body: string, attachment: Buffer, filename: string) {
    if (!process.env.RESEND_API_KEY) {
      this.logger.warn('No RESEND_API_KEY found. Simulating email send.');
      this.logger.log(`Email to ${to} | Subject: ${subject} | Attachment Size: ${attachment.length}`);
      return true;
    }

    try {
      await this.resend.emails.send({
        from: process.env.EMAIL_FROM || 'receipts@yourdomain.com',
        to,
        subject,
        html: `<p>${body}</p>`,
        attachments: [{
          filename,
          content: attachment,
        }]
      });
      return true;
    } catch (err: any) {
      this.logger.error(`Failed to send email: ${err.message}`);
      throw err;
    }
  }
}
