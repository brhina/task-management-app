# Multi-stage Dockerfile for Task Management Application

# Stage 1: Build Frontend Client
FROM node:20-alpine AS client-builder
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

# Stage 2: Build Production Application
FROM node:20-alpine AS production
WORKDIR /app

ENV NODE_ENV=production

# Install server dependencies
COPY server/package*.json ./
RUN npm ci --only=production

# Copy server application files
COPY server/ ./

# Copy compiled static frontend assets
COPY --from=client-builder /app/client/dist ./client/dist

# Ensure persistent uploads directory exists
RUN mkdir -p uploads

# Expose HTTP port
EXPOSE 3001

# Run API server
CMD ["npm", "start"]
