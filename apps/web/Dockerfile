# syntax=docker/dockerfile:1.7
FROM node:22-alpine

ARG NEXT_PUBLIC_API_URL=http://localhost:4080
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

# Install pnpm
RUN corepack enable && corepack prepare pnpm@11.1.2 --activate

WORKDIR /app

# Copy the entire monorepo
COPY . .

# Install dependencies for the whole workspace
RUN --mount=type=secret,id=npm_token \
    NODE_AUTH_TOKEN="$(cat /run/secrets/npm_token)" pnpm install --frozen-lockfile

# Note: Next.js requires environment variables like NEXT_PUBLIC_API_URL 
# to be passed DURING the build process, so ensure they are provided to the Docker build argument.
# Build the Next.js frontend
RUN pnpm --filter web build

# Expose frontend port
EXPOSE 4022

# Start the Web app
CMD ["pnpm", "--filter", "web", "exec", "next", "start", "--port", "4022"]
