FROM node:22-alpine

# Install pnpm
RUN corepack enable && corepack prepare pnpm@11.1.2 --activate

WORKDIR /app

# Copy the entire monorepo
COPY . .

# Install dependencies for the whole workspace
RUN pnpm install --frozen-lockfile

# Note: Next.js requires environment variables like NEXT_PUBLIC_API_URL 
# to be passed DURING the build process, so ensure they are provided to the Docker build argument.
# Build the Next.js frontend
RUN pnpm --filter web build

# Expose frontend port
EXPOSE 4002

# Start the Web app
CMD ["pnpm", "--filter", "web", "start"]
