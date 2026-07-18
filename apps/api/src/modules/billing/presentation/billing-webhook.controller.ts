import {
  Controller,
  Headers,
  HttpCode,
  Param,
  Post,
  Req,
} from '@nestjs/common';
import { ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PaymentGateway } from '@prisma/client';
import type { Request } from 'express';
import { BillingWebhookService } from '../application/billing-webhook.service';

type RawRequest = Request & { rawBody?: Buffer };

@ApiTags('Billing Webhooks')
@Controller('billing/webhooks')
export class BillingWebhookController {
  constructor(private readonly webhooks: BillingWebhookService) {}

  @Post(':provider')
  @HttpCode(200)
  @ApiOperation({ summary: 'Consume an authenticated payment provider event' })
  @ApiBody({
    schema: {
      type: 'object',
      additionalProperties: true,
      description: 'Provider-native JSON verified against its exact raw bytes',
    },
  })
  handle(
    @Param('provider') providerName: string,
    @Req() request: RawRequest,
    @Headers('x-razorpay-signature') razorpaySignature?: string,
    @Headers('stripe-signature') stripeSignature?: string,
    @Headers('x-razorpay-event-id') razorpayEventId?: string,
  ) {
    const provider = providerName.toLowerCase();
    if (provider !== 'razorpay' && provider !== 'stripe') {
      return { data: { status: 'ignored', reason: 'provider_not_supported' } };
    }
    return this.webhooks.handle(
      provider === 'razorpay' ? PaymentGateway.RAZORPAY : PaymentGateway.STRIPE,
      request.rawBody ?? Buffer.from(JSON.stringify(request.body ?? {})),
      provider === 'razorpay' ? razorpaySignature : stripeSignature,
      razorpayEventId,
    );
  }
}
