import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  assertProductManifestV2,
  canonicalizeProductManifest,
  productManifestHash,
  verifyProductManifestSignature,
  type ProductManifestV2,
} from '@mariya-abdul/deltcrm-product-contracts';
import { Prisma } from '../../generated/platform-client';
import {
  PlatformDatabaseService,
  type PlatformTransaction,
} from '../../shared/database/platform-database.service';
import type { AuthenticatedPlatformUser } from '../control-plane/public';
import type {
  RegisterProductDeploymentDto,
  RegisterProductManifestDto,
  RotateProductCredentialDto,
} from './dto/product-registration.dto';

const MFA_FRESH_MS = 10 * 60_000;

type RegisteredProductDescriptor = Prisma.RegisteredProductGetPayload<{
  include: {
    revisions: true;
    permissions: true;
    capabilities: true;
    limits: true;
  };
}>;

export type ProductRequestMetadata = {
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
  idempotencyKey?: string;
};

export type ProductRegistryActor =
  | AuthenticatedPlatformUser
  | {
      serviceIdentity: string;
      platformUserId?: undefined;
    };

@Injectable()
export class ProductRegistryService {
  constructor(private readonly database: PlatformDatabaseService) {}

  async validate(manifest: unknown) {
    try {
      assertProductManifestV2(manifest);
      await this.assertNoRouteCollision(manifest);
      return {
        valid: true as const,
        contentHash: await productManifestHash(manifest),
        productKey: manifest.productKey,
        manifestVersion: manifest.manifestVersion,
      };
    } catch (error) {
      throw new UnprocessableEntityException({
        code: 'PRODUCT_MANIFEST_INVALID',
        message:
          error instanceof Error
            ? error.message
            : 'Product manifest is invalid',
      });
    }
  }

  list() {
    return this.database.transaction((tx) =>
      tx.registeredProduct.findMany({
        include: {
          activeRevision: true,
          permissions: true,
          capabilities: true,
          limits: true,
          deployments: true,
        },
        orderBy: { displayName: 'asc' },
      }),
    );
  }

  async get(productKey: string) {
    const product = await this.database.transaction((tx) =>
      tx.registeredProduct.findUnique({
        where: { productKey: productKey.toUpperCase() },
        include: {
          activeRevision: true,
          revisions: { orderBy: { registeredAt: 'desc' } },
          permissions: true,
          capabilities: true,
          limits: true,
          events: true,
          deployments: true,
        },
      }),
    );
    if (!product) this.notFound(productKey);
    return product;
  }

  async active(productKey: string) {
    const product = await this.get(productKey);
    if (product.status !== 'ACTIVE' || !product.activeRevision) {
      throw new NotFoundException({
        code: 'PRODUCT_NOT_ACTIVE',
        message: `${productKey.toUpperCase()} has no active manifest`,
      });
    }
    return {
      ...product,
      manifest: product.activeRevision.manifest as unknown as ProductManifestV2,
    };
  }

  async byAudience(audience: string) {
    const product = await this.database.transaction((tx) =>
      tx.registeredProduct.findUnique({
        where: { audience },
        include: {
          activeRevision: true,
          permissions: true,
          capabilities: true,
          limits: true,
          deployments: true,
        },
      }),
    );
    if (!product || product.status !== 'ACTIVE' || !product.activeRevision) {
      throw new NotFoundException({
        code: 'PRODUCT_NOT_REGISTERED',
        message: `No active product is registered for ${audience}`,
      });
    }
    return {
      ...product,
      manifest: product.activeRevision.manifest as unknown as ProductManifestV2,
    };
  }

