FROM node:20-alpine AS base
WORKDIR /app
RUN corepack enable

FROM base AS builder
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.json ./
COPY packages/shared-types ./packages/shared-types
COPY apps/orchestrator ./apps/orchestrator

RUN pnpm install --frozen-lockfile
RUN pnpm --filter orchestrator run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

USER node
COPY --chown=node:node --from=builder /app/package.json ./package.json
COPY --chown=node:node --from=builder /app/node_modules ./node_modules
COPY --chown=node:node --from=builder /app/packages/shared-types ./packages/shared-types
COPY --chown=node:node --from=builder /app/apps/orchestrator ./apps/orchestrator

EXPOSE 4100
CMD ["node", "apps/orchestrator/dist/index.js"]
