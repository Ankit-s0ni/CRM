FROM node:22-alpine

# Install pnpm
RUN corepack enable && corepack prepare pnpm@11.1.2 --activate

WORKDIR /app

# Copy the entire monorepo
COPY . .

# Install dependencies for the whole workspace
RUN pnpm install --frozen-lockfile

# Generate Prisma Client
RUN pnpm --filter api exec prisma generate

# Build the backend API
RUN pnpm --filter api build

# Expose backend port
EXPOSE 4001

# Start the API (this will also automatically apply database migrations on startup)
CMD ["sh", "-c", "npx prisma migrate deploy && pnpm --filter api start:prod"]
