# Multi-stage build for the Product Service.
# Stage 1 installs dependencies; stage 2 copies ONLY what's needed to run.
# Anything left behind in stage 1 (npm cache, lockfile tooling) never reaches
# the final image, which keeps it small and reduces the attack surface.

# Base images come from Amazon ECR Public's mirror of the official Docker Hub
# images. Identical images, but no Docker Hub rate limits - which matter in
# CodeBuild, where many customers share the same outbound IP addresses.

# ---------- Stage 1: install production dependencies ----------
FROM public.ecr.aws/docker/library/node:22-alpine AS deps
WORKDIR /app

# Copy ONLY the dependency manifests first. Docker caches each layer, so as
# long as package*.json don't change, rebuilding after a code edit skips
# "npm ci" entirely - builds go from minutes to seconds.
COPY package.json package-lock.json ./

# npm ci: exact versions from the lockfile (reproducible builds).
# --omit=dev: production dependencies only.
RUN npm ci --omit=dev && npm cache clean --force

# ---------- Stage 2: runtime image ----------
FROM public.ecr.aws/docker/library/node:22-alpine AS runtime

# Tells Express and other libraries to run in production mode.
ENV NODE_ENV=production \
    PORT=3000
WORKDIR /app

# Copy the installed node_modules from stage 1, then the app code.
# --chown makes the files owned by the non-root "node" user.
COPY --from=deps --chown=node:node /app/node_modules ./node_modules
COPY --chown=node:node package.json ./
COPY --chown=node:node src ./src

# Run as the unprivileged "node" user that the official image provides,
# never as root - if the app were compromised, the attacker isn't root.
USER node

# Documents the port the app listens on (ECS maps it in the task definition).
EXPOSE 3000

# Container-level health check for local Docker runs.
# (ECS uses the healthCheck in the task definition instead, and the ALB
#  uses its target group health check - both will hit the same /health path.)
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1

# Exec form (JSON array) so node runs as PID 1 and receives SIGTERM directly,
# which is what makes the graceful shutdown in server.js work.
CMD ["node", "src/server.js"]
