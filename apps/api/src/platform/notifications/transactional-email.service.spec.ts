import type { EmailNotificationPort } from './notification-provider.port';
import { TransactionalEmailService } from './transactional-email.service';

describe('TransactionalEmailService', () => {
  it('uses DeltCRM branding and reports successful delivery', async () => {
    const send: jest.MockedFunction<EmailNotificationPort['send']> = jest
      .fn()
      .mockResolvedValue({ providerRef: 'email-1' });
    const service = new TransactionalEmailService({ send });

    await expect(
      service.sendVerificationCode('owner@acme.com', '123456'),
    ).resolves.toBe('SENT');
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'owner@acme.com',
        subject: 'Verify your DeltCRM workspace',
        body: 'Your DeltCRM verification code is 123456. It expires in 24 hours. If you did not create this workspace, ignore this email.',
        html: expect.stringContaining('123456') as unknown,
      }),
    );
  });

  it('returns a recoverable delivery status without exposing the code', async () => {
    const send: jest.MockedFunction<EmailNotificationPort['send']> = jest
      .fn()
      .mockRejectedValue(new Error('gateway unavailable'));
    const service = new TransactionalEmailService({ send });

    await expect(
      service.sendVerificationCode('owner@acme.com', '654321'),
    ).resolves.toBe('FAILED');
  });

  it('renders a tenant password-reset action in both email formats', async () => {
    const send: jest.MockedFunction<EmailNotificationPort['send']> = jest
      .fn()
      .mockResolvedValue({ providerRef: 'email-2' });
    const service = new TransactionalEmailService({ send });

    await expect(
      service.sendPasswordReset({
        email: 'owner@acme.com',
        workspaceName: 'Acme Logistics',
        resetUrl: 'https://acme.example.com/forgot-password?token=secret',
        locale: 'en',
      }),
    ).resolves.toBe('SENT');

    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'owner@acme.com',
        subject: 'Reset your Acme Logistics password',
        body: expect.stringContaining(
          'https://acme.example.com/forgot-password?token=secret',
        ) as unknown,
        html: expect.stringContaining('Reset password') as unknown,
      }),
    );
  });

  it('renders Arabic invitations with an RTL document', async () => {
    const send: jest.MockedFunction<EmailNotificationPort['send']> = jest
      .fn()
      .mockResolvedValue({ providerRef: 'email-3' });
    const service = new TransactionalEmailService({ send });

    await service.sendInvitation({
      email: 'employee@acme.com',
      workspaceName: 'Acme Logistics',
      invitationUrl: 'https://acme.example.com/accept-invitation?token=secret',
      locale: 'ar-OM',
    });

    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        html: expect.stringContaining('dir="rtl"') as unknown,
      }),
    );
  });
});