  async register(
    dto: RegisterProductManifestDto,
    actor: ProductRegistryActor,
    metadata: ProductRequestMetadata,
  ) {
    this.assertFreshMfa(actor);
    if (!metadata.idempotencyKey) {
      throw new UnprocessableEntityException({
        code: 'IDEMPOTENCY_KEY_REQUIRED',
        message: 'Product registry writes require an Idempotency-Key header',
      });
    }
    const validation = await this.validate(dto.manifest);
    const manifest = dto.manifest;
    await this.assertTrustedSignature(
      manifest,
      dto.signature,
      dto.signingKeyId,
    );
    return this.database.transaction(async (tx) => {
      const idempotentRevision = await tx.productManifestRevision.findUnique({
        where: { idempotencyKey: metadata.idempotencyKey },
      });
      if (idempotentRevision) {
        if (idempotentRevision.contentHash !== validation.contentHash) {
          this.conflict(
            'IDEMPOTENCY_KEY_REUSED',
            'Idempotency key was used for different manifest content',
          );
        }
        return {
          productId: idempotentRevision.productId,
          revision: idempotentRevision,
          idempotent: true,
        };
      }
      const existing = await tx.registeredProduct.findUnique({
        where: { productKey: manifest.productKey },
        include: {
          revisions: true,
          permissions: true,
          capabilities: true,
          limits: true,
        },
      });
      if (existing && existing.audience !== manifest.audience) {
        this.conflict(
          'PRODUCT_AUDIENCE_IMMUTABLE',
          'Product audience cannot change',
        );
      }
      const audienceOwner = await tx.registeredProduct.findUnique({
        where: { audience: manifest.audience },
      });
      if (audienceOwner && audienceOwner.productKey !== manifest.productKey) {
        this.conflict(
          'PRODUCT_AUDIENCE_EXISTS',
          'Product audience is already registered',
        );
      }
      this.assertIdentifiersPreserved(existing, manifest);

      const product =
        existing ??
        (await tx.registeredProduct.create({
          data: {
            productKey: manifest.productKey,
            audience: manifest.audience,
            webPath: manifest.routes.webPath,
            apiPrefix: manifest.routes.apiPrefix,
            displayName: manifest.displayName,
            description: manifest.description,
            createdBy: this.actorId(actor),
          },
          include: {
            revisions: true,
            permissions: true,
            capabilities: true,
            limits: true,
          },
        }));
      const duplicate = product.revisions.find(
        (revision) =>
          revision.manifestVersion === manifest.manifestVersion ||
          revision.contentHash === validation.contentHash,
      );
      if (duplicate)
        return { productId: product.id, revision: duplicate, idempotent: true };

      const manifestJson: unknown = JSON.parse(
        canonicalizeProductManifest(manifest),
      );
      const revision = await tx.productManifestRevision.create({
        data: {
          productId: product.id,
          manifestVersion: manifest.manifestVersion,
          schemaVersion: manifest.schemaVersion,
          minimumContractVersion: manifest.minimumContractVersion,
          manifest: manifestJson as Prisma.InputJsonValue,
          contentHash: validation.contentHash,
          signature: dto.signature,
          signingKeyId: dto.signingKeyId,
          validationResult: { valid: true },
          registeredBy: this.actorId(actor),
          idempotencyKey: metadata.idempotencyKey,
        },
      });
      await tx.registeredProduct.update({
        where: { id: product.id },
        data: {
          displayName: manifest.displayName,
          description: manifest.description,
          webPath: manifest.routes.webPath,
          apiPrefix: manifest.routes.apiPrefix,
          version: { increment: 1 },
        },
      });
      await this.audit(
        tx,
        actor,
        metadata,
        'platform.product.revision.registered',
        null,
        {
          productKey: manifest.productKey,
          manifestVersion: manifest.manifestVersion,
          contentHash: validation.contentHash,
        },
      );
      return { productId: product.id, revision, idempotent: false };
    });
  }

  async activate(
    productKey: string,
    manifestVersion: string,
    actor: ProductRegistryActor,
    metadata: ProductRequestMetadata,
  ) {
    this.assertFreshMfa(actor);
    this.assertIdempotencyKey(metadata, 'Product activation');
    return this.database.transaction(async (tx) => {
      const product = await tx.registeredProduct.findUnique({
        where: { productKey: productKey.toUpperCase() },
        include: { activeRevision: true },
      });
      if (!product) this.notFound(productKey);
      const revision = await tx.productManifestRevision.findUnique({
        where: {
          productId_manifestVersion: { productId: product.id, manifestVersion },
        },
      });
      if (!revision) this.notFound(`${productKey} revision ${manifestVersion}`);
      const manifest = revision.manifest as unknown as ProductManifestV2;
      assertProductManifestV2(manifest);

      await tx.productManifestRevision.updateMany({
        where: { productId: product.id, status: 'ACTIVE' },
        data: { status: 'SUPERSEDED' },
      });
      await tx.productManifestRevision.update({
        where: { id: revision.id },
        data: { status: 'ACTIVE', activatedAt: new Date() },
      });
      await this.replaceDefinitions(tx, product.id, manifest);
      const updated = await tx.registeredProduct.update({
        where: { id: product.id },
        data: {
          activeRevisionId: revision.id,
          status: 'ACTIVE',
          displayName: manifest.displayName,
          description: manifest.description,
          webPath: manifest.routes.webPath,
          apiPrefix: manifest.routes.apiPrefix,
          version: { increment: 1 },
        },
        include: {
          activeRevision: true,
          permissions: true,
          capabilities: true,
          limits: true,
        },
      });
      await this.audit(
        tx,
        actor,
        metadata,
        'platform.product.revision.activated',
        product.activeRevision,
        revision,
      );
      return updated;
    });
  }

