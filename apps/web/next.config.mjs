import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prismaTracingFiles = [
  '../../packages/database/prisma/schema.prisma',
  '../../node_modules/.pnpm/@prisma+client*/**/.prisma/client/libquery_engine-rhel-openssl-3.0.x.so.node',
  '../../node_modules/.pnpm/@prisma+client*/**/.prisma/client/schema.prisma',
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@library/types', '@library/validation'],
  serverExternalPackages: ['@prisma/client', '@library/database'],
  outputFileTracingRoot: path.join(__dirname, '../../'),
  outputFileTracingIncludes: {
    '/api/admin/**/*': prismaTracingFiles,
    '/api/auth/**/*': prismaTracingFiles,
    '/api/coupons/**/*': prismaTracingFiles,
    '/api/libraries/**/*': prismaTracingFiles,
    '/api/notifications/**/*': prismaTracingFiles,
    '/api/webhooks/**/*': prismaTracingFiles,
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
