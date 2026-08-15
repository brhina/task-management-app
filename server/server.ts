import "./config/loadEnv.js";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import path from "path";
import http from "http";
import mongoose from "mongoose";
import { fileURLToPath } from "url";
import connectDB from "./config/db.js";
import { validateEnv } from "./config/envSchema.js";
import { initCacheService, isRedisConnected } from "./services/cacheService.js";
import { errorHandler } from "./middleware/errorHandler.js";

import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import taskRoutes from "./routes/taskRoutes.js";
import reportRoutes from "./routes/reportRoutes.js";
import projectRoutes from "./routes/projectRoutes.js";
import goalRoutes from "./routes/goalRoutes.js";
import dependencyRoutes from "./routes/dependencyRoutes.js";
import workosRoutes from "./routes/workosRoutes.js";
import automationRoutes from "./routes/automationRoutes.js";
import orgMembershipRoutes from "./routes/orgMembershipRoutes.js";
import orgRoutes from "./routes/orgRoutes.js";
import timeEntryRoutes from "./routes/timeEntryRoutes.js";
import taskTemplateRoutes from "./routes/taskTemplateRoutes.js";
import sprintRoutes from "./routes/sprintRoutes.js";
import milestoneRoutes from "./routes/milestoneRoutes.js";
import keyResultRoutes from "./routes/keyResultRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import teamRoutes from "./routes/teamRoutes.js";
import roleRoutes from "./routes/roleRoutes.js";
// Enterprise Center disabled
// import auditRoutes from "./routes/auditRoutes.js";

// Phase 9 Routes (Enterprise Center) — disabled
// import ssoRoutes from "./routes/ssoRoutes.js";
// import billingRoutes from "./routes/billingRoutes.js";
// import apiKeyRoutes from "./routes/apiKeyRoutes.js";
// import integrationRoutes from "./routes/integrationRoutes.js";
// import brandingRoutes from "./routes/brandingRoutes.js";
// import complianceRoutes from "./routes/complianceRoutes.js";
// import webhookRoutes from "./routes/webhookRoutes.js";

// import { apiKeyAuth } from "./middleware/apiKeyAuth.js";
// import { checkIpAllowlist } from "./middleware/ipAllowlist.js";

import { runLegacyOrgMigration } from "./services/legacyMigration.js";
import { startRecurringTasksJob } from "./jobs/recurringTasks.js";
import { startNotificationJobs } from "./jobs/notificationJobs.js";
import { startReportJobs } from "./jobs/reportJobs.js";
import { ensureUploadsDir } from "./services/fileStorage.js";
import { initSocketServer } from "./services/socketService.js";
import { getAvailablePort } from "./utils/port.js";

// Validate environment variables on startup
validateEnv();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const app = express();
const httpServer = http.createServer(app);

// Security headers
app.use(helmet({
  contentSecurityPolicy: process.env.NODE_ENV === "production" ? undefined : false,
  crossOriginResourcePolicy: { policy: "cross-origin" },
}));

// Request logging
if (process.env.NODE_ENV !== "test") {
  app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));
}

app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization", "x-org-id", "x-api-key"],
    credentials: true,
  }),
);

app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Enterprise Center disabled — API key auth & IP allowlist
// app.use(apiKeyAuth as any);
// app.use(checkIpAllowlist as any);

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/goals", goalRoutes);
app.use("/api/dependencies", dependencyRoutes);
app.use("/api/workos", workosRoutes);
app.use("/api/automation", automationRoutes);
app.use("/api/org-membership", orgMembershipRoutes);
app.use("/api/orgs", orgRoutes);
app.use("/api/time-entries", timeEntryRoutes);
app.use("/api/task-templates", taskTemplateRoutes);
app.use("/api/sprints", sprintRoutes);
app.use("/api/milestones", milestoneRoutes);
app.use("/api/key-results", keyResultRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/teams", teamRoutes);
app.use("/api/roles", roleRoutes);
// Enterprise Center disabled
// app.use("/api/audit-logs", auditRoutes);

// Phase 9 Route Mounts (Enterprise Center) — disabled
// app.use("/api/sso", ssoRoutes);
// app.use("/api/billing", billingRoutes);
// app.use("/api/api-keys", apiKeyRoutes);
// app.use("/api/integrations", integrationRoutes);
// app.use("/api/branding", brandingRoutes);
// app.use("/api/compliance", complianceRoutes);
// app.use("/api/webhooks", webhookRoutes);

// Enhanced Health check endpoint
app.get("/health", (_req, res) => {
  const dbStateMap: Record<number, string> = {
    0: "disconnected",
    1: "connected",
    2: "connecting",
    3: "disconnecting",
  };

  const dbState = dbStateMap[mongoose.connection.readyState] || "unknown";

  res.status(200).json({
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: {
      status: dbState,
      name: mongoose.connection.name || "N/A",
    },
    redis: {
      connected: isRedisConnected(),
    },
    memoryUsage: process.memoryUsage(),
    environment: process.env.NODE_ENV || "development",
  });
});

if (process.env.NODE_ENV === "production") {
  const frontendPath = path.join(__dirname, "../client/dist");
  app.use(express.static(frontendPath));

  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api")) {
      return next();
    }
    res.sendFile(path.join(frontendPath, "index.html"));
  });
} else {
  app.get("/", (_req, res) => res.send("✅ Task Manager API is running..."));
}

// Register Global Error Handler
app.use(errorHandler as any);

const PORT = Number(process.env.PORT) || 3001;

const startServer = async () => {
  try {
    await connectDB();
    initCacheService();

    mongoose.connection.on("connecting", () =>
      console.log("MongoDB connecting..."),
    );
    mongoose.connection.on("connected", () => console.log("MongoDB connected"));
    mongoose.connection.on("error", (err: Error) =>
      console.error("MongoDB connection error:", err),
    );
    mongoose.connection.on("disconnected", () =>
      console.log("MongoDB disconnected"),
    );

    await runLegacyOrgMigration();
    await ensureUploadsDir();
    startRecurringTasksJob();
    startNotificationJobs();
    startReportJobs();
    initSocketServer(httpServer);

    if (process.env.NODE_ENV !== "test") {
      const resolvedPort = await getAvailablePort(PORT, [PORT + 1, PORT + 2, PORT + 3]);

      httpServer.listen(resolvedPort, () => {
        console.log(
          `🚀 Server running on port ${resolvedPort} in ${process.env.NODE_ENV || "development"} mode`,
        );
      });
    }

    const gracefulShutdown = async (signal: string) => {
      console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);
      httpServer.close(async () => {
        console.log("  ↳ HTTP server closed.");
        try {
          await mongoose.connection.close();
          console.log("  ↳ Mongoose connection closed.");
          process.exit(0);
        } catch (err) {
          console.error("  ❌ Error closing connections during shutdown:", err);
          process.exit(1);
        }
      });
    };

    process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
    process.on("SIGINT", () => gracefulShutdown("SIGINT"));

    process.on("unhandledRejection", (err: Error) => {
      console.error("Unhandled Rejection:", err);
    });

    process.on("uncaughtException", (err: Error) => {
      console.error("Uncaught Exception:", err);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    if (process.env.NODE_ENV !== "test") {
      process.exit(1);
    }
  }
};

if (process.env.NODE_ENV !== "test") {
  startServer();
}
