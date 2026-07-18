import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PERMISSIONS } from '../../shared/authorization/permissions.constants';
import { PermissionsGuard } from '../../shared/authorization/permissions.guard';
import { RequirePermissions } from '../../shared/authorization/require-permissions.decorator';
import { JwtTenantGuard } from '../identity/jwt-tenant.guard';
import {
  NotificationPreferencesDto,
  NotificationQueryDto,
} from './dto/notification.dto';
import { NotificationsService } from './notifications.service';

@ApiTags('Notifications')
@ApiBearerAuth()
@UseGuards(JwtTenantGuard, PermissionsGuard)
@RequirePermissions(PERMISSIONS.NOTIFICATIONS_SELF)
@Controller()
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get('notifications')
  @ApiOperation({ summary: 'List authenticated user inbox notifications' })
  list(@Query() query: NotificationQueryDto) {
    return this.notifications.list(query);
  }

  @Get('notifications/unread-count')
  @ApiOperation({ summary: 'Get authenticated user unread count' })
  unreadCount() {
    return this.notifications.unreadCount();
  }

  @Post('notifications/:id/read')
  @ApiOperation({ summary: 'Mark one owned notification as read' })
  @ApiBody({ schema: { type: 'object', additionalProperties: false } })
  markRead(@Param('id', ParseUUIDPipe) id: string) {
    return this.notifications.markRead(id);
  }

  @Post('notifications/read-all')
  @ApiOperation({ summary: 'Mark all owned notifications as read' })
  @ApiBody({ schema: { type: 'object', additionalProperties: false } })
  markAllRead() {
    return this.notifications.markAllRead();
  }

  @Get('notification-preferences')
  @ApiOperation({ summary: 'Get authenticated user delivery preferences' })
  preferences() {
    return this.notifications.preferences();
  }

  @Put('notification-preferences')
  @ApiOperation({ summary: 'Update optional notification preferences' })
  updatePreferences(@Body() dto: NotificationPreferencesDto) {
    return this.notifications.updatePreferences(dto);
  }
}
