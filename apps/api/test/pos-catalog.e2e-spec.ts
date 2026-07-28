import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { AuthService } from '../src/platform/identity/auth.service';
import { TenantContextService } from '../src/platform/tenancy/public';
import { PosCatalogStorageService } from '../src/products/pos/catalog/infrastructure/pos-catalog-storage.service';

type ErrorBody = { code: string };

describe('POS catalog (e2e)', () => {
  let app: INestApplication<App>;
  let authService: AuthService;
  let storage: PosCatalogStorageService;
  let adminPrisma: PrismaClient;
  let adminPool: Pool;

  let tenantId = '';
  let token = '';
  let categoryId = '';
  let unitId = '';
  let productId = '';
  const stamp = `${Date.now()}-${process.pid}`;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication<INestApplication<App>>();
    await app.init();
    authService = moduleFixture.get(AuthService);
    storage = moduleFixture.get(PosCatalogStorageService);

    adminPool = new Pool({
      connectionString:
        process.env.DATABASE_URL ??
        'postgresql://app_admin:admin_password@localhost:5433/hrms_dev?schema=public',
    });
    adminPrisma = new PrismaClient({ adapter: new PrismaPg(adminPool) });

    const email = `pos-catalog+${stamp}@pos.example.com`;
    const signup = await authService.signup({
      companyName: `POS Catalog ${stamp}`,
      workEmail: email,
      password: 'Start123!',
      subdomain: `poscat-${stamp}`,
      employeeCount: '1-25 employees',
    });
    tenantId = signup.tenantId;
    token = (
      await TenantContextService.run({ tenantId }, () =>
        authService.login(email, 'Start123!', '127.0.0.1', 'jest'),
      )
    ).accessToken;

    const posModule = await adminPrisma.module.findUniqueOrThrow({
      where: { key: 'POS' },
    });
    await adminPrisma.tenantModule.upsert({
      where: { tenantId_moduleId: { tenantId, moduleId: posModule.id } },
      update: { isActive: true },
      create: { tenantId, moduleId: posModule.id, isActive: true },
    });
    await api().post('/pos/setup').expect(201);
  });

  afterAll(async () => {
    await cleanupCatalogTenant(adminPrisma, tenantId);
    await app.close();
    await adminPrisma.$disconnect();
    await adminPool.end();
  });

  it('seeds the default units through POS setup', async () => {
    const response = await api().get('/pos/units').expect(200);
    const units = (response.body as { data: Array<{ code: string }> }).data;
    expect(units.map(({ code }) => code)).toEqual(
      expect.arrayContaining(['PCS', 'KG', 'GRAM', 'DOZEN']),
    );

    const dozen = await adminPrisma.posUnitOfMeasure.findFirstOrThrow({
      where: { tenantId, code: 'DOZEN' },
    });
    // Conversion is modelled now even though nothing reads it until MVP-02.
    expect(dozen.baseUnitId).toBeTruthy();
    expect(dozen.conversionFactor?.toString()).toBe('12');
    unitId = units.find(({ code }) => code === 'PCS')!.code
      ? (
          await adminPrisma.posUnitOfMeasure.findFirstOrThrow({
            where: { tenantId, code: 'PCS' },
          })
        ).id
      : '';
  });

  it('creates a category and rejects moving it beneath itself', async () => {
    const created = await api()
      .post('/pos/categories')
      .send({ name: 'Beverages' })
      .expect(201);
    categoryId = (created.body as { data: { id: string } }).data.id;

    const child = await api()
      .post('/pos/categories')
      .send({ name: 'Coffee', parentId: categoryId })
      .expect(201);
    const childId = (child.body as { data: { id: string } }).data.id;

    const cycle = await api()
      .patch(`/pos/categories/${categoryId}`)
      .send({ parentId: childId })
      .expect(400);
    expect((cycle.body as ErrorBody).code).toBe('POS_CATEGORY_CYCLE');
  });

  it('creates a product and enforces SKU and barcode uniqueness', async () => {
    const taxGroup = await adminPrisma.posTaxGroup.findFirstOrThrow({
      where: { tenantId, name: 'Standard VAT 5%' },
    });

    const created = await api()
      .post('/pos/products')
      .send({
        name: 'Organic Coffee 250g',
        sku: 'COF-ORG-250',
        barcode: '8901234567890',
        categoryId,
        taxGroupId: taxGroup.id,
        unitOfMeasureId: unitId,
        costPrice: '2.500',
        sellingPrice: '4.500',
      })
      .expect(201);
    productId = (created.body as { data: { id: string } }).data.id;

    const duplicateSku = await api()
      .post('/pos/products')
      .send({
        name: 'Clash',
        sku: 'COF-ORG-250',
        costPrice: '1.000',
        sellingPrice: '2.000',
      })
      .expect(409);
    expect((duplicateSku.body as ErrorBody).code).toBe('POS_PRODUCT_DUPLICATE');

    // Nullable barcode + composite unique: many products may carry no barcode at all.
    await api()
      .post('/pos/products')
      .send({
        name: 'No Barcode A',
        sku: 'NB-A',
        costPrice: '1.000',
        sellingPrice: '2.000',
      })
      .expect(201);
    await api()
      .post('/pos/products')
      .send({
        name: 'No Barcode B',
        sku: 'NB-B',
        costPrice: '1.000',
        sellingPrice: '2.000',
      })
      .expect(201);
  });

  it('resolves a product by barcode and by SKU on the register hot path', async () => {
    const byBarcode = await api()
      .get('/pos/products/lookup?barcode=8901234567890')
      .expect(200);
    expect((byBarcode.body as { data: { sku: string } }).data.sku).toBe(
      'COF-ORG-250',
    );

    const bySku = await api().get('/pos/products/lookup?sku=NB-A').expect(200);
    expect((bySku.body as { data: { name: string } }).data.name).toBe(
      'No Barcode A',
    );

    await api().get('/pos/products/lookup?barcode=does-not-exist').expect(404);
  });

  it('generates a variant matrix additively', async () => {
    const first = await api()
      .post(`/pos/products/${productId}/variants/generate`)
      .send({ attributes: [{ name: 'Grind', values: ['Whole', 'Fine'] }] })
      .expect(201);
    expect((first.body as { meta: { created: number } }).meta.created).toBe(2);

    // Re-running with an extra value adds only the new combination.
    const second = await api()
      .post(`/pos/products/${productId}/variants/generate`)
      .send({
        attributes: [{ name: 'Grind', values: ['Whole', 'Fine', 'Espresso'] }],
      })
      .expect(201);
    expect(
      (second.body as { meta: { created: number; skipped: number } }).meta,
    ).toEqual({ created: 1, skipped: 2 });
  });

  it('refuses to nest a bundle inside a bundle', async () => {
    const componentIds = await adminPrisma.posProduct.findMany({
      where: { tenantId, sku: { in: ['NB-A', 'NB-B'] } },
      select: { id: true },
    });

    await api()
      .put(`/pos/products/${productId}/bundle`)
      .send({
        bundlePrice: '9.000',
        components: componentIds.map(({ id }) => ({
          productId: id,
          quantity: '1.000',
        })),
      })
      .expect(200);

    const nested = await api()
      .put(`/pos/products/${componentIds[0].id}/bundle`)
      .send({
        bundlePrice: '5.000',
        components: [{ productId, quantity: '1.000' }],
      })
      .expect(400);
    expect((nested.body as ErrorBody).code).toBe('POS_BUNDLE_NESTED');
  });

  it('imports a CSV, reports the bad row, and leaves the good rows applied', async () => {
    const presign = await api()
      .post('/pos/products/import/presign')
      .send({
        filename: 'products.csv',
        contentType: 'text/csv',
        fileSize: 512,
      })
      .expect(201);
    const { objectKey } = presign.body as { objectKey: string };

    // Stage the CSV without S3 — the storage service keeps an in-memory map under test.
    storage.putTestObject(
      objectKey,
      [
        'sku,name,costPrice,sellingPrice,category,unit',
        'IMP-1,Imported One,1.000,2.000,Beverages,PCS',
        'IMP-2,Imported Two,1.500,3.000,Beverages,PCS',
        'IMP-3,Bad Price,not-a-number,3.000,Beverages,PCS',
        'IMP-4,Unknown Category,1.000,2.000,Nope,PCS',
      ].join('\n'),
    );

    const registered = await api()
      .post('/pos/products/import')
      .send({ objectKey, idempotencyKey: `import-${stamp}` })
      .expect(201);
    const job = (
      registered.body as {
        data: {
          id: string;
          status: string;
          successRows: number;
          errorRows: number;
        };
      }
    ).data;

    // Inline queue mode under test means the import has already finished.
    expect(job.status).toBe('COMPLETED');
    expect(job.successRows).toBe(2);
    expect(job.errorRows).toBe(2);

    const applied = await adminPrisma.posProduct.findMany({
      where: { tenantId, sku: { in: ['IMP-1', 'IMP-2', 'IMP-3', 'IMP-4'] } },
      select: { sku: true },
    });
    expect(applied.map(({ sku }) => sku).sort()).toEqual(['IMP-1', 'IMP-2']);

    const errors = await api()
      .get(`/pos/products/import/${job.id}/errors`)
      .expect(200);
    expect((errors.body as { data: unknown[] }).data).toHaveLength(1);
  });

  it('replays an import registered with the same idempotency key', async () => {
    const presign = await api()
      .post('/pos/products/import/presign')
      .send({ filename: 'again.csv', contentType: 'text/csv', fileSize: 128 })
      .expect(201);
    const { objectKey } = presign.body as { objectKey: string };
    storage.putTestObject(
      objectKey,
      'sku,name,costPrice,sellingPrice\nIMP-9,Nine,1.000,2.000',
    );

    const first = await api()
      .post('/pos/products/import')
      .send({ objectKey, idempotencyKey: `replay-${stamp}` })
      .expect(201);
    const second = await api()
      .post('/pos/products/import')
      .send({ objectKey, idempotencyKey: `replay-${stamp}` })
      .expect(201);

    expect((second.body as { replayed: boolean }).replayed).toBe(true);
    expect((second.body as { data: { id: string } }).data.id).toBe(
      (first.body as { data: { id: string } }).data.id,
    );
    expect(
      await adminPrisma.posProduct.count({ where: { tenantId, sku: 'IMP-9' } }),
    ).toBe(1);
  });

  it('exports CSV that round-trips back through the importer', async () => {
    const response = await api().get('/pos/products/export').expect(200);
    const csv = response.text;
    const [header, ...rows] = csv.trim().split('\n');

    expect(header.split(',')).toEqual([
      'sku',
      'name',
      'barcode',
      'description',
      'brand',
      'category',
      'taxGroup',
      'unit',
      'costPrice',
      'sellingPrice',
      'mrp',
      'wholesalePrice',
      'trackInventory',
      'reorderPoint',
      'reorderQuantity',
    ]);
    expect(rows.some((row) => row.startsWith('COF-ORG-250,'))).toBe(true);

    // Re-importing the export in UPSERT mode must be a no-op, not a duplicate storm.
    const before = await adminPrisma.posProduct.count({ where: { tenantId } });
    const presign = await api()
      .post('/pos/products/import/presign')
      .send({ filename: 'round.csv', contentType: 'text/csv', fileSize: 1024 })
      .expect(201);
    const { objectKey } = presign.body as { objectKey: string };
    storage.putTestObject(objectKey, csv);

    const job = await api()
      .post('/pos/products/import')
      .send({ objectKey, mode: 'UPSERT' })
      .expect(201);
    expect((job.body as { data: { errorRows: number } }).data.errorRows).toBe(
      0,
    );
    expect(await adminPrisma.posProduct.count({ where: { tenantId } })).toBe(
      before,
    );
  });

  it('deactivates rather than deletes a product', async () => {
    await api().delete(`/pos/products/${productId}`).expect(200);
    const product = await adminPrisma.posProduct.findUniqueOrThrow({
      where: { id: productId },
    });
    expect(product.isActive).toBe(false);
  });

  function api() {
    const server = request(app.getHttpServer());
    const headers = (req: request.Test) =>
      req.set('Authorization', `Bearer ${token}`).set('x-tenant-id', tenantId);
    return {
      get: (path: string) => headers(server.get(path)),
      post: (path: string) => headers(server.post(path)),
      patch: (path: string) => headers(server.patch(path)),
      put: (path: string) => headers(server.put(path)),
      delete: (path: string) => headers(server.delete(path)),
    };
  }
});

