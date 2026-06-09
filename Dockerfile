# -------- Base Image for Building -------
# Use the official Node.js image as the base image
FROM node:22 AS build

# Set the working directory inside the container
WORKDIR /usr/src/app/

# Copy all source files to the image
COPY . .

# ---- Root Install & Build ----
# Install the application dependencies at the workspace root
RUN mkdir -p /deploy
RUN npm ci

# Build Backend
RUN npm run build:api
RUN npm audit fix -w output-api 2>&1 > /deploy/deploy.log || echo "Errors while performing audit fix for api"
RUN npm upgrade jwa -w output-api

# Build Frontend
RUN npm run build:ui:prod
RUN npm audit fix -w output-ui 2>&1 >> /deploy/deploy.log || echo "Errors while performing audit fix for ui"

# Prod-Only Deps prune at root
RUN npm prune --omit=dev
RUN mkdir -p output-api/node_modules output-interfaces/node_modules

# ------------ Runtime Image -------------
# Use the official Node.js image as the base image
FROM node:22 AS runtime

# ---- Backend ----
WORKDIR /usr/src/app

# Copy distributables from build container
COPY --from=build /deploy /deploy
COPY --from=build /usr/src/app/node_modules ./node_modules
COPY --from=build /usr/src/app/output-api/node_modules ./output-api/node_modules
COPY --from=build /usr/src/app/output-api/dist ./output-api/dist
COPY --from=build /usr/src/app/output-api/config ./output-api/config
COPY --from=build /usr/src/app/output-interfaces ./output-interfaces

# Copy environment file
ENV APP_DOCKER_MODE=true
COPY output-api/env.template ./output-api/
COPY output-api/package.json ./output-api/

# ---- Frontend ----
WORKDIR /usr/src/app/
# install nginx
RUN apt-get update && apt-get install -y nginx postgresql-client && rm -rf /var/lib/apt/lists/*

# copy distributables
ENV DIST_PATH=/var/www/html/
RUN rm -rf ${DIST_PATH}*
COPY --from=build /usr/src/app/output-ui/dist/output-ui/browser/ ${DIST_PATH}

# copy config
RUN rm -f /etc/nginx/sites-enabled/* /etc/nginx/conf.d/*
COPY ./output-api/deploy/nginx.conf /etc/nginx/nginx.conf

# copy run script
COPY ./output-api/deploy/entrypoint.sh /entrypoint.sh
COPY ./output-api/deploy/init-entrypoint.sh /init-entrypoint.sh
RUN chmod +x /*entrypoint.sh

# create unprivileged user
RUN groupadd -r nodejs && useradd -r -g nodejs -d /home/nodeuser -m nodeuser
RUN mkdir -p /usr/src/app/output-api/log \
    && chown nodeuser:nodejs /usr/src/app/output-api \
    && chown -R nodeuser:nodejs /usr/src/app/output-api/config /usr/src/app/output-api/log

ENV HOME=/home/nodeuser
ENV NPM_CONFIG_CACHE=/tmp/.npm

EXPOSE 1080

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD BASE="${BASE_HREF:-/}"; case "$BASE" in /*) ;; *) BASE="/$BASE";; esac; BASE="${BASE%/}/"; wget -qO- "http://localhost:1080${BASE}api/config/health" || exit 1

USER nodeuser
ENTRYPOINT ["/entrypoint.sh"]