  async suspend(
    productKey: string,
    actor: ProductRegistryActor,
    metadata: ProductRequestMetadata,
  ) {
    this.assertFreshMfa(actor);
    this.assertIdempotencyKey(metadata, 'Product suspension');
    return this.database.transaction(async (tx) => {
      const current = await tx.registeredProduct.findUnique({
        where: { productKey: productKey.toUpperCase() },
      });
      if (!current) this.notFound(productKey);
      const product = await tx.registeredProduct.update({
        where: { id: current.id },
        data: { status: 'SUSPENDED', version: { increment: 1 } },
      });
      await this.audit(
        tx,
        actor,
        metadata,
        'platform.product.suspended',
        current,
        product,
      );
      return product;
    });
  }

  async registerDeployment(
    productKey: string,
    dto: RegisterProductDeploymentDto,
    actor: ProductRegistryActor,
    metadata: ProductRequestMetadata,
  ) {
    this.assertFreshMfa(actor);
    this.assertIdempotencyKey(metadata, 'Deployment registration');
    this.assertSafeInternalUrl(dto.internalApiBaseUrl);
    if (dto.internalWebBaseUrl)
      this.assertSafeInternalUrl(dto.internalWebBaseUrl);
    return this.database.transaction(async (tx) => {
      const product = await tx.registeredProduct.findUnique({
        where: { productKey: productKey.toUpperCase() },
      });
      if (!product) this.notFound(productKey);
      const deployment = await tx.productDeployment.upsert({
        where: {
          productId_environment: {
            productId: product.id,
            environment: dto.environment,
          },
        },
        update: {
          internalApiBaseUrl: dto.internalApiBaseUrl,
          internalWebBaseUrl: dto.internalWebBaseUrl,
          region: dto.region,
        },
        create: { productId: product.id, ...dto },
      });
      await this.audit(
        tx,
        actor,
        metadata,
        'platform.product.deployment.registered',
        null,
        deployment,
      );
      return deployment;
    });
  }

  async rotateCredential(
    productKey: string,
    dto: RotateProductCredentialDto,
    actor: ProductRegistryActor,
    metadata: ProductRequestMetadata,
  ) {
    this.assertFreshMfa(actor);
    this.assertIdempotencyKey(metadata, 'Lifecycle replay');
    if (!metadata.idempotencyKey) {
      throw new UnprocessableEntityException({
        code: 'IDEMPOTENCY_KEY_REQUIRED',
        message: 'Credential rotation requires an Idempotency-Key header',
      });
    }
    return this.database.transaction(async (tx) => {
      const product = await tx.registeredProduct.findUnique({
        where: { productKey: productKey.toUpperCase() },
      });
      if (!product) this.notFound(productKey);
      const duplicate = await tx.productServiceCredential.findUnique({
        where: {
          productId_environment_keyId: {
            productId: product.id,
            environment: dto.environment,
            keyId: dto.keyId,
          },
        },
      });
      if (duplicate)
        return {
          credential: { ...duplicate, secretRef: '[REDACTED]' },
          idempotent: true,
        };
      const current = await tx.productServiceCredential.findFirst({
        where: {
          productId: product.id,
          environment: dto.environment,
          state: 'ACTIVE',
        },
        orderBy: { activatedAt: 'desc' },
      });
      if (current) {
        await tx.productServiceCredential.update({
          where: { id: current.id },
          data: { state: 'REVOKED', revokedAt: new Date() },
        });
      }
      const credential = await tx.productServiceCredential.create({
        data: {
          productId: product.id,
          environment: dto.environment,
          keyId: dto.keyId,
          secretRef: dto.secretRef,
          expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
          rotatedFromId: current?.id,
          createdBy: this.actorId(actor),
        },
      });
      await this.audit(
        tx,
        actor,
        metadata,
        'platform.product.credential.rotated',
        current,
        {
          ...credential,
          secretRef: '[REDACTED]',
        },
      );
      return {
        credential: { ...credential, secretRef: '[REDACTED]' },
        idempotent: false,
      };
    });
  }

