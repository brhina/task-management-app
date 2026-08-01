# Production Multi-stage Dockerfile for Task Management Application

# ------------------------------------------
# Stage 1: Build Frontend Client
# ------------------------------------------
FROM node:20-alpine AS client-builder
WORKDIR /app/client

# Copy client dependency manifests & install
COPY client/package*.json ./
RUN npm ci

# Copy client source code and build production assets
COPY client/ ./
ARG VITE_API_BASE_URL=""
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
RUN npm run build

# ------------------------------------------
# Stage 2: Production Application Server
# ------------------------------------------
FROM node:20-alpine AS production

# Install curl / ca-certificates for healthcheck & network tools
RUN apk add --no-cache ca-certificates curl

WORKDIR /app
ENV NODE_ENV=production

# Install server production dependencies only
COPY server/package*.json ./
RUN npm ci --only=production

# Copy server code
COPY server/ ./

# Copy compiled frontend static assets from client-builder
COPY --from=client-builder /app/client/dist ./client/dist

# Ensure persistent uploads directory exists with correct ownership
RUN mkdir -p uploads && chown -R node:node /app

# Switch to non-root user for security
USER node

# Expose server HTTP port
EXPOSE 3001

# Health check configuration
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3001/health || exit 1

# Start production server
CMD ["npm", "start"]
