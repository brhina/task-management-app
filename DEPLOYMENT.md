# Production Deployment Guide

This guide covers the **decoupled** deployment model for the Task Management Application: the **server** (Express API) and the **client** (React SPA) are built and deployed as separate containers.

---

## Project Structure

```
task-management-app/
├── server/           ← Express API
│   ├── Dockerfile    ← Server image
│   └── .dockerignore
├── client/           ← React / Vite SPA
│   ├── Dockerfile    ← Client image (Nginx)
│   ├── nginx.conf    ← SPA routing + caching config
│   └── .dockerignore
├── docker-compose.yml        ← Local/dev stack (4 services)
└── docker-compose.prod.yml   ← Production stack (4 services)
```

---

## 🚀 Strategy 1: Docker Compose (Self-Hosted VPS)

Ideal for a single VPS (Ubuntu/Debian). Runs the API, Nginx SPA, MongoDB, and Redis with health-checks and persistent volumes.

### Development / Local

```bash
docker-compose up -d --build
# API  →  http://localhost:3001
# App  →  http://localhost
```

### Production

1. **Copy and configure environment variables**:

   ```bash
   cp .env.example .env
   nano .env
   ```

   Set at minimum: `NODE_ENV=production`, `JWT_SECRET`, `MONGO_URI`, `REDIS_URL`, `CLIENT_URL`, `VITE_API_BASE_URL`.

2. **Launch the production stack**:

   ```bash
   docker-compose -f docker-compose.prod.yml up -d --build
   ```

3. **Verify health**:

   ```bash
   docker-compose -f docker-compose.prod.yml ps
   curl http://localhost:3001/health
   ```

4. **Add Nginx reverse proxy + SSL** (optional, if you want a single domain):

   Install Nginx & Certbot on the host:

   ```bash
   sudo apt update && sudo apt install -y nginx certbot python3-certbot-nginx
   ```

   Sample `/etc/nginx/sites-available/taskmanager`:

   ```nginx
   server {
       listen 80;
       server_name app.yourdomain.com;
       return 301 https://$host$request_uri;
   }

   server {
       listen 443 ssl http2;
       server_name app.yourdomain.com;

       ssl_certificate /etc/letsencrypt/live/app.yourdomain.com/fullchain.pem;
       ssl_certificate_key /etc/letsencrypt/live/app.yourdomain.com/privkey.pem;

       # Frontend SPA
       location / {
           proxy_pass http://localhost:80;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
       }

       # API (optional — expose API on same domain under /api)
       location /api/ {
           proxy_pass http://localhost:3001;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
           client_max_body_size 50M;
       }
   }
   ```

   Enable and add SSL:

   ```bash
   sudo ln -s /etc/nginx/sites-available/taskmanager /etc/nginx/sites-enabled/
   sudo certbot --nginx -d app.yourdomain.com
   sudo systemctl reload nginx
   ```

---

## 🚀 Strategy 2: Build & Push Images Separately (CI/CD)

Build each image independently and push to a container registry (Docker Hub, GHCR, ECR, etc.).

```bash
# Build
docker build -t ghcr.io/yourorg/task-manager-server:latest ./server
docker build \
  --build-arg VITE_API_BASE_URL=https://api.yourdomain.com \
  -t ghcr.io/yourorg/task-manager-client:latest ./client

# Push
docker push ghcr.io/yourorg/task-manager-server:latest
docker push ghcr.io/yourorg/task-manager-client:latest
```

Or use the root npm shortcuts:

```bash
npm run docker:build          # builds both images locally
npm run docker:run:server     # runs the API on port 3001
npm run docker:run:client     # runs the SPA on port 80
```

---

## 🚀 Strategy 3: Managed Platforms (Fully Decoupled)

Deploy each service to the platform that suits it best.

| Part | Platform Options | Key Setting |
|---|---|---|
| **Server (API)** | Render, Railway, Fly.io, AWS App Runner | Set all env vars via platform dashboard |
| **Client (SPA)** | Vercel, Netlify, Cloudflare Pages, or any static host | `VITE_API_BASE_URL=https://api.yourdomain.com` at build time |
| **MongoDB** | MongoDB Atlas | Use connection string in `MONGO_URI` |
| **Redis** | Upstash, Redis Cloud, AWS ElastiCache | Use connection string in `REDIS_URL` |

#### Server — Render example

1. Create a new **Web Service** pointing to the `server/` directory.
2. Set **Dockerfile** path to `server/Dockerfile`.
3. Add environment variables (`MONGO_URI`, `REDIS_URL`, `JWT_SECRET`, `CLIENT_URL`, …).

#### Client — Vercel / Netlify example

1. Connect the repository and set the **root directory** to `client/`.
2. Build command: `npm run build`
3. Output directory: `dist`
4. Environment variable: `VITE_API_BASE_URL=https://api.yourdomain.com`

---

## 🔑 Environment Variables Reference

| Variable | Required | Example | Purpose |
|---|---|---|---|
| `NODE_ENV` | Yes | `production` | Enables production optimizations |
| `PORT` | Yes | `3001` | API HTTP port |
| `MONGO_URI` | Yes | `mongodb+srv://…` | MongoDB connection |
| `REDIS_URL` | Yes | `rediss://…` | Redis connection |
| `JWT_SECRET` | Yes | *(64-byte hex)* | JWT signing secret |
| `ADMIN_INVITE_TOKEN` | Yes | *(random string)* | Admin registration token |
| `CLIENT_URL` | Yes | `https://app.yourdomain.com` | CORS origin & email links |
| `VITE_API_BASE_URL` | Yes (client build) | `https://api.yourdomain.com` | API endpoint baked into the SPA |
| `AWS_S3_BUCKET` | Optional | `my-uploads-bucket` | S3 bucket for file uploads |
| `SMTP_HOST` | Optional | `smtp.mailtrap.io` | SMTP host for emails |

---

## 🔒 Security Checklist

- [ ] Generate a strong `JWT_SECRET`: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`
- [ ] Configure MongoDB Atlas IP allow-listing.
- [ ] Enforce HTTPS/SSL on both the client domain and the API domain.
- [ ] Set up daily automated database backups.
- [ ] Verify the health endpoint: `curl https://api.yourdomain.com/health`

---

## 📊 Backup

### MongoDB

```bash
mongodump --uri="mongodb+srv://<user>:<password>@cluster.mongodb.net/taskmanager" --out=./backups/$(date +%F)
```

### Uploads Volume

```bash
tar -czf ./backups/uploads-$(date +%F).tar.gz uploads/
```