  async credentials(productKey: string) {
    const product = await this.get(productKey);
    return this.database.transaction((tx) =>
      tx.productServiceCredential.findMany({
        where: { productId: product.id },
        select: {
          id: true,
          environment: true,
          keyId: true,
          state: true,
          activatedAt: true,
          expiresAt: true,
          revokedAt: true,
        },
        orderBy: { activatedAt: 'desc' },
      }),
    );
  }

  async provisioning(productKey: string) {
    const product = await this.get(productKey);
    return this.database.transaction(async (tx) => ({
      instances: await tx.productProvisioningInstance.findMany({
        where: { productId: product.id },
        orderBy: { updatedAt: 'desc' },
      }),
      deliveries: await tx.productLifecycleDelivery.findMany({
        where: { productId: product.id },
        orderBy: { createdAt: 'desc' },
        take: 250,
      }),
    }));
  }

  async replayLifecycleDelivery(
    productKey: string,
    eventId: string,
    actor: ProductRegistryActor,
    metadata: ProductRequestMetadata,
  ) {
    this.assertFreshMfa(actor);
    const product = await this.get(productKey);
    return this.database.transaction(async (tx) => {
      const delivery = await tx.productLifecycleDelivery.findFirst({
        where: { productId: product.id, eventId },
      });
      if (!delivery) this.notFound(`${productKey} delivery ${eventId}`);
      const events = await tx.$queryRaw<Array<{ id: string }>>`
        SELECT id FROM outbox_events WHERE payload->>'eventId' = ${eventId} LIMIT 1
      `;
      if (!events[0]) this.notFound(`${productKey} outbox event ${eventId}`);
      await tx.outboxEvent.update({
        where: { id: events[0].id },
        data: {
          publishedAt: null,
          deadLetteredAt: null,
          availableAt: new Date(),
          lockedAt: null,
          lockedBy: null,
          lastError: null,
        },
      });
      const replayed = await tx.productLifecycleDelivery.update({
        where: { id: delivery.id },
        data: { deadLetteredAt: null, lastError: null },
      });
      await this.audit(
        tx,
        actor,
        metadata,
        'platform.product.lifecycle.replayed',
        delivery,
        replayed,
      );
      return replayed;
    });
  }

  private async replaceDefinitions(
    tx: PlatformTransaction,
    productId: string,
    manifest: ProductManifestV2,
  ) {
    await this.assertDescriptorOwnership(tx, productId, manifest);
    for (const permission of manifest.permissions) {
      await tx.productPermissionDefinition.upsert({
        where: { key: permission.key },
        update: {
          description: permission.description,
          platformPermissionAliases: permission.platformPermissionAliases ?? [],
          platformPermissionPrefixAliases:
            permission.platformPermissionPrefixAliases ?? [],
          requiredCapabilityKeys: permission.requiredCapabilities ?? [],
          deprecated: permission.deprecated ?? false,
        },
        create: {
          productId,
          key: permission.key,
          description: permission.description,
          platformPermissionAliases: permission.platformPermissionAliases ?? [],
          platformPermissionPrefixAliases:
            permission.platformPermissionPrefixAliases ?? [],
          requiredCapabilityKeys: permission.requiredCapabilities ?? [],
          deprecated: permission.deprecated ?? false,
        },
      });
    }
    for (const capability of manifest.capabilities) {
      await tx.productCapabilityDefinition.upsert({
        where: { key: capability.key },
        update: {
          description: capability.description,
          required: capability.required,
          commercialType: capability.commercialType ?? 'CORE',
          dependencyKeys: capability.dependencyKeys ?? [],
          conflictKeys: capability.conflictKeys ?? [],
          deprecated: capability.deprecated ?? false,
        },
        create: {
          productId,
          ...capability,
          commercialType: capability.commercialType ?? 'CORE',
          dependencyKeys: capability.dependencyKeys ?? [],
          conflictKeys: capability.conflictKeys ?? [],
          deprecated: capability.deprecated ?? false,
        },
      });
    }
    for (const limit of manifest.limits) {
      await tx.productLimitDefinition.upsert({
        where: { key: limit.key },
        update: {
          description: limit.description,
          unit: limit.unit,
          enforcement: limit.enforcement,
          deprecated: limit.deprecated ?? false,
        },
        create: { productId, ...limit, deprecated: limit.deprecated ?? false },
      });
    }
    await tx.productEventDefinition.deleteMany({ where: { productId } });
    const events = [
      ...manifest.lifecycle.consumes.map((eventKey) => ({
        productId,
        eventKey,
        direction: 'CONSUMED',
      })),
      ...manifest.lifecycle.publishes.map((eventKey) => ({
        productId,
        eventKey,
        direction: 'PUBLISHED',
      })),
    ];
    if (events.length)
      await tx.productEventDefinition.createMany({ data: events });
  }