async function cleanupCatalogTenant(prisma: PrismaClient, tenantId: string) {
  if (!tenantId) return;
  const users = await prisma.user.findMany({
    where: { tenantId },
    select: { id: true },
  });
  const roles = await prisma.role.findMany({
    where: { tenantId },
    select: { id: true },
  });
  const userIds = users.map(({ id }) => id);
  const roleIds = roles.map(({ id }) => id);

  await prisma.posProductImportRow.deleteMany({ where: { tenantId } });
  await prisma.posProductImportJob.deleteMany({ where: { tenantId } });
  await prisma.posBundleComponent.deleteMany({ where: { tenantId } });
  await prisma.posBundle.deleteMany({ where: { tenantId } });
  await prisma.posVariant.deleteMany({ where: { tenantId } });
  await prisma.posProduct.deleteMany({ where: { tenantId } });
  await prisma.posCategory.updateMany({
    where: { tenantId },
    data: { parentId: null },
  });
  await prisma.posCategory.deleteMany({ where: { tenantId } });
  await prisma.posUnitOfMeasure.updateMany({
    where: { tenantId },
    data: { baseUnitId: null },
  });
  await prisma.posUnitOfMeasure.deleteMany({ where: { tenantId } });
  await prisma.posTaxGroupRate.deleteMany({ where: { tenantId } });
  await prisma.posTaxGroup.deleteMany({ where: { tenantId } });
  await prisma.posTaxRate.deleteMany({ where: { tenantId } });
  await prisma.posOutlet.deleteMany({ where: { tenantId } });
  await prisma.posInvoiceSequence.deleteMany({ where: { tenantId } });
  await prisma.posSettings.deleteMany({ where: { tenantId } });

  await prisma.outboxEvent.deleteMany({ where: { tenantId } });
  await prisma.tenantAuditLog.deleteMany({ where: { tenantId } });
  await prisma.tenantModule.deleteMany({ where: { tenantId } });
  await prisma.userRole.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.rolePermission.deleteMany({
    where: { roleId: { in: roleIds } },
  });
  await prisma.refreshToken.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.verificationToken.deleteMany({ where: { tenantId } });
  await prisma.loginAttempt.deleteMany({ where: { tenantId } });
  await prisma.employee.deleteMany({ where: { tenantId } });
  await prisma.department.deleteMany({ where: { tenantId } });
  await prisma.designation.deleteMany({ where: { tenantId } });
  await prisma.user.deleteMany({ where: { tenantId } });
  await prisma.role.deleteMany({ where: { tenantId } });
  await prisma.tenantSettings.deleteMany({ where: { tenantId } });
  await prisma.tenantSubscription.deleteMany({ where: { tenantId } });
  await prisma.tenant.deleteMany({ where: { id: tenantId } });
}
