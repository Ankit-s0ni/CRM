const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const user = await prisma.platformUser.findUnique({ where: { email: 'owner@deltcrm.local' }});
  console.log('User:', user);
}
main().finally(() => prisma.$disconnect());
