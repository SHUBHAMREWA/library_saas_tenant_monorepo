FROM node:20-alpine AS base
WORKDIR /app
RUN npm install -g pnpm@11.10.0

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/ ./packages/
COPY apps/web/ ./apps/web/

RUN pnpm install --frozen-lockfile
RUN pnpm --filter @library/validation run build
RUN pnpm --filter @library/web run build

EXPOSE 3000
CMD ["pnpm", "--filter", "@library/web", "run", "start"]
