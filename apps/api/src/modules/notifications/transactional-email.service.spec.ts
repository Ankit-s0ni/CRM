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
    expect(send).toHaveBeenCalledWith({
      email: 'owner@acme.com',
      subject: 'Verify your DeltCRM workspace',
      body: 'Your DeltCRM verification code is 123456. It expires in 24 hours. If you did not create this workspace, ignore this email.',
    });
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
});
