# Use Debian slim for more reliable multi-arch builds under emulation
FROM node:24-bookworm-slim

# Set working directory
WORKDIR /src

# Set environment variables
ENV NODE_ENV="production"

# Copy package*.json and .env dependencies
COPY package*.json ./
COPY .env.template ./.env

# Install necessary system packages and dependencies
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
    bash \
    vim \
    && npm ci --omit=dev --silent \
    && npm cache clean --force \
    && rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/* /usr/share/doc/*

# Copy the application code, already owned by the runtime user
COPY --chown=node:node frontend frontend
COPY --chown=node:node backend backend

# Run as the non-root "node" user (uid/gid 1000) shipped with the base image
USER node

# Set default command to start the application
CMD ["npm", "start"]