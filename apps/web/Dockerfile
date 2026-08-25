FROM node:24-alpine AS deps
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-workspace.yaml ./
COPY apps/web/package.json apps/web/package.json
RUN pnpm install --frozen-lockfile=false
FROM deps AS build
COPY apps/web apps/web
RUN pnpm --filter @trustfix/web build
FROM node:24-alpine AS runtime
ENV NODE_ENV=production PORT=8080
WORKDIR /app
RUN addgroup -S trustfix && adduser -S trustfix -G trustfix
COPY --from=build --chown=trustfix:trustfix /app/node_modules ./node_modules
COPY --from=build --chown=trustfix:trustfix /app/apps/web ./apps/web
USER trustfix
CMD ["node", "apps/web/node_modules/next/dist/bin/next", "start", "apps/web", "-p", "8080"]
