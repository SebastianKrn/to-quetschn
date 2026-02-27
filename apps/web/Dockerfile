FROM node:22-bookworm AS builder
WORKDIR /workspace

RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps ./apps
COPY packages ./packages
COPY convex ./convex
COPY docs ./docs
COPY benchmarks ./benchmarks

RUN pnpm install --frozen-lockfile
RUN pnpm --filter @grifftab/web build

FROM node:22-bookworm-slim AS runtime
WORKDIR /workspace

ENV NODE_ENV=production

RUN corepack enable

COPY --from=builder /workspace /workspace

EXPOSE 3000

CMD ["pnpm", "--filter", "@grifftab/web", "start"]
