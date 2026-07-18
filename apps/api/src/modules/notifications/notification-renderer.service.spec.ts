import { UnprocessableEntityException } from '@nestjs/common';
import { NotificationRendererService } from './notification-renderer.service';

describe('NotificationRendererService', () => {
  const renderer = new NotificationRendererService();

  it('validates variables and escapes untrusted channel output', () => {
    expect(
      renderer.render(
        {
          subject: 'Request from {{employeeName}}',
          bodyTemplate: '{{employeeName}} submitted {{requestType}}',
          requiredVariables: ['employeeName', 'requestType'],
        },
        {
          employeeName: '<Aisha & Co>',
          requestType: 'regularization',
        },
      ),
    ).toEqual({
      subject: 'Request from &lt;Aisha &amp; Co&gt;',
      body: '&lt;Aisha &amp; Co&gt; submitted regularization',
    });
  });

  it('fails closed when a versioned template variable is absent', () => {
    expect(() =>
      renderer.render(
        {
          subject: null,
          bodyTemplate: '{{employeeName}} submitted a request',
          requiredVariables: ['employeeName'],
        },
        {},
      ),
    ).toThrow(UnprocessableEntityException);
  });
});
