import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

const nextIntlRequestConfig = "./src/i18n/request.ts";
const appDir = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(appDir, "../..");

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
  distDir: ".next-dev",
  turbopack: {
    root: workspaceRoot,
    resolveAlias: {
      "next-intl/config": nextIntlRequestConfig,
    },
  },
  webpack(config, context) {
    config.resolve ??= {};
    config.resolve.alias ??= {};
    config.resolve.alias["next-intl/config"] = path.resolve(
      context.dir,
      nextIntlRequestConfig,
    );

    return config;
  },
};

export default nextConfig;
