# -------- Base Image for Building -------
# Use the official Node.js image as the base image
FROM node:22 AS build

# Set the working directory inside the container
WORKDIR /usr/src/app/

# Copy all source files to the image
COPY . .

# ---- Root Install & Build ----
# Install the application dependencies at the workspace root
RUN npm ci

# Build Backend
RUN npm run build:api

# Build Frontend
RUN npm run build:ui:prod

# Prod-Only Deps prune at root
RUN npm prune --omit=dev

# ------------ Runtime Image -------------
# Use the official Node.js image as the base image
FROM node:22 AS runtime

# ---- Backend ----
WORKDIR /usr/src/app

# install runtime packages
RUN apt-get update \
    && apt-get install -y --no-install-recommends nginx postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# create unprivileged user
RUN groupadd -r nodejs && useradd -r -g nodejs -d /home/nodeuser -m nodeuser

# Copy application files
COPY --chown=nodeuser:nodejs --from=build /usr/src/app/node_modules ./node_modules
COPY --chown=nodeuser:nodejs --from=build /usr/src/app/output-api/dist ./output-api/dist
COPY --chown=nodeuser:nodejs --from=build /usr/src/app/output-api/config ./output-api/config
COPY --chown=nodeuser:nodejs --from=build /usr/src/app/output-interfaces ./output-interfaces
COPY --chown=nodeuser:nodejs --from=build /usr/src/app/output-ui/dist/output-ui/browser/ ./output-ui-dist/

COPY --chown=nodeuser:nodejs output-api/env.template ./output-api/
COPY --chown=nodeuser:nodejs output-api/package.json ./output-api/
COPY --chown=nodeuser:nodejs --chmod=700 ./output-api/deploy/entrypoint.sh ./deploy/entrypoint.sh
COPY --chown=nodeuser:nodejs --chmod=700 ./output-api/deploy/init-entrypoint.sh ./deploy/init-entrypoint.sh
COPY --chown=nodeuser:nodejs ./output-api/deploy/nginx.conf ./deploy/nginx.conf.template

ENV HOME=/home/nodeuser
ENV NPM_CONFIG_CACHE=/tmp/.npm
ENV APP_DOCKER_MODE=true

EXPOSE 1080

USER nodeuser

RUN mkdir -p /usr/src/app/output-api/log

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD BASE="${BASE_HREF:-/}"; case "$BASE" in /*) ;; *) BASE="/$BASE";; esac; BASE="${BASE%/}/"; wget -qO- "http://localhost:1080${BASE}api/config/health" || exit 1

ENTRYPOINT ["/usr/src/app/deploy/entrypoint.sh"]
