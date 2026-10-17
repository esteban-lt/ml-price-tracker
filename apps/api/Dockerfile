# syntax=docker/dockerfile:1

ARG NODE_VERSION=22.19.0
ARG ALPINE_VERSION=3.22
ARG BUN_VERSION=1.2.19

FROM oven/bun:${BUN_VERSION}-alpine AS bun

FROM node:${NODE_VERSION}-alpine${ALPINE_VERSION} AS build
COPY --from=bun /usr/local/bin/bun /usr/local/bin/bun
WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY nest-cli.json tsconfig.json tsconfig.build.json tsconfig.migrations.json ./
COPY src ./src
COPY migrations ./migrations
RUN bun run build

FROM node:${NODE_VERSION}-alpine${ALPINE_VERSION} AS prod-deps
COPY --from=bun /usr/local/bin/bun /usr/local/bin/bun
WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production

FROM node:${NODE_VERSION}-alpine${ALPINE_VERSION}
ENV NODE_ENV=production \
    PORT=3000
WORKDIR /app

COPY package.json ./
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist

USER node
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:' + process.env.PORT + '/health').then((r) => process.exit(r.ok ? 0 : 1), () => process.exit(1))"]

CMD ["node", "dist/main.js"]
