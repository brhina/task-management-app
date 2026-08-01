# Production Deployment Guide & Strategies

This guide outlines the recommended deployment strategies and operational setup for the **Task Management Application**.

---

## 🚀 Recommended Deployment Strategies

### Strategy 1: Containerized Monolith (Recommended / Simplest)

Deploy the single multi-stage Docker image containing both the compiled React frontend and the Express Node.js backend. Express serves the frontend static build from `client/dist` and handles API routes `/api/*`.

- **Target Host Options**: Render, Railway, Fly.io, AWS App Runner, Google Cloud Run, or DigitalOcean App Platform.
- **Database**: Managed MongoDB Atlas Cluster.
- **Cache / Queue**: Managed Redis (Upstash, Redis Cloud, or AWS ElastiCache).

#### Step-by-Step Container Deployment:

1. **Build Container Image**:
   ```bash
   docker build -t task-manager:latest .
   ```

2. **Run Container**:
   ```bash
   docker run -d \
     --name task-manager \
     -p 3001:3001 \
     -e NODE_ENV=production \
     -e PORT=3001 \
     -e MONGO_URI="mongodb+srv://user:pass@cluster.mongodb.net/taskmanager" \
     -e REDIS_URL="rediss://:password@redis-host:6379" \
     -e JWT_SECRET="your-64-byte-hex-jwt-secret" \
     -e ADMIN_INVITE_TOKEN="your-secure-admin-token" \
     -e CLIENT_URL="https://yourdomain.com" \
     task-manager:latest
   ```

---

### Strategy 2: Self-Hosted Production Stack (Docker Compose & Nginx)

Ideal for dedicated VPS instances (Ubuntu / Debian / RHEL). Runs the App, MongoDB, and Redis with healthchecks and persistent volumes behind an Nginx reverse proxy with SSL certificates.

#### 1. Setup Environment File
Copy the primary template and edit your secrets:
```bash
cp .env.example .env
nano .env
```
Ensure `NODE_ENV=production`, `JWT_SECRET`, `MONGO_URI`, and `REDIS_URL` are configured properly.

#### 2. Launch Production Stack
```bash
docker-compose -f docker-compose.prod.yml up -d --build
```

#### 3. Verify Health
```bash
docker-compose -f docker-compose.prod.yml ps
curl http://localhost:3001/health
```

#### 4. Configure Nginx & SSL (Certbot)
Install Nginx & Certbot on your host:
```bash
sudo apt update
sudo apt install -y nginx certbot python3-certbot-nginx
```

Sample Nginx Configuration (`/etc/nginx/sites-available/taskmanager`):
```nginx
server {
    listen 80;
    server_name taskmanager.yourdomain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name taskmanager.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/taskmanager.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/taskmanager.yourdomain.com/privkey.pem;

    client_max_body_size 50M;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable site & enable SSL:
```bash
sudo ln -s /etc/nginx/sites-available/taskmanager /etc/nginx/sites-enabled/
sudo certbot --nginx -d taskmanager.yourdomain.com
sudo systemctl reload nginx
```

---

### Strategy 3: Decoupled Deployments (Vercel/Netlify + Render/Fly.io)

For teams preferring decoupled static client distribution:

1. **Backend (Express)**:
   - Deploy `server/` to **Render** / **Fly.io** / **Railway**.
   - Set environment variables (`MONGO_URI`, `REDIS_URL`, `JWT_SECRET`, `CLIENT_URL=https://app.yourdomain.com`).

2. **Frontend (React / Vite)**:
   - Deploy `client/` to **Vercel** or **Netlify**.
   - Set build setting environment variable: `VITE_API_BASE_URL=https://api.yourdomain.com`.

---

## 🔑 Environment Variables Reference

See [.env.example](file:///home/brie/Projects/Task-management/task-management-app/.env.example) for full inline documentation.

| Variable Name | Required | Default / Example | Purpose |
|---|---|---|---|
| `NODE_ENV` | Yes | `production` | Enables production optimizations & logs |
| `PORT` | Yes | `3001` | HTTP port for backend server |
| `MONGO_URI` | Yes | `mongodb+srv://...` | MongoDB connection URI |
| `REDIS_URL` | Yes | `rediss://...` | Redis connection URL for caching & BullMQ |
| `JWT_SECRET` | Yes | `(64-byte hex)` | Secret token for JWT auth validation |
| `ADMIN_INVITE_TOKEN` | Yes | `(random string)` | Token required for admin registration |
| `CLIENT_URL` | Yes | `https://yourdomain.com` | Allowed CORS origin & email CTA URL |
| `VITE_API_BASE_URL` | No | `http://localhost:3001` | Client API endpoint (empty for monolith) |
| `AWS_S3_BUCKET` | Optional | `my-uploads-bucket` | AWS S3 bucket for persistent file storage |
| `SMTP_HOST` | Optional | `smtp.mailtrap.io` | SMTP server host for email notifications |

---

## 🔒 Security & Checklist

- [ ] Generate strong secret for `JWT_SECRET` (`node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`).
- [ ] Configure MongoDB Atlas network access (IP Whitelisting).
- [ ] Enforce HTTPS/SSL across all client and API traffic.
- [ ] Set up daily automated database backups.
- [ ] Verify health check endpoint responds with `200 OK` (`/health`).

---

## 📊 Database & Upload Backup Strategies

### MongoDB Backup
```bash
mongodump --uri="mongodb+srv://<user>:<password>@cluster.mongodb.net/taskmanager" --out=./backups/$(date +%F)
```

### Local Uploads Folder Backup
```bash
tar -czf ./backups/uploads-$(date +%F).tar.gz uploads/
```
