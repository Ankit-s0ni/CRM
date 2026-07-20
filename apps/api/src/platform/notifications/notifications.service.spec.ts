import { NotificationsService } from './notifications.service';

describe('NotificationsService preferences', () => {
  it('projects available templates with stored and mandatory preferences', async () => {
    const tx = {
      notificationTemplate: {
        findMany: jest.fn().mockResolvedValue([
          {
            eventKey: 'attendance.checked_in',
            channel: 'EMAIL',
            subject: 'Check-in recorded',
          },
          {
            eventKey: 'security.violation',
            channel: 'PUSH',
            subject: 'Security alert',
          },
        ]),
      },
      notificationPreference: {
        findMany: jest.fn().mockResolvedValue([
          {
            eventKey: 'attendance.checked_in',
            channel: 'EMAIL',
            enabled: false,
          },
          {
            eventKey: 'security.violation',
            channel: 'PUSH',
            enabled: false,
          },
        ]),
      },
    };
    const prisma = {
      forTenant: jest.fn((callback: (client: typeof tx) => unknown) =>
        callback(tx),
      ),
    };
    const service = new NotificationsService(
      prisma as never,
      {
        tenantId: 'tenant-1',
        userId: 'user-1',
      } as never,
    );

    await expect(service.preferences()).resolves.toMatchObject({
      data: [
        {
          eventKey: 'attendance.checked_in',
          channel: 'EMAIL',
          label: 'Check-in recorded',
          enabled: false,
          mandatory: false,
        },
        {
          eventKey: 'security.violation',
          channel: 'PUSH',
          label: 'Security alert',
          enabled: true,
          mandatory: true,
        },
      ],
    });
  });
});