  private async assertDescriptorOwnership(
    tx: PlatformTransaction,
    productId: string,
    manifest: ProductManifestV2,
  ) {
    const permissionKeys = manifest.permissions.map(({ key }) => key);
    const capabilityKeys = manifest.capabilities.map(({ key }) => key);
    const limitKeys = manifest.limits.map(({ key }) => key);
    const [permissionOwner, capabilityOwner, limitOwner] = await Promise.all([
      permissionKeys.length
        ? tx.productPermissionDefinition.findFirst({
            where: {
              key: { in: permissionKeys },
              productId: { not: productId },
            },
          })
        : null,
      capabilityKeys.length
        ? tx.productCapabilityDefinition.findFirst({
            where: {
              key: { in: capabilityKeys },
              productId: { not: productId },
            },
          })
        : null,
      limitKeys.length
        ? tx.productLimitDefinition.findFirst({
            where: {
              key: { in: limitKeys },
              productId: { not: productId },
            },
          })
        : null,
    ]);
    const ownedKey =
      permissionOwner?.key ?? capabilityOwner?.key ?? limitOwner?.key;
    if (ownedKey) {
      this.conflict(
        'PRODUCT_IDENTIFIER_OWNED',
        `${ownedKey} belongs to another product`,
      );
    }
  }

  private async assertTrustedSignature(
    manifest: ProductManifestV2,
    signature?: string,
    signingKeyId?: string,
  ) {
    if (!signature || !signingKeyId) {
      if (process.env.NODE_ENV === 'production') {
        throw new UnprocessableEntityException({
          code: 'PRODUCT_MANIFEST_SIGNATURE_REQUIRED',
          message: 'Production product manifests must be signed',
        });
      }
      return;
    }
    let keys: Record<string, string> = {};
    try {
      const parsed: unknown = JSON.parse(
        process.env.PRODUCT_MANIFEST_TRUSTED_KEYS_JSON ?? '{}',
      );
      keys = parsed as Record<string, string>;
    } catch {
      keys = {};
    }
    const publicKey = keys[signingKeyId];
    if (
      !publicKey ||
      !(await verifyProductManifestSignature(manifest, signature, publicKey))
    ) {
      throw new UnprocessableEntityException({
        code: 'PRODUCT_MANIFEST_SIGNATURE_INVALID',
        message:
          'Manifest signature is invalid or the signing key is not trusted',
      });
    }
  }

  private assertIdentifiersPreserved(
    existing: RegisteredProductDescriptor | null,
    manifest: ProductManifestV2,
  ) {
    if (!existing) return;
    for (const [label, oldKeys, newKeys] of [
      [
        'permission',
        existing.permissions.map(({ key }) => key),
        manifest.permissions.map(({ key }) => key),
      ],
      [
        'capability',
        existing.capabilities.map(({ key }) => key),
        manifest.capabilities.map(({ key }) => key),
      ],
      [
        'limit',
        existing.limits.map(({ key }) => key),
        manifest.limits.map(({ key }) => key),
      ],
    ] as const) {
      const removed = oldKeys.filter((key: string) => !newKeys.includes(key));
      if (removed.length)
        this.conflict(
          'PRODUCT_IDENTIFIER_REMOVED',
          `Registered ${label} keys cannot be removed: ${removed.join(', ')}`,
        );
    }
  }

