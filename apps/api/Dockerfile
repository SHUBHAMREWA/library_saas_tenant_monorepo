FROM node:20-alpine AS base
WORKDIR /app
RUN npm install -g pnpm@11.10.0

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/ ./packages/
COPY apps/api/ ./apps/api/

RUN pnpm install --frozen-lockfile
RUN pnpm --filter @library/validation run build
RUN pnpm --filter @library/api run build

EXPOSE 4000
CMD ["pnpm", "--filter", "@library/api", "run", "start"]
