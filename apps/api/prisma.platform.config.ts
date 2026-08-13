import { defineConfig } from 'prisma/config';
import * as fs from 'node:fs';
import * as path from 'node:path';

const envPath = path.resolve(__dirname, '.env');
const envFile = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
const matchEnv = (name: string) =>
  envFile.match(new RegExp(`${name}="?([^"\\n]+)"?`))?.[1];
const databaseUrl =
  process.env.PLATFORM_DATABASE_URL ??
  process.env.DATABASE_URL ??
  matchEnv('PLATFORM_DATABASE_URL') ??
  matchEnv('DATABASE_URL') ??
  '';

export default defineConfig({
  schema: 'prisma/platform/schema.prisma',
  migrations: {
    path: 'prisma/platform/migrations',
  },
  datasource: {
    url: databaseUrl,
  },
});
