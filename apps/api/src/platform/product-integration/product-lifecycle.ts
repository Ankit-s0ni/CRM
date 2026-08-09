import type {
  ProductLifecycleEventType,
  ProvisioningState,
  SubscriptionStatus,
} from '@deltcrm/product-contracts';

export interface ProductLifecycleDeliverySnapshot {
  eventKey: ProductLifecycleEventType;
  createdAt: Date;
  publishedAt: Date | null;
  lockedAt: Date | null;
  attemptCount: number;
  lastError: string | null;
  deadLetteredAt: Date | null;
}

export interface ProductProvisioningResolution {
  state: ProvisioningState;
  attempt: number;
  updatedAt: string;
  failureCode?: string;
}

export function isHrmsModuleActive(moduleKeys: readonly string[]) {
  return moduleKeys.some((key) => key === 'ATTENDANCE' || key === 'PAYROLL');
}

export function resolveHrmsLifecycleTransition(
  previousModuleKeys: readonly string[],
  nextModuleKeys: readonly string[],
): ProductLifecycleEventType | null {
  const wasActive = isHrmsModuleActive(previousModuleKeys);
  const isActive = isHrmsModuleActive(nextModuleKeys);
  if (wasActive === isActive) return null;
  return isActive
    ? 'platform.product.activation-requested.v1'
    : 'platform.product.suspension-requested.v1';
}

export function resolveHrmsProvisioningStatus(input: {
  productActive: boolean;
  subscriptionStatus: SubscriptionStatus;
  effectiveAt: string;
  delivery: ProductLifecycleDeliverySnapshot | null;
}): ProductProvisioningResolution {
  const { delivery } = input;
  const updatedAt = lifecycleUpdatedAt(delivery) ?? input.effectiveAt;
  const attempt = delivery?.attemptCount ?? 0;

  if (input.subscriptionStatus === 'SUSPENDED') {
    return { state: 'SUSPENDED', attempt, updatedAt };
  }
  if (!delivery) {
    return {
      state: input.productActive ? 'ACTIVE' : 'NOT_REQUESTED',
      attempt,
      updatedAt,
    };
  }
  if (delivery.deadLetteredAt) {
    return {
      state: 'FAILED',
      attempt,
      updatedAt,
      failureCode: 'LIFECYCLE_EVENT_DELIVERY_FAILED',
    };
  }
  if (!delivery.publishedAt) {
    return {
      state: delivery.lockedAt || attempt > 0 ? 'PROVISIONING' : 'PENDING',
      attempt,
      updatedAt,
    };
  }
  if (delivery.eventKey === 'platform.product.suspension-requested.v1') {
    return { state: 'SUSPENDED', attempt, updatedAt };
  }
  if (!input.productActive) {
    return {
      state: 'FAILED',
      attempt,
      updatedAt,
      failureCode: 'PRODUCT_ENTITLEMENT_NOT_ACTIVE',
    };
  }
  return { state: 'ACTIVE', attempt, updatedAt };
}

function lifecycleUpdatedAt(delivery: ProductLifecycleDeliverySnapshot | null) {
  const value =
    delivery?.deadLetteredAt ?? delivery?.publishedAt ?? delivery?.createdAt;
  return value?.toISOString();
}
