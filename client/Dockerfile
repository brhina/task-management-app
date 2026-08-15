# ──────────────────────────────────────────────────────
# Client Dockerfile
# Stage 1 – Build the Vite/React SPA
# Stage 2 – Serve the static assets with Nginx
# ──────────────────────────────────────────────────────

# ── Stage 1: Build ──────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Pass the API base URL at build time
ARG VITE_API_BASE_URL=""
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}

# Copy source and build production assets
COPY . .
RUN npm run build

# ── Stage 2: Serve ──────────────────────────────────
FROM nginx:1.27-alpine AS production

# Remove default Nginx config and replace with SPA-friendly one
RUN rm /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose HTTP port
EXPOSE 80

# Nginx runs in the foreground
CMD ["nginx", "-g", "daemon off;"]
