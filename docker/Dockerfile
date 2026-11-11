# Keep the build and native runtime dependencies on the same Node/Debian image.
FROM node:25-bookworm-slim@sha256:81db02c4b671288a03915da9534dbd54f96d0e7c24d80ccc54f5b36b2e684370 AS build

WORKDIR /logs
COPY package.json package-lock.json ./
# sqlite3 can need a native build when a prebuilt binary is unavailable.
RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 make g++ \
    && rm -rf /var/lib/apt/lists/*
RUN npm ci
COPY . .
RUN npm run build && npm prune --omit=dev

FROM node:25-bookworm-slim@sha256:81db02c4b671288a03915da9534dbd54f96d0e7c24d80ccc54f5b36b2e684370 AS runtime
ENV NODE_ENV=production
WORKDIR /logs
COPY --from=build --chown=node:node /logs/package.json /logs/package-lock.json ./
COPY --from=build --chown=node:node /logs/node_modules ./node_modules
COPY --from=build --chown=node:node /logs/dist ./dist
COPY --from=build --chown=node:node /logs/views ./views
COPY --chown=node:node docker/healthcheck.cjs ./docker/healthcheck.cjs
# Winston creates debug.log in the working directory.
RUN chown node:node /logs
USER node
HEALTHCHECK --interval=60s --timeout=10s --start-period=10s --retries=3 \
    CMD ["node", "docker/healthcheck.cjs"]
# Node is PID 1; Compose init forwards signals and reaps child processes.
CMD ["node", "dist/server.js"]
