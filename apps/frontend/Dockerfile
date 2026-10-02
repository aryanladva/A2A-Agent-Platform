FROM node:20-alpine AS base
WORKDIR /app
RUN corepack enable

FROM base AS builder
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.json ./
COPY packages/shared-types ./packages/shared-types
COPY apps/frontend ./apps/frontend

RUN pnpm install --frozen-lockfile
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm --filter frontend run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

USER node
COPY --chown=node:node --from=builder /app/package.json ./package.json
COPY --chown=node:node --from=builder /app/node_modules ./node_modules
COPY --chown=node:node --from=builder /app/apps/frontend ./apps/frontend

EXPOSE 3000
CMD ["pnpm", "--filter", "frontend", "start"]
