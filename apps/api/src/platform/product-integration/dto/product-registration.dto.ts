import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsNumber,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  Matches,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import type { ProductManifestV2 } from '@mariya-abdul/deltcrm-product-contracts';

export class ValidateProductManifestDto {
  @IsObject()
  manifest!: ProductManifestV2;
}

export class RegisterProductManifestDto extends ValidateProductManifestDto {
  @IsOptional()
  @IsString()
  signature?: string;

  @IsOptional()
  @IsString()
  signingKeyId?: string;
}

export class RegisterProductDeploymentDto {
  @IsString()
  @Matches(/^[a-z][a-z0-9-]{1,31}$/)
  environment!: string;

  @IsUrl({ require_tld: false, protocols: ['http', 'https'] })
  internalApiBaseUrl!: string;

  @IsOptional()
  @IsUrl({ require_tld: false, protocols: ['http', 'https'] })
  internalWebBaseUrl?: string;

  @IsOptional()
  @IsString()
  region?: string;
}

export class RotateProductCredentialDto {
  @IsString()
  @Matches(/^[a-z][a-z0-9-]{1,31}$/)
  environment!: string;

  @IsString()
  @Matches(/^[A-Za-z0-9._-]{3,128}$/)
  keyId!: string;

  @IsString()
  @Matches(/^(aws-sm|vault|k8s-secret|env):\/\/.+/)
  secretRef!: string;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}

export class ProductActionDto {
  @IsOptional()
  @IsString()
  reason?: string;
}

export class ProductCapabilityGrantDto {
  @IsString()
  capabilityKey!: string;

  @IsBoolean()
  included!: boolean;
}

export class ProductLimitGrantDto {
  @IsString()
  limitKey!: string;

  @IsNumber()
  @Min(0)
  value!: number;
}

export class ConfigurePlanProductDto {
  @IsBoolean()
  included!: boolean;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductCapabilityGrantDto)
  capabilities!: ProductCapabilityGrantDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductLimitGrantDto)
  limits!: ProductLimitGrantDto[];
}

export class TenantProductOverrideDto {
  @IsIn(['INHERIT', 'ENABLE', 'DISABLE'])
  mode!: 'INHERIT' | 'ENABLE' | 'DISABLE';

  @IsString()
  @Matches(/^.{10,500}$/s)
  reason!: string;

  @IsOptional()
  @IsDateString()
  startsAt?: string;

  @IsOptional()
  @IsDateString()
  endsAt?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  expectedVersion?: number;
}

export class TenantCapabilityOverrideDto extends TenantProductOverrideDto {
  @IsString()
  capabilityKey!: string;
}

export class TenantLimitOverrideDto {
  @IsString()
  limitKey!: string;

  @IsNumber()
  @Min(0)
  value!: number;

  @IsString()
  @Matches(/^.{10,500}$/s)
  reason!: string;

  @IsOptional()
  @IsDateString()
  startsAt?: string;

  @IsDateString()
  endsAt!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  expectedVersion?: number;
}

export class ProductLifecycleAcknowledgementDto {
  @IsUUID()
  eventId!: string;

  @IsString()
  eventKey!: string;

  @IsIn(['PROVISIONING', 'ACTIVE', 'FAILED', 'SUSPENDED'])
  state!: 'PROVISIONING' | 'ACTIVE' | 'FAILED' | 'SUSPENDED';

  @IsOptional()
  @IsString()
  failureCode?: string;
}

export class ProductUsageDto {
  @IsString()
  metricKey!: string;

  @IsNumber()
  @Min(0)
  value!: number;

  @IsString()
  sourceEventId!: string;

  @IsNumber()
  @Min(1)
  entitlementVersion!: number;

  @IsDateString()
  occurredAt!: string;
}
