import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  InvoiceStatus,
  PaymentMethodStatus,
  Prisma,
  SubscriptionStatus,
} from '@prisma/client';
import { createHash } from 'node:crypto';
import { AuditService } from '../../audit/public';
import {
  PrismaService,
  type PrismaTransaction,
} from '../../../shared/database/prisma.service';
import { OutboxService } from '../../../shared/events/outbox.service';
import { PrivateObjectStorageService } from '../../../shared/storage/private-object-storage.service';
import { TenantContextService } from '../../tenancy/public';
import { bumpRuntimeConfigVersion } from '../../../shared/runtime-config/runtime-config-version';
import {
  calculateGst,
  gstStateCode,
  majorToMinor,
  minorToMajor,
} from '../domain/billing-money';
import { renderInvoicePdf } from '../infrastructure/invoice-pdf';
import {
  AddPaymentMethodDto,
  BillingInvoiceQueryDto,
  ChangePlanDto,
  PlanChangeTiming,
  UpdateBillingProfileDto,
} from '../presentation/billing.dto';

const CURRENT_SUBSCRIPTIONS: SubscriptionStatus[] = [
  SubscriptionStatus.TRIALING,
  SubscriptionStatus.ACTIVE,
  SubscriptionStatus.PAST_DUE,
  SubscriptionStatus.SUSPENDED,
];

type MutationActor = { userId: string; impersonationSessionId?: string };

