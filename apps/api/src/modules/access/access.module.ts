import { Module } from '@nestjs/common';
import { BillingAccessController } from './billing-access.controller';
import { BillingAccessService } from './billing-access.service';
import {
  InvitationAcceptanceController,
  InvitationsController,
} from './invitations.controller';
import { InvitationsService } from './invitations.service';
import { RolesController } from './roles.controller';
import { RolesService } from './roles.service';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  controllers: [
    RolesController,
    UsersController,
    InvitationsController,
    InvitationAcceptanceController,
    BillingAccessController,
  ],
  providers: [
    RolesService,
    UsersService,
    InvitationsService,
    BillingAccessService,
  ],
})
export class AccessModule {}
