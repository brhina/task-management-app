# ──────────────────────────────────────────
# Server Dockerfile
# Builds and runs the Express / Node.js API
# ──────────────────────────────────────────
FROM node:20-alpine AS production

# Install curl & ca-certificates for health-checks
RUN apk add --no-cache ca-certificates curl

WORKDIR /app
ENV NODE_ENV=production

# Install production dependencies only
COPY package*.json ./
RUN npm ci --only=production

# Copy server source code
COPY . .

# Ensure persistent uploads directory exists with correct ownership
RUN mkdir -p uploads && chown -R node:node /app

# Switch to non-root user for security
USER node

# Expose API port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3001/health || exit 1

# Start production server
CMD ["node", "--import", "tsx", "server.ts"]
