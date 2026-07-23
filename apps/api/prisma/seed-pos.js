const { PrismaClient } = require('@prisma/client');
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL || 'postgresql://app_admin:admin_password@localhost:5433/hrms_dev?schema=public' });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  const posModule = await prisma.module.upsert({
    where: { key: 'POS' },
    update: {
      name: 'Point of Sale',
      description: 'Inventory, product categories, and sales',
      icon: 'store',
      availability: 'AVAILABLE',
      kind: 'PRODUCT',
      catalogOrder: 20,
      customerVisible: true,
    },
    create: {
      key: 'POS',
      name: 'Point of Sale',
      description: 'Inventory, product categories, and sales',
      icon: 'store',
      kind: 'PRODUCT',
      catalogOrder: 20,
    },
  });

  const plan = await prisma.subscriptionPlan.findUnique({
    where: { name: 'Starter Trial' }
  });

  if (plan) {
    await prisma.subscriptionPlanModule.createMany({
      data: [{ planId: plan.id, moduleId: posModule.id }],
      skipDuplicates: true,
    });
    console.log('POS module added to Starter Trial plan');
  }

  // To make sure all tenants with Starter Trial get it, we don't strictly need to do anything else 
  // because the frontend checks /workspace/modules which looks up tenant -> subscription -> plan -> modules.

  console.log('POS module seeded successfully!');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
