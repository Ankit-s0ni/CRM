import { defineConfig } from 'prisma/config';
import * as fs from 'fs';
import * as path from 'path';

const envPath = path.resolve(__dirname, '.env');
const envFile = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf-8') : '';
const dbUrlMatch = envFile.match(/DATABASE_URL="?([^"\n]+)"?/);
const dbUrl = process.env.DATABASE_URL ?? dbUrlMatch?.[1] ?? '';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'node prisma/seed.js',
  },
  datasource: {
    url: dbUrl,
  },
});