@Injectable()
export class BillingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly context: TenantContextService,
    private readonly audit: AuditService,
    private readonly outbox: OutboxService,
    private readonly storage: PrivateObjectStorageService,
  ) {}

  profile() {
    return this.prisma.forTenant(async (tx) => ({
      data: await tx.tenantBillingProfile.findUnique({
        where: { tenantId: this.tenantId() },
      }),
    }));
  }

  updateProfile(dto: UpdateBillingProfileDto, actor: MutationActor) {
    this.assertMutable(actor);
    const tenantId = this.tenantId();
    return this.prisma.forTenant(async (tx) => {
      const previous = await tx.tenantBillingProfile.findUnique({
        where: { tenantId },
      });
      const profile = await tx.tenantBillingProfile.upsert({
        where: { tenantId },
        create: {
          tenantId,
          legalName: dto.legalName.trim(),
          billingEmail: dto.billingEmail.trim().toLowerCase(),
          gstin: dto.gstin?.trim().toUpperCase(),
          pan: dto.pan?.trim().toUpperCase(),
          currency: dto.currency.toUpperCase(),
          address: { ...dto.address },
        },
        update: {
          legalName: dto.legalName.trim(),
          billingEmail: dto.billingEmail.trim().toLowerCase(),
          gstin: dto.gstin?.trim().toUpperCase() ?? null,
          pan: dto.pan?.trim().toUpperCase() ?? null,
          currency: dto.currency.toUpperCase(),
          address: { ...dto.address },
        },
      });
      await this.audit.append(tx, {
        tenantId,
        action: 'billing.profile.updated',
        module: 'billing',
        entityType: 'TenantBillingProfile',
        entityId: tenantId,
        oldValue: previous,
        newValue: profile,
      });
      return { data: profile };
    });
  }

  subscription() {
    const tenantId = this.tenantId();
    return this.prisma.forTenant(async (tx) => {
      const [subscription, activeEmployees, profile] = await Promise.all([
        this.currentSubscription(tx),
        tx.employee.count({ where: { status: 'ACTIVE' } }),
        tx.tenantBillingProfile.findUnique({ where: { tenantId } }),
      ]);
      const availablePlans = await tx.subscriptionPlan.findMany({
        where: {
          isActive: true,
          currency: profile?.currency ?? subscription.plan.currency,
        },
        include: { modules: { include: { module: true } } },
        orderBy: [{ pricePerUser: 'asc' }, { name: 'asc' }],
      });
      return {
        data: {
          ...serialize(subscription),
          usage: {
            activeEmployees,
            seats: subscription.seatCount,
            maximumEmployees: subscription.plan.maxEmployees,
          },
          availablePlans: serialize(availablePlans),
          tenantId,
        },
      };
    });
  }

  async changePlan(dto: ChangePlanDto, actor: MutationActor) {
    this.assertMutable(actor);
    const tenantId = this.tenantId();
    const result = await this.prisma.forTenant(async (tx) => {
      await tx.$queryRaw`SELECT id FROM tenant_subscriptions WHERE "tenantId" = ${tenantId}::uuid AND status IN ('TRIALING', 'ACTIVE', 'PAST_DUE', 'SUSPENDED') FOR UPDATE`;
      const current = await this.currentSubscription(tx);
      const target = await tx.subscriptionPlan.findFirst({
        where: { id: dto.planId, isActive: true },
        include: { modules: { include: { module: true } } },
      });
      if (!target) this.notFound('PLAN_NOT_FOUND', 'Subscription plan');
      const activeEmployees = await tx.employee.count({
        where: { status: 'ACTIVE' },
      });
      if (activeEmployees > target.maxEmployees) {
        throw new ConflictException({
          code: 'PLAN_DOWNGRADE_BLOCKED',
          message: `The target plan supports ${target.maxEmployees} employees but ${activeEmployees} are active`,
        });
      }
      if (target.currency !== current.plan.currency) {
        throw new ConflictException({
          code: 'PLAN_CURRENCY_CHANGE_UNSUPPORTED',
          message: 'Contact support to change subscription currency',
        });
      }
      const preview = this.proration(current, target);
      if (!dto.confirm) return { preview, committed: false };
      if (dto.effective === PlanChangeTiming.NOW && preview.dueMinor > 0n) {
        const method = await tx.billingPaymentMethod.findFirst({
          where: { status: PaymentMethodStatus.ACTIVE },
        });
        if (!method) {
          throw new UnprocessableEntityException({
            code: 'PAYMENT_METHOD_REQUIRED',
            message: 'Add a payment method before changing plans',
          });
        }
      }
      const previous = serialize(current);
      const moduleKeys = target.modules.map(({ module }) => module.key).sort();
      const updated =
        dto.effective === PlanChangeTiming.PERIOD_END
          ? await tx.tenantSubscription.update({
              where: { id: current.id },
              data: {
                pendingPlanId: target.id,
                scheduledChangeAt: current.currentPeriodEnd,
              },
            })
          : await tx.tenantSubscription.update({
              where: { id: current.id },
              data: {
                planId: target.id,
                pendingPlanId: null,
                scheduledChangeAt: null,
              },
            });
      if (dto.effective === PlanChangeTiming.NOW) {
        await this.replaceBundle(tx, target.modules, actor.userId);
        await bumpRuntimeConfigVersion(tx, tenantId);
      }
      await Promise.all([
        tx.tenantSubscriptionHistory.create({
          data: {
            tenantId,
            subscriptionId: current.id,
            planId:
              dto.effective === PlanChangeTiming.NOW
                ? target.id
                : current.planId,
            status: updated.status,
            seatCount: updated.seatCount,
            reason:
              dto.effective === PlanChangeTiming.NOW
                ? 'Tenant plan changed immediately'
                : 'Tenant plan change scheduled',
            actorUserId: actor.userId,
            snapshot: {
              targetPlanId: target.id,
              effective: dto.effective,
              moduleKeys,
              proration: serializePreview(preview),
            },
          },
        }),
        this.audit.append(tx, {
          tenantId,
          action: 'billing.subscription.plan_changed',
          module: 'billing',
          entityType: 'TenantSubscription',
          entityId: current.id,
          oldValue: previous,
          newValue: {
            planId: target.id,
            effective: dto.effective,
            moduleKeys,
          },
        }),
        this.outbox.append(tx, {
          tenantId,
          eventKey: 'billing.subscription.plan_changed',
          payload: {
            tenantId,
            subscriptionId: current.id,
            planId: target.id,
            effective: dto.effective,
            moduleKeys,
          },
        }),
      ]);
      return {
        preview,
        committed: true,
        subscriptionId: current.id,
        target,
      };
    });
    if (
      result.committed &&
      dto.effective === PlanChangeTiming.NOW &&
      result.preview.dueMinor > 0n &&
      result.subscriptionId &&
      result.target
    ) {
      const invoice = await this.issueInvoice(
        result.subscriptionId,
        `Plan change to ${result.target.name}`,
        result.preview.dueMinor,
      );
      return {
        data: {
          ...result,
          preview: serializePreview(result.preview),
          invoice: invoice.data,
        },
      };
    }
    return {
      data: { ...result, preview: serializePreview(result.preview) },
    };
  }

  invoices(query: BillingInvoiceQueryDto) {
    const status = query.status
      ? (query.status.toUpperCase() as InvoiceStatus)
      : undefined;
    return this.prisma.forTenant(async (tx) => ({
      data: (
        await tx.tenantInvoice.findMany({
          where: { status },
          include: { lineItems: true },
          orderBy: { createdAt: 'desc' },
        })
      ).map(serialize),
    }));
  }

  invoice(id: string) {
    return this.prisma.forTenant(async (tx) => ({
      data: serialize(await this.findInvoice(tx, id)),
    }));
  }

  invoiceDownload(id: string) {
    return this.prisma.forTenant(async (tx) => {
      const invoice = await this.findInvoice(tx, id);
      if (!invoice.objectKey || !invoice.pdfChecksum) {
        throw new ConflictException({
          code: 'INVOICE_PDF_NOT_READY',
          message: 'Invoice PDF is still being prepared',
        });
      }
      return {
        data: await this.storage.signedInvoiceDownload(
          this.tenantId(),
          invoice.id,
          invoice.objectKey,
        ),
      };
    });
  }

  paymentMethods() {
    return this.prisma.forTenant(async (tx) => ({
      data: await tx.billingPaymentMethod.findMany({
        where: { status: PaymentMethodStatus.ACTIVE },
        orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
      }),
    }));
  }

  addPaymentMethod(dto: AddPaymentMethodDto, actor: MutationActor) {
    this.assertMutable(actor);
    const tenantId = this.tenantId();
    return this.prisma.forTenant(async (tx) => {
      await tx.$queryRaw`SELECT id FROM tenants WHERE id = ${tenantId}::uuid FOR UPDATE`;
      const activeCount = await tx.billingPaymentMethod.count({
        where: { status: PaymentMethodStatus.ACTIVE },
      });
      const makeDefault = dto.isDefault || activeCount === 0;
      if (makeDefault) {
        await tx.billingPaymentMethod.updateMany({
          where: { isDefault: true },
          data: { isDefault: false },
        });
      }
      const method = await tx.billingPaymentMethod.create({
        data: {
          tenantId,
          gateway: dto.gateway,
          providerMethodRef: dto.providerMethodRef,
          methodType: dto.methodType,
          displayName: dto.displayName.trim(),
          lastFour: dto.lastFour,
          expiryMonth: dto.expiryMonth,
          expiryYear: dto.expiryYear,
          isDefault: makeDefault,
        },
      });
      await this.audit.append(tx, {
        tenantId,
        action: 'billing.payment_method.added',
        module: 'billing',
        entityType: 'BillingPaymentMethod',
        entityId: method.id,
        newValue: {
          gateway: method.gateway,
          methodType: method.methodType,
          lastFour: method.lastFour,
          isDefault: method.isDefault,
        },
      });
      return { data: method };
    });
  }

  deletePaymentMethod(id: string, actor: MutationActor) {
    this.assertMutable(actor);
    const tenantId = this.tenantId();
    return this.prisma.forTenant(async (tx) => {
      const method = await tx.billingPaymentMethod.findUnique({
        where: { id },
      });
      if (!method) this.notFound('PAYMENT_METHOD_NOT_FOUND', 'Payment method');
      const updated = await tx.billingPaymentMethod.update({
        where: { id },
        data: { status: PaymentMethodStatus.REVOKED, isDefault: false },
      });
      if (method.isDefault) {
        const fallback = await tx.billingPaymentMethod.findFirst({
          where: { status: PaymentMethodStatus.ACTIVE, id: { not: id } },
          orderBy: { createdAt: 'desc' },
        });
        if (fallback) {
          await tx.billingPaymentMethod.update({
            where: { id: fallback.id },
            data: { isDefault: true },
          });
        }
      }
      await this.audit.append(tx, {
        tenantId,
        action: 'billing.payment_method.revoked',
        module: 'billing',
        entityType: 'BillingPaymentMethod',
        entityId: id,
        oldValue: { status: method.status, isDefault: method.isDefault },
        newValue: { status: updated.status, isDefault: false },
      });
      return { data: { id, status: updated.status } };
    });
  }

  async issueInvoice(
    subscriptionId: string,
    description: string,
    subtotalMinor?: bigint,
  ) {
    const tenantId = this.tenantId();
    const invoice = await this.prisma.forTenant(async (tx) => {
      const subscription = await tx.tenantSubscription.findUnique({
        where: { id: subscriptionId },
        include: { plan: true },
      });
      if (!subscription)
        this.notFound('SUBSCRIPTION_NOT_FOUND', 'Subscription');
      const profile = await tx.tenantBillingProfile.findUnique({
        where: { tenantId },
      });
      if (!profile) {
        throw new UnprocessableEntityException({
          code: 'BILLING_PROFILE_REQUIRED',
          message: 'Complete the billing profile before issuing an invoice',
        });
      }
      const subtotal =
        subtotalMinor ??
        majorToMinor(
          subscription.plan.pricePerUser.toString(),
          profile.currency,
        ) * BigInt(subscription.seatCount);
      const tax = calculateGst(
        subtotal,
        process.env.BILLING_SUPPLIER_STATE_CODE ?? '27',
        gstStateCode(profile.gstin),
      );
      const fiscalYear = fiscalYearFor(new Date());
      await tx.invoiceSequence.upsert({
        where: { fiscalYear },
        create: { fiscalYear, lastNumber: 0 },
        update: {},
      });
      await tx.$queryRaw`SELECT "fiscalYear" FROM invoice_sequences WHERE "fiscalYear" = ${fiscalYear} FOR UPDATE`;
      const sequence = await tx.invoiceSequence.update({
        where: { fiscalYear },
        data: { lastNumber: { increment: 1 } },
      });
      const invoiceNumber = `DCRM/${fiscalYear}/${String(sequence.lastNumber).padStart(6, '0')}`;
      const issuedAt = new Date();
      const dueDate = new Date(issuedAt.getTime() + 7 * 86_400_000);
      return tx.tenantInvoice.create({
        data: {
          tenantId,
          subscriptionId,
          invoiceNumber,
          fiscalYear,
          sequenceNumber: sequence.lastNumber,
          subtotalAmount: minorToMajor(tax.subtotalMinor, profile.currency),
          amountDue: minorToMajor(tax.totalMinor, profile.currency),
          taxAmount: minorToMajor(tax.taxMinor, profile.currency),
          cgstAmount: minorToMajor(tax.cgstMinor, profile.currency),
          sgstAmount: minorToMajor(tax.sgstMinor, profile.currency),
          igstAmount: minorToMajor(tax.igstMinor, profile.currency),
          totalAmount: minorToMajor(tax.totalMinor, profile.currency),
          currency: profile.currency,
          dueDate,
          status: InvoiceStatus.OPEN,
          issuedAt,
          billingSnapshot: {
            legalName: profile.legalName,
            billingEmail: profile.billingEmail,
            address: profile.address,
            gstin: profile.gstin,
            pan: profile.pan,
            planId: subscription.planId,
            planName: subscription.plan.name,
            seatCount: subscription.seatCount,
          },
          taxSnapshot: {
            rateBasisPoints: tax.rateBasisPoints,
            intraState: tax.intraState,
            supplierGstin: process.env.BILLING_SUPPLIER_GSTIN ?? null,
          },
          lineItems: {
            create: {
              tenantId,
              description,
              quantity: subscription.seatCount,
              unitAmount: subscription.plan.pricePerUser,
              amount: minorToMajor(subtotal, profile.currency),
              taxRate: tax.rateBasisPoints / 100,
            },
          },
        },
        include: { lineItems: true },
      });
    });
    const snapshot = invoice.billingSnapshot as Record<string, unknown>;
    const item = invoice.lineItems[0];
    const pdf = renderInvoicePdf({
      invoiceNumber: invoice.invoiceNumber,
      issuedOn: invoice.issuedAt!.toISOString().slice(0, 10),
      dueOn: invoice.dueDate.toISOString().slice(0, 10),
      sellerName: process.env.BILLING_LEGAL_NAME ?? 'DeltCRM Solutions',
      sellerGstin: process.env.BILLING_SUPPLIER_GSTIN,
      customerName: String(snapshot.legalName),
      customerGstin: scalarText(snapshot.gstin),
      currency: invoice.currency,
      subtotal: invoice.subtotalAmount.toString(),
      cgst: invoice.cgstAmount.toString(),
      sgst: invoice.sgstAmount.toString(),
      igst: invoice.igstAmount.toString(),
      total: invoice.totalAmount.toString(),
      description: item.description,
      quantity: item.quantity.toString(),
      unitAmount: item.unitAmount.toString(),
    });
    const checksum = createHash('sha256').update(pdf).digest('hex');
    const objectKey = await this.storage.putInvoice(tenantId, invoice.id, pdf);
    const completed = await this.prisma.forTenant(async (tx) => {
      const updated = await tx.tenantInvoice.update({
        where: { id: invoice.id },
        data: { objectKey, pdfChecksum: checksum },
        include: { lineItems: true },
      });
      await Promise.all([
        this.audit.append(tx, {
          tenantId,
          action: 'billing.invoice.issued',
          module: 'billing',
          entityType: 'TenantInvoice',
          entityId: invoice.id,
          newValue: {
            invoiceNumber: invoice.invoiceNumber,
            total: invoice.totalAmount,
            currency: invoice.currency,
            checksum,
          },
        }),
        this.outbox.append(tx, {
          tenantId,
          eventKey: 'billing.invoice.issued',
          payload: {
            tenantId,
            invoiceId: invoice.id,
            invoiceNumber: invoice.invoiceNumber,
            total: invoice.totalAmount.toString(),
            currency: invoice.currency,
          },
        }),
      ]);
      return updated;
    });
    return { data: serialize(completed) };
  }

  private currentSubscription(tx: PrismaTransaction) {
    return tx.tenantSubscription
      .findFirst({
        where: { status: { in: CURRENT_SUBSCRIPTIONS } },
        include: {
          plan: { include: { modules: { include: { module: true } } } },
          history: { orderBy: { createdAt: 'desc' }, take: 10 },
        },
        orderBy: { updatedAt: 'desc' },
      })
      .then((subscription) => {
        if (!subscription)
          this.notFound('SUBSCRIPTION_NOT_FOUND', 'Current subscription');
        return subscription;
      });
  }

  private findInvoice(tx: PrismaTransaction, id: string) {
    return tx.tenantInvoice
      .findUnique({
        where: { id },
        include: { lineItems: true, transactions: true },
      })
      .then((invoice) => {
        if (!invoice) this.notFound('INVOICE_NOT_FOUND', 'Invoice');
        return invoice;
      });
  }

  private async replaceBundle(
    tx: PrismaTransaction,
    bundle: Array<{ moduleId: string; module: { key: string } }>,
    actorUserId: string,
  ) {
    await tx.tenantModule.updateMany({
      where: { isActive: true },
      data: { isActive: false },
    });
    const now = new Date();
    for (const item of bundle) {
      await tx.tenantModule.upsert({
        where: {
          tenantId_moduleId: {
            tenantId: this.tenantId(),
            moduleId: item.moduleId,
          },
        },
        update: { isActive: true, activatedAt: now, activatedBy: actorUserId },
        create: {
          tenantId: this.tenantId(),
          moduleId: item.moduleId,
          isActive: true,
          activatedAt: now,
          activatedBy: actorUserId,
        },
      });
    }
  }

  private proration(
    current: {
      seatCount: number;
      currentPeriodStart: Date;
      currentPeriodEnd: Date;
      plan: { pricePerUser: Prisma.Decimal; currency: string };
    },
    target: { pricePerUser: Prisma.Decimal; currency: string },
  ) {
    const now = Date.now();
    const periodMs = Math.max(
      1,
      current.currentPeriodEnd.getTime() - current.currentPeriodStart.getTime(),
    );
    const remainingMs = Math.max(0, current.currentPeriodEnd.getTime() - now);
    const currentMinor =
      majorToMinor(
        current.plan.pricePerUser.toString(),
        current.plan.currency,
      ) * BigInt(current.seatCount);
    const targetMinor =
      majorToMinor(target.pricePerUser.toString(), target.currency) *
      BigInt(current.seatCount);
    const difference = targetMinor - currentMinor;
    const prorated =
      (difference * BigInt(remainingMs) + BigInt(periodMs / 2)) /
      BigInt(periodMs);
    return {
      currency: target.currency,
      currentMinor,
      targetMinor,
      dueMinor: prorated > 0n ? prorated : 0n,
      creditMinor: prorated < 0n ? -prorated : 0n,
      effectiveAt: new Date().toISOString(),
    };
  }

  private assertMutable(actor: MutationActor) {
    if (actor.impersonationSessionId) {
      throw new ForbiddenException({
        code: 'IMPERSONATION_NOT_ALLOWED',
        message: 'Billing changes are disabled during impersonation',
      });
    }
  }

  private tenantId() {
    if (!this.context.tenantId) throw new Error('Tenant context is required');
    return this.context.tenantId;
  }

  private notFound(code: string, resource: string): never {
    throw new NotFoundException({ code, message: `${resource} was not found` });
  }
}

function scalarText(value: unknown): string | null {
  return typeof value === 'string' || typeof value === 'number'
    ? String(value)
    : null;
}

function fiscalYearFor(date: Date) {
  const year = date.getUTCFullYear();
  const start = date.getUTCMonth() >= 3 ? year : year - 1;
  return `FY${start}-${String(start + 1).slice(-2)}`;
}

function serializePreview(preview: ReturnType<BillingService['proration']>) {
  return {
    currency: preview.currency,
    currentAmount: minorToMajor(preview.currentMinor, preview.currency),
    targetAmount: minorToMajor(preview.targetMinor, preview.currency),
    amountDue: minorToMajor(preview.dueMinor, preview.currency),
    creditAmount: minorToMajor(preview.creditMinor, preview.currency),
    effectiveAt: preview.effectiveAt,
  };
}

function serialize<T>(value: T): T {
  return JSON.parse(
    JSON.stringify(value, (_key, item: unknown) =>
      Prisma.Decimal.isDecimal(item) ? item.toString() : item,
    ),
  ) as T;
}
