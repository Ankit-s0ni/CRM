import { Body, Controller, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import {
  RegisterProductManifestDto,
  ProductActionDto,
  ValidateProductManifestDto,
} from './dto/product-registration.dto';
import {
  PRODUCT_REGISTRATION_IDENTITY,
  ProductRegistrationCiGuard,
} from './product-registration-ci.guard';
import { ProductRegistryService } from './product-registry.service';

@Controller('internal/platform/v1/product-registry')
@UseGuards(ProductRegistrationCiGuard)
@ApiTags('Internal product registration')
export class ProductRegistrationCiController {
  constructor(private readonly registry: ProductRegistryService) {}

  @Post('validate')
  @ApiOperation({ summary: 'Validate a product manifest from CI' })
  validate(@Body() dto: ValidateProductManifestDto) {
    return this.registry.validate(dto.manifest);
  }

  @Post('products')
  @ApiOperation({ summary: 'Register a product manifest from CI' })
  register(
    @Body() dto: RegisterProductManifestDto,
    @Req() request: Request & { [PRODUCT_REGISTRATION_IDENTITY]: string },
  ) {
    return this.registry.register(dto, this.actor(request), metadata(request));
  }

  @Post('products/:productKey/revisions/:version/activate')
  @ApiOperation({ summary: 'Activate a product revision from CI' })
  activate(
    @Param('productKey') productKey: string,
    @Param('version') version: string,
    @Body() _dto: ProductActionDto,
    @Req() request: Request & { [PRODUCT_REGISTRATION_IDENTITY]: string },
  ) {
    return this.registry.activate(
      productKey,
      version,
      this.actor(request),
      metadata(request),
    );
  }

  private actor(
    request: Request & { [PRODUCT_REGISTRATION_IDENTITY]: string },
  ) {
    return { serviceIdentity: request[PRODUCT_REGISTRATION_IDENTITY] };
  }
}

function metadata(request: Request) {
  return {
    ipAddress: request.ip,
    userAgent: request.get('user-agent'),
    requestId: String(request.headers['x-request-id'] ?? ''),
    idempotencyKey: String(request.headers['idempotency-key'] ?? ''),
  };
}
