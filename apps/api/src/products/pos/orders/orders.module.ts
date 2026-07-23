import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { EmailModule } from '../../../platform/email/email.module';
import { WhatsappModule } from '../../../platform/whatsapp/whatsapp.module';

@Module({
  imports: [EmailModule, WhatsappModule],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
