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
RUN npm upgrade jwa

# Build application
RUN npm run build

# Prod-Only Deps prunen
RUN npm prune --omit=dev

# ------------ Runtime Image -------------
# Use the official Node.js image as the base image
FROM node:22 AS runtime

# Set the working directory inside the container
WORKDIR /usr/src/app/output-api

# Copy distributables from build container
COPY --from=build /usr/src/app/output-api/node_modules ./node_modules
COPY --from=build /usr/src/app/output-api/dist ./dist

# Copy environment file
ENV NODE_ENV=dev PORT=3000
# TODO take env file from parameter
COPY output-api/env.dev .
# link any localhost refences to internal docker host
RUN sed -i 's/localhost/host.docker.internal/g' env.dev
# replace TS paths with JS pendants
RUN sed -i 's/output-api\/src\/.*\/*\.ts/dist\/output-api\/src\/.*\/*\.ts/g' env.dev

# create unprivileged user 
# ALPINE
# RUN addgroup -S nodejs && adduser -S nodeuser -G nodejs 
# DEBIAN
RUN groupadd -r nodejs && useradd -r -g nodejs nodeuser 
USER nodeuser

# Expose the application port
EXPOSE ${PORT}

HEALTHCHECK --interval=30s --timeout=3s --start-period=30s \
    CMD wget -qO- http://127.0.0.1:${PORT}/config/health || exit 1

# Command to run the application
CMD ["node", "dist/output-api/src/main.js"]