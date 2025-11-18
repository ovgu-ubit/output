# -------- Base Image for Building -------
# Use the official Node.js image as the base image
FROM node:22 AS build

# Set the working directory inside the container
WORKDIR /usr/src/app/

# Copy all source files to the image
COPY . .

# ---- Backend ----
WORKDIR /usr/src/app/output-api

# Install the application dependencies
RUN npm i
RUN npm audit fix 2>&1 > /deploy/deploy.log || echo "Errors while performing audit fix for api"
RUN npm upgrade jwa

# Build application
RUN npm run build

# Prod-Only Deps prunen
RUN npm prune --omit=dev

# ---- Frontend ----
WORKDIR /usr/src/app/output-ui
RUN npm i
RUN npm audit fix 2>&1 > /deploy/deploy.log || echo "Errors while performing audit fix for ui"

RUN sed -i "s|api( )?:( )?'.*/?',|api: 'api/',|g" src/environments/environment.ts

RUN npm run build

# ------------ Runtime Image -------------
# Use the official Node.js image as the base image
FROM node:22 AS runtime

# ---- Backend ----
WORKDIR /usr/src/app/output-api

# Copy distributables from build container
COPY --from=build /usr/src/app/output-api/node_modules ./node_modules
COPY --from=build /usr/src/app/output-api/dist ./dist

# Copy environment file
ENV APP_DOCKER_MODE=true
COPY output-api/env.template .
COPY output-api/package.json .

# ---- Frontend ----
WORKDIR /usr/src/app/
# install nginx
RUN apt-get update && apt-get install -y nginx
RUN mkdir -p /var/log/nginx /run/nginx

# copy distributables
ENV DIST_PATH=/var/www/html/
#ENV DIST_PATH=/var/www/html/
RUN rm -rf ${DIST_PATH}*
COPY --from=build /usr/src/app/output-ui/dist/output-ui/browser/ ${DIST_PATH}

# copy config
RUN rm -f /etc/nginx/sites-enabled/* /etc/nginx/conf.d/*
COPY ./output-api/deploy/nginx.conf /etc/nginx/nginx.conf

# copy run script
COPY ./output-api/deploy/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# create unprivileged user 
# ALPINE
# RUN addgroup -S nodejs && adduser -S nodeuser -G nodejs 
# DEBIAN
RUN groupadd -r nodejs && useradd -r -g nodejs nodeuser 
#USER nodeuser

EXPOSE 80

ENTRYPOINT ["/entrypoint.sh"]

# Expose the application port
#EXPOSE ${PORT}

#HEALTHCHECK --interval=30s --timeout=3s --start-period=30s \
#    CMD wget -qO- http://127.0.0.1:${PORT}/api/config/health || exit 1

# Command to run the application
#CMD ["node", "dist/output-api/src/main.js"]