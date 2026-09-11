import path from 'path';
import { fileURLToPath } from 'url';
import { PrismaPlugin } from '@prisma/nextjs-monorepo-workaround-plugin';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@library/types', '@library/validation'],
  serverExternalPackages: ['@prisma/client', '@library/database'],
  outputFileTracingRoot: path.join(__dirname, '../../'),
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.plugins = [...config.plugins, new PrismaPlugin()];
    }
    return config;
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
    ],
  },
};

export default nextConfig;
