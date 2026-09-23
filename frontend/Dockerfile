# Multi-Stage Production Dockerfile for Aegis Dispatch Frontend
# Stage 1: Build production bundle with Node 22 Alpine
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package descriptors and install clean dependencies
COPY package*.json ./
RUN npm ci

# Copy source code and build production assets
COPY . .
RUN npm run build

# Stage 2: Serve through optimized Nginx Alpine
FROM nginx:alpine-slim

LABEL maintainer="Aegis CAD Systems <dev@aegisdispatch.internal>"
LABEL version="2.5-pro"
LABEL description="Aegis Dispatch CAD React 18 Production Web Client"

# Install curl for healthcheck
RUN apk add --no-cache curl

# Copy custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy compiled SPA bundle from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost/health || exit 1

CMD ["nginx", "-g", "daemon off;"]
