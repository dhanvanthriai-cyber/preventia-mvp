/** @type {import('next').NextConfig} */
const nextConfig = {
  // Transpile the local @dhanvanthri/shared package
  transpilePackages: ['@dhanvanthri/shared'],

  // Allow environment-driven API base URL
  env: {
    NEXT_PUBLIC_API_BASE_URL:
      process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8080',
  },
};

module.exports = nextConfig;
