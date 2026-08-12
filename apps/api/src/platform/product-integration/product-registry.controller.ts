import {
  Body,
  BadRequestException,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { CurrentUser } from '../../shared/http/current-user.decorator';
import {
  PlatformJwtGuard,
  PlatformPermissionGuard,
  RequirePlatformPermissions,
  type AuthenticatedPlatformUser,
} from '../control-plane/public';
import {
  RegisterProductDeploymentDto,
  RegisterProductManifestDto,
  ProductActionDto,
  RotateProductCredentialDto,
  ValidateProductManifestDto,
} from './dto/product-registration.dto';
import { ProductRegistryService } from './product-registry.service';
import { ProductHealthService } from './product-health.service';

@ApiTags('Platform Product Registry')
@ApiBearerAuth()
@UseGuards(PlatformJwtGuard, PlatformPermissionGuard)
@Controller('platform/products')
export class ProductRegistryController {
  constructor(
    private readonly registry: ProductRegistryService,
    private readonly health: ProductHealthService,
  ) {}

  @Post('registrations/validate')
  @RequirePlatformPermissions('platform.modules.manage')
  @ApiOperation({
    summary: 'Validate a product manifest without registering it',
  })
  validate(@Body() dto: ValidateProductManifestDto) {
    return this.registry.validate(dto.manifest);
  }

  @Post()
  @RequirePlatformPermissions('platform.modules.manage')
  @ApiOperation({ summary: 'Register a product manifest revision' })
  register(
    @Body() dto: RegisterProductManifestDto,
    @CurrentUser() actor: AuthenticatedPlatformUser,
    @Req() request: Request,
  ) {
    return this.registry.register(dto, actor, this.metadata(request));
  }

  @Post(':productKey/revisions')
  @RequirePlatformPermissions('platform.modules.manage')
  @ApiOperation({ summary: 'Register a new revision for a product' })
  revise(
    @Param('productKey') productKey: string,
    @Body() dto: RegisterProductManifestDto,
    @CurrentUser() actor: AuthenticatedPlatformUser,
    @Req() request: Request,
  ) {
    if (dto.manifest.productKey !== productKey.toUpperCase()) {
      throw new BadRequestException({
        code: 'PRODUCT_KEY_MISMATCH',
        message: 'Manifest productKey must match the route productKey',
      });
    }
    return this.registry.register(dto, actor, this.metadata(request));
  }

  @Get()
  @RequirePlatformPermissions('platform.modules.read')
  @ApiOperation({ summary: 'List registered products' })
  list() {
    return this.registry.list();
  }

  @Get(':productKey')
  @RequirePlatformPermissions('platform.modules.read')
  @ApiOperation({ summary: 'Get a registered product and its revisions' })
  get(@Param('productKey') productKey: string) {
    return this.registry.get(productKey);
  }

  @Get(':productKey/health')
  @RequirePlatformPermissions('platform.modules.read')
  @ApiOperation({ summary: 'Get aggregate health for a registered product' })
  healthStatus(@Param('productKey') productKey: string) {
    return this.health.check(productKey);
  }

  @Get(':productKey/provisioning')
  @RequirePlatformPermissions('platform.modules.read')
  @ApiOperation({ summary: 'List provisioning instances for a product' })
  provisioning(@Param('productKey') productKey: string) {
    return this.registry.provisioning(productKey);
  }

  @Post(':productKey/revisions/:version/activate')
  @RequirePlatformPermissions('platform.modules.manage')
  @ApiOperation({ summary: 'Activate a registered product revision' })
  activate(
    @Param('productKey') productKey: string,
    @Param('version') version: string,
    @Body() _dto: ProductActionDto,
    @CurrentUser() actor: AuthenticatedPlatformUser,
    @Req() request: Request,
  ) {
    return this.registry.activate(
      productKey,
      version,
      actor,
      this.metadata(request),
    );
  }

  @Post(':productKey/suspend')
  @RequirePlatformPermissions('platform.modules.manage')
  @ApiOperation({ summary: 'Suspend a registered product' })
  suspend(
    @Param('productKey') productKey: string,
    @Body() _dto: ProductActionDto,
    @CurrentUser() actor: AuthenticatedPlatformUser,
    @Req() request: Request,
  ) {
    return this.registry.suspend(productKey, actor, this.metadata(request));
  }

  @Post(':productKey/deployments')
  @RequirePlatformPermissions('platform.modules.manage')
  @ApiOperation({ summary: 'Register or update a product deployment' })
  deployment(
    @Param('productKey') productKey: string,
    @Body() dto: RegisterProductDeploymentDto,
    @CurrentUser() actor: AuthenticatedPlatformUser,
    @Req() request: Request,
  ) {
    return this.registry.registerDeployment(
      productKey,
      dto,
      actor,
      this.metadata(request),
    );
  }

  @Get(':productKey/credentials')
  @RequirePlatformPermissions('platform.modules.read')
  @ApiOperation({ summary: 'List product service credentials' })
  credentials(@Param('productKey') productKey: string) {
    return this.registry.credentials(productKey);
  }

  @Post(':productKey/credentials/rotate')
  @RequirePlatformPermissions('platform.modules.manage')
  @ApiOperation({ summary: 'Rotate a product service credential' })
  rotateCredential(
    @Param('productKey') productKey: string,
    @Body() dto: RotateProductCredentialDto,
    @CurrentUser() actor: AuthenticatedPlatformUser,
    @Req() request: Request,
  ) {
    return this.registry.rotateCredential(
      productKey,
      dto,
      actor,
      this.metadata(request),
    );
  }

  @Post(':productKey/lifecycle/:eventId/replay')
  @RequirePlatformPermissions('platform.modules.manage')
  @ApiOperation({ summary: 'Replay a failed product lifecycle delivery' })
  replay(
    @Param('productKey') productKey: string,
    @Param('eventId') eventId: string,
    @Body() _dto: ProductActionDto,
    @CurrentUser() actor: AuthenticatedPlatformUser,
    @Req() request: Request,
  ) {
    return this.registry.replayLifecycleDelivery(
      productKey,
      eventId,
      actor,
      this.metadata(request),
    );
  }

  private metadata(request: Request) {
    return {
      ipAddress: request.ip,
      userAgent: request.get('user-agent'),
      requestId: String(request.headers['x-request-id'] ?? ''),
      idempotencyKey: String(request.headers['idempotency-key'] ?? ''),
    };
  }
}
