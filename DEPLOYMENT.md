# Deployment Guide — Render

This guide walks you through deploying the **Task Management App** on [Render](https://render.com), with the **server** (Express API) and **client** (React/Vite SPA) deployed as two separate services.

| Service | Render Type | Free Tier |
|---|---|---|
| **Server** (Express API) | Web Service — Docker | ✅ Yes (spins down after inactivity) |
| **Client** (React SPA) | Static Site | ✅ Yes (always on) |
| **MongoDB** | External — [MongoDB Atlas](https://cloud.mongodb.com) | ✅ Free M0 cluster |
| **Redis** | External — [Upstash](https://upstash.com) | ✅ Free tier |

---

## Prerequisites

Before deploying, have the following ready:

- [ ] A [Render](https://render.com) account connected to your GitHub repo.
- [ ] A **MongoDB Atlas** cluster with a connection string (`MONGO_URI`).
- [ ] An **Upstash Redis** instance with a TLS connection URL (`REDIS_URL`).
- [ ] A strong `JWT_SECRET` (generate one below).
- [ ] An `ADMIN_INVITE_TOKEN` for the first admin registration.

```bash
# Generate a secure JWT_SECRET
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

---

## Part 1 — Deploy the Server (Express API)

The server is deployed as a **Render Web Service** using the `server/Dockerfile`.

### Step 1 — Create the Web Service

1. Go to [dashboard.render.com](https://dashboard.render.com) → **New** → **Web Service**.
2. Connect your GitHub repository.
3. Fill in the service settings:

| Field | Value |
|---|---|
| **Name** | `task-manager-server` (or your choice) |
| **Region** | Closest to your users |
| **Branch** | `main` |
| **Root Directory** | `server` |
| **Runtime** | **Docker** |
| **Dockerfile Path** | `./Dockerfile` |
| **Instance Type** | Free (or paid for always-on) |

> **Note**: Setting **Root Directory** to `server` makes the build context the `server/` folder, so `./Dockerfile` resolves to `server/Dockerfile`.

### Step 2 — Set Environment Variables

In the **Environment** tab of your Web Service, add the following variables:

#### Required

| Variable | Example Value | Description |
|---|---|---|
| `NODE_ENV` | `production` | Enables production optimizations |
| `PORT` | `3001` | Express listen port (Render also injects its own `PORT`) |
| `MONGO_URI` | `mongodb+srv://user:pass@cluster.mongodb.net/taskmanager?retryWrites=true&w=majority` | MongoDB Atlas connection string |
| `REDIS_URL` | `rediss://default:password@host:port` | Upstash / Redis Cloud TLS URL |
| `JWT_SECRET` | *(64-byte hex string)* | JWT signing secret |
| `ADMIN_INVITE_TOKEN` | *(random string)* | Token required to register the first admin |
| `CLIENT_URL` | `https://your-client.onrender.com` | Your client's Render URL (add after Part 2) |

> **Tip**: You won't know `CLIENT_URL` until after you deploy the client. Add a placeholder first, then update it once Part 2 is done.

#### Optional

| Variable | Description |
|---|---|
| `MONGODB_AI_DB` | AI/RAG database name (default: `taskmanager_ai`) |
| `AWS_S3_BUCKET` | S3 bucket name for file uploads |
| `AWS_ACCESS_KEY_ID` | AWS access key |
| `AWS_SECRET_ACCESS_KEY` | AWS secret key |
| `AWS_REGION` | AWS region (e.g. `us-east-1`) |
| `AWS_S3_PUBLIC_URL` | Public CDN URL for S3 objects |
| `SMTP_HOST` | SMTP server host (e.g. `smtp.sendgrid.net`) |
| `SMTP_PORT` | SMTP port (e.g. `587`) |
| `SMTP_USER` | SMTP username |
| `SMTP_PASS` | SMTP password |
| `SMTP_FROM` | Sender address (e.g. `"App <no-reply@yourdomain.com>"`) |
| `SMTP_SECURE` | `true` for SSL/TLS port 465 |
| `OPENAI_API_KEY` | OpenAI key for AI features |
| `OPENROUTER_API_KEY` | OpenRouter key (alternative LLM) |
| `TELEBIRR_MODE` | `live` or `sandbox` |
| `TELEBIRR_APP_ID` | Telebirr app ID |
| `TELEBIRR_APP_KEY` | Telebirr app key |
| `TELEBIRR_SHORT_CODE` | Telebirr short code |
| `TELEBIRR_NOTIFY_SECRET` | Telebirr webhook secret |
| `SERVER_PUBLIC_URL` | Public URL of this API service (needed for Telebirr callbacks) |

### Step 3 — Deploy

Click **Create Web Service**. Render will:

1. Pull your repo and build `server/Dockerfile`.
2. Start the container running `node --import tsx server.ts`.
3. Assign a URL like `https://task-manager-server.onrender.com`.

### Step 4 — Verify the Server

```bash
curl https://task-manager-server.onrender.com/health
# Expected: {"status":"ok", ...}
```

> **Free tier note**: The free Web Service spins down after 15 minutes of inactivity and has a ~30s cold-start delay on the next request. Upgrade to a paid instance for always-on behaviour, or use [UptimeRobot](https://uptimerobot.com) to ping `/health` every 5 minutes to keep it warm.

---

## Part 2 — Deploy the Client (React SPA)

The client is deployed as a **Render Static Site** — Render runs `npm run build` and serves the `dist/` folder from its global CDN. No Docker needed.

### Step 1 — Create the Static Site

1. Go to [dashboard.render.com](https://dashboard.render.com) → **New** → **Static Site**.
2. Connect the same GitHub repository.
3. Fill in the site settings:

| Field | Value |
|---|---|
| **Name** | `task-manager-client` (or your choice) |
| **Branch** | `main` |
| **Root Directory** | `client` |
| **Build Command** | `npm install && npm run build` |
| **Publish Directory** | `dist` |

### Step 2 — Set Environment Variables

In the **Environment** tab of the Static Site, add:

| Variable | Value | Description |
|---|---|---|
| `VITE_API_BASE_URL` | `https://task-manager-server.onrender.com` | The server URL from Part 1 — **baked into the JS bundle at build time** |

> **Important**: This variable is embedded into the built JavaScript by Vite. If you change the server URL later, you must **redeploy** the static site to pick up the new value.

### Step 3 — Configure SPA Routing (Rewrite Rule)

React Router needs every path to serve `index.html`. In the **Redirects/Rewrites** tab of the Static Site, add:

| Source | Destination | Type |
|---|---|---|
| `/*` | `/index.html` | **Rewrite** |

> Without this rule, navigating directly to any route other than `/` (e.g. `/tasks`) will return a 404 from the CDN.

### Step 4 — Deploy

Click **Create Static Site**. Render will:

1. `cd client && npm install && npm run build`
2. Serve the `dist/` folder from its CDN edge nodes.
3. Assign a URL like `https://task-manager-client.onrender.com`.

---

## Part 3 — Wire the Two Services Together

After both services are running:

1. **Copy the client URL** (e.g. `https://task-manager-client.onrender.com`).
2. Go to the **Server** Web Service → **Environment** tab and set:
   ```
   CLIENT_URL=https://task-manager-client.onrender.com
   ```
3. Click **Save Changes** — Render redeploys the server automatically with the updated CORS origin.

---

## Part 4 — Custom Domains (Optional)

Both Render services support custom domains on paid plans.

### Server API domain

1. Server → **Settings** → **Custom Domain** → Add `api.yourdomain.com`.
2. Add a `CNAME` record in your DNS: `api.yourdomain.com` → `<render-service>.onrender.com`.
3. Update `VITE_API_BASE_URL` in the Static Site environment to `https://api.yourdomain.com` and redeploy the client.

### Client domain

1. Static Site → **Settings** → **Custom Domain** → Add `app.yourdomain.com`.
2. Add a `CNAME` in your DNS: `app.yourdomain.com` → `<render-site>.onrender.com`.
3. Update `CLIENT_URL` on the server to `https://app.yourdomain.com` and redeploy the server.

---

## Security Checklist

- [ ] `JWT_SECRET` is a random 64-byte hex string — **never** reuse a dev secret in production.
- [ ] `ADMIN_INVITE_TOKEN` is a strong random string.
- [ ] `CLIENT_URL` on the server exactly matches the client's origin (no trailing slash).
- [ ] MongoDB Atlas IP allowlisting is configured (allowlist Render's egress IPs or `0.0.0.0/0` temporarily to test).
- [ ] All environment variables are set via the Render dashboard — **never** commit `.env` files.
- [ ] Verify the health endpoint after every deploy:
  ```bash
  curl https://your-server.onrender.com/health
  ```

---

## Redeployment

Render automatically redeploys both services on every push to `main`.

To redeploy manually:
- Open the service → **Manual Deploy** → **Deploy latest commit**.

To update environment variables without a code change:
- Edit the variable in the Render dashboard → **Save Changes** → Render triggers a redeploy automatically.

---

## Troubleshooting

| Issue | Likely Cause | Fix |
|---|---|---|
| `CORS` errors in browser | `CLIENT_URL` mismatch on server | Ensure `CLIENT_URL` exactly matches the client origin (no trailing slash) |
| White screen / 404 on page refresh | Missing SPA rewrite rule | Add `/* → /index.html` (Rewrite) in the Static Site Redirects/Rewrites tab |
| API calls hitting wrong URL | Stale `VITE_API_BASE_URL` in bundle | Vite bakes env vars at build time — redeploy the static site after changing `VITE_API_BASE_URL` |
| Cold start / ~30s delay | Free tier spin-down | Upgrade to paid, or ping `/health` every 5 min with UptimeRobot |
| `MongoNetworkError` | Atlas IP allowlist | Allowlist Render egress IPs or use `0.0.0.0/0` (with strong auth) to confirm |
| Redis `ECONNREFUSED` | Wrong `REDIS_URL` format | Upstash TLS URL must start with `rediss://` (double `s`) |
