import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  EMAIL_NOTIFICATION_PORT,
  type EmailNotificationPort,
} from './notification-provider.port';
import type {
  TransactionalEmailContext,
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
    return this.deliver(
      email,
      'Verify your DeltCRM workspace',
      `Your DeltCRM verification code is ${code}. It expires in 24 hours. If you did not create this workspace, ignore this email.`,
      messageLayout({
        direction: 'ltr',
        eyebrow: 'Workspace security',
        title: 'Verify your DeltCRM workspace',
        paragraphs: [
          'Use the verification code below to continue.',
          'This code expires in 24 hours. If you did not create this workspace, you can ignore this email.',
        ],
        code,
      }),
      'verification',
    );
  }

  async sendPasswordReset(
    input: TransactionalEmailContext & { resetUrl: string },
  ): Promise<TransactionalEmailDelivery> {
    const arabic = isArabic(input.locale);
    const subject = arabic
      ? `إعادة تعيين كلمة مرور ${input.workspaceName}`
      : `Reset your ${input.workspaceName} password`;
    const body = arabic
      ? `تم طلب إعادة تعيين كلمة مرور حسابك في ${input.workspaceName}. افتح الرابط التالي خلال 24 ساعة: ${input.resetUrl}\n\nإذا لم تطلب ذلك، فتجاهل هذه الرسالة.`
      : `A password reset was requested for your ${input.workspaceName} account. Open this link within 24 hours: ${input.resetUrl}\n\nIf you did not request this, ignore this email.`;

    return this.deliver(
      input.email,
      subject,
      body,
      messageLayout({
        direction: arabic ? 'rtl' : 'ltr',
        eyebrow: arabic ? 'أمان الحساب' : 'Account security',
        title: arabic ? 'إعادة تعيين كلمة المرور' : 'Reset your password',
        paragraphs: arabic
          ? [
              `تلقينا طلباً لإعادة تعيين كلمة مرور حسابك في ${input.workspaceName}.`,
              'تنتهي صلاحية هذا الرابط خلال 24 ساعة ويمكن استخدامه مرة واحدة فقط.',
              'إذا لم تطلب إعادة تعيين كلمة المرور، فتجاهل هذه الرسالة.',
            ]
          : [
              `We received a request to reset the password for your ${input.workspaceName} account.`,
              'This link expires in 24 hours and can be used only once.',
              'If you did not request a password reset, you can ignore this email.',
            ],
        action: {
          label: arabic ? 'إعادة تعيين كلمة المرور' : 'Reset password',
          url: input.resetUrl,
        },
      }),
      'password reset',
    );
  }

  async sendPasswordChanged(
    input: TransactionalEmailContext,
  ): Promise<TransactionalEmailDelivery> {
    const arabic = isArabic(input.locale);
    return this.deliver(
      input.email,
      arabic
        ? `تم تغيير كلمة مرور ${input.workspaceName}`
        : `Your ${input.workspaceName} password was changed`,
      arabic
        ? `تم تغيير كلمة مرور حسابك في ${input.workspaceName}. إذا لم تقم بهذا التغيير، فتواصل مع مسؤول مساحة العمل فوراً.`
        : `The password for your ${input.workspaceName} account was changed. If you did not make this change, contact your workspace administrator immediately.`,
      messageLayout({
        direction: arabic ? 'rtl' : 'ltr',
        eyebrow: arabic ? 'تنبيه أمني' : 'Security notice',
        title: arabic ? 'تم تغيير كلمة المرور' : 'Your password was changed',
        paragraphs: arabic
          ? [
              `تم تغيير كلمة مرور حسابك في ${input.workspaceName}.`,
              'إذا لم تقم بهذا التغيير، فتواصل مع مسؤول مساحة العمل فوراً.',
            ]
          : [
              `The password for your ${input.workspaceName} account was changed successfully.`,
              'If you did not make this change, contact your workspace administrator immediately.',
            ],
      }),
      'password change confirmation',
    );
  }

  async sendInvitation(
    input: TransactionalEmailContext & { invitationUrl: string },
  ): Promise<TransactionalEmailDelivery> {
    const arabic = isArabic(input.locale);
    return this.deliver(
      input.email,
      arabic
        ? `دعوة للانضمام إلى ${input.workspaceName}`
        : `You are invited to ${input.workspaceName}`,
      arabic
        ? `تمت دعوتك للانضمام إلى ${input.workspaceName} على DeltCRM. افتح الرابط التالي خلال 24 ساعة لإعداد حسابك: ${input.invitationUrl}`
        : `You have been invited to join ${input.workspaceName} on DeltCRM. Open this link within 24 hours to set up your account: ${input.invitationUrl}`,
      messageLayout({
        direction: arabic ? 'rtl' : 'ltr',
        eyebrow: arabic ? 'دعوة مساحة العمل' : 'Workspace invitation',
        title: arabic
          ? `انضم إلى ${input.workspaceName}`
          : `Join ${input.workspaceName}`,
        paragraphs: arabic
          ? [
              'تم إنشاء حساب لك على DeltCRM.',
              'استخدم الزر أدناه لإنشاء كلمة المرور. تنتهي صلاحية الدعوة خلال 24 ساعة ويمكن استخدامها مرة واحدة فقط.',
            ]
          : [
              'An account has been prepared for you on DeltCRM.',
              'Use the button below to create your password. This invitation expires in 24 hours and can be used only once.',
            ],
        action: {
          label: arabic ? 'إعداد الحساب' : 'Set up account',
          url: input.invitationUrl,
        },
      }),
      'invitation',
    );
  }

  private async deliver(
    email: string,
    subject: string,
    body: string,
    html: string,
    description: string,
  ): Promise<TransactionalEmailDelivery> {
    try {
      await this.email.send({
        email,
        subject,
        body,
        html,
      });
      return 'SENT';
    } catch (error) {
      this.logger.error(
        `${description} email delivery failed for ${maskEmail(email)}`,
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

function isArabic(locale?: string) {
  return locale?.toLowerCase().startsWith('ar') ?? false;
}

function messageLayout(input: {
  direction: 'ltr' | 'rtl';
  eyebrow: string;
  title: string;
  paragraphs: string[];
  action?: { label: string; url: string };
  code?: string;
}) {
  const align = input.direction === 'rtl' ? 'right' : 'left';
  const paragraphs = input.paragraphs
    .map(
      (paragraph) =>
        `<p style="margin:0 0 16px;color:#4b5563;font-size:15px;line-height:1.7">${escapeHtml(paragraph)}</p>`,
    )
    .join('');
  const action = input.action
    ? `<p style="margin:28px 0"><a href="${escapeHtml(input.action.url)}" style="display:inline-block;border-radius:8px;background:#0f766e;color:#ffffff;padding:13px 22px;text-decoration:none;font-weight:700">${escapeHtml(input.action.label)}</a></p>`
    : '';
  const code = input.code
    ? `<div style="margin:24px 0;border-radius:8px;background:#f3f4f6;padding:18px;text-align:center;font-size:28px;font-weight:800;letter-spacing:6px;color:#111827">${escapeHtml(input.code)}</div>`
    : '';

  return `<!doctype html>
<html lang="${input.direction === 'rtl' ? 'ar' : 'en'}" dir="${input.direction}">
  <body style="margin:0;background:#f3f4f6;font-family:Arial,'Noto Sans Arabic',sans-serif">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f3f4f6;padding:32px 16px">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;border:1px solid #e5e7eb;border-radius:12px;background:#ffffff">
            <tr>
              <td style="padding:32px;text-align:${align}">
                <div style="margin-bottom:24px;font-size:20px;font-weight:800;color:#111827">DeltCRM</div>
                <div style="margin-bottom:8px;color:#0f766e;font-size:12px;font-weight:800;letter-spacing:1.5px;text-transform:uppercase">${escapeHtml(input.eyebrow)}</div>
                <h1 style="margin:0 0 20px;color:#111827;font-size:26px;line-height:1.3">${escapeHtml(input.title)}</h1>
                ${paragraphs}
                ${code}
                ${action}
                <p style="margin:28px 0 0;border-top:1px solid #e5e7eb;padding-top:18px;color:#9ca3af;font-size:12px;line-height:1.6">DeltCRM</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function escapeHtml(value: string) {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;',
      })[character] ?? character,
  );
}