  private async assertNoRouteCollision(manifest: ProductManifestV2) {
    const products = await this.database.transaction((tx) =>
      tx.registeredProduct.findMany({ include: { activeRevision: true } }),
    );
    for (const product of products) {
      if (product.productKey === manifest.productKey || !product.activeRevision)
        continue;
      const registered = product.activeRevision
        .manifest as unknown as ProductManifestV2;
      if (
        registered.routes.webPath === manifest.routes.webPath ||
        registered.routes.apiPrefix === manifest.routes.apiPrefix
      ) {
        this.conflict(
          'PRODUCT_ROUTE_COLLISION',
          `Routes collide with ${product.productKey}`,
        );
      }
    }
  }

  private assertFreshMfa(actor: ProductRegistryActor) {
    if ('serviceIdentity' in actor) return;
    const verifiedAt = new Date(actor.mfaVerifiedAt).getTime();
    if (
      !Number.isFinite(verifiedAt) ||
      Date.now() - verifiedAt > MFA_FRESH_MS
    ) {
      throw new ForbiddenException({
        code: 'FRESH_MFA_REQUIRED',
        message: 'Product registry changes require fresh MFA verification',
      });
    }
  }

  private assertIdempotencyKey(
    metadata: ProductRequestMetadata,
    operation: string,
  ) {
    if (!metadata.idempotencyKey) {
      throw new UnprocessableEntityException({
        code: 'IDEMPOTENCY_KEY_REQUIRED',
        message: `${operation} requires an Idempotency-Key header`,
      });
    }
  }

  private assertSafeInternalUrl(value: string) {
    const url = new URL(value);
    const hostname = url.hostname.toLowerCase();
    const localDevelopment = process.env.NODE_ENV !== 'production';
    const allowedSuffixes = (
      process.env.PRODUCT_SERVICE_ALLOWED_HOST_SUFFIXES ??
      '.svc.cluster.local,.internal'
    )
      .split(',')
      .map((suffix) => suffix.trim().toLowerCase())
      .filter(Boolean);
    const allowed =
      allowedSuffixes.some((suffix) => hostname.endsWith(suffix)) ||
      (localDevelopment &&
        ['localhost', '127.0.0.1', '::1'].includes(hostname));
    if (!allowed) {
      throw new UnprocessableEntityException({
        code: 'PRODUCT_DEPLOYMENT_HOST_NOT_ALLOWED',
        message:
          'Product deployment must use an approved internal service destination',
      });
    }
  }

  private audit(
    tx: PlatformTransaction,
    actor: ProductRegistryActor,
    metadata: ProductRequestMetadata,
    action: string,
    oldValue: unknown,
    newValue: unknown,
  ) {
    return tx.systemAuditLog.create({
      data: {
        actorPlatformUserId: this.actorId(actor),
        action,
        module: 'platform.product-registry',
        oldValue: this.jsonValue(oldValue),
        newValue:
          newValue == null
            ? undefined
            : this.jsonValue({
                ...(typeof newValue === 'object'
                  ? newValue
                  : { value: newValue }),
                serviceIdentity:
                  'serviceIdentity' in actor
                    ? actor.serviceIdentity
                    : undefined,
              }),
        ipAddress: metadata.ipAddress,
        userAgent: metadata.userAgent,
        requestId: metadata.requestId,
      },
    });
  }

  private jsonValue(value: unknown): Prisma.InputJsonValue | undefined {
    if (value == null) return undefined;
    const parsed: unknown = JSON.parse(JSON.stringify(value));
    return parsed as Prisma.InputJsonValue;
  }

  private actorId(actor: ProductRegistryActor) {
    return 'platformUserId' in actor ? actor.platformUserId : undefined;
  }

  private conflict(code: string, message: string): never {
    throw new ConflictException({ code, message });
  }

  private notFound(productKey: string): never {
    throw new NotFoundException({
      code: 'PRODUCT_NOT_REGISTERED',
      message: `${productKey.toUpperCase()} is not registered`,
    });
  }
}
