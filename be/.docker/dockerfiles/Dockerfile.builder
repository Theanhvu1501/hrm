# Builder stage - compiles TypeScript to JavaScript
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json yarn.lock ./

# Install all dependencies (including devDependencies)
RUN yarn install --frozen-lockfile

# Copy source code
COPY . .

# Build argument for service name
ARG SERVICE_NAME=gateway

# Build the specific service
RUN yarn build:${SERVICE_NAME}

# Prune dev dependencies
RUN yarn install --frozen-lockfile --production && \
    yarn cache clean
