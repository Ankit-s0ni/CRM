import { Module } from '@nestjs/common';
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
  ],
  providers: [RolesService, UsersService, InvitationsService],
})
export class AccessModule {}
