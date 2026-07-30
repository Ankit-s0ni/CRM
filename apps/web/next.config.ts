import type { NextConfig } from "next";
import path from "node:path";

const nextIntlRequestConfig = "./src/i18n/request.ts";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
  distDir: ".next-build",
  turbopack: {
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
