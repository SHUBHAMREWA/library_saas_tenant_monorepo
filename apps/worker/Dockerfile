FROM node:20-alpine AS base
WORKDIR /app
RUN npm install -g pnpm@11.10.0

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/ ./packages/
COPY apps/worker/ ./apps/worker/

RUN pnpm install --frozen-lockfile
RUN pnpm --filter @library/worker run build

CMD ["pnpm", "--filter", "@library/worker", "run", "start"]
