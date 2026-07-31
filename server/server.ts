import "./config/loadEnv.js";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import path from "path";
import http from "http";
import { fileURLToPath } from "url";
import connectDB from "./config/db.js";

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
import customFieldRoutes from "./routes/customFieldRoutes.js";
import sprintRoutes from "./routes/sprintRoutes.js";
import milestoneRoutes from "./routes/milestoneRoutes.js";
import keyResultRoutes from "./routes/keyResultRoutes.js";
import resourceRoutes from "./routes/resourceRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import teamRoutes from "./routes/teamRoutes.js";
import roleRoutes from "./routes/roleRoutes.js";
import auditRoutes from "./routes/auditRoutes.js";
import { runLegacyOrgMigration } from "./services/legacyMigration.js";
import { startRecurringTasksJob } from "./jobs/recurringTasks.js";
import { startNotificationJobs } from "./jobs/notificationJobs.js";
import { startReportJobs } from "./jobs/reportJobs.js";
import { ensureUploadsDir } from "./services/fileStorage.js";
import { initSocketServer } from "./services/socketService.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = http.createServer(app);

// Security headers
app.use(helmet({
  contentSecurityPolicy: process.env.NODE_ENV === "production" ? undefined : false,
}));

// Request logging
if (process.env.NODE_ENV !== "test") {
  app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));
}

app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization", "x-org-id"],
    credentials: true,
  }),
);

// Rate limiting using in-memory store (use Redis in production)
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const RATE_LIMIT_MAX = 500; // requests per window
const AUTH_RATE_LIMIT_MAX = 50; // stricter for auth endpoints

function rateLimit(maxRequests: number) {
  return (req: express.Request, res: express.Response, next: express.NextFunction): void => {
    // Use client IP as unique identifier
    const key = `${req.ip || req.socket.remoteAddress || "unknown"}`;
    const now = Date.now();
    const record = rateLimitStore.get(key);

    // New client or expired window: reset counter
    if (!record || now > record.resetAt) {
      rateLimitStore.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
      next();
      return;
    }

    // Increment and check limit
    record.count++;
    if (record.count > maxRequests) {
      res.status(429).json({
        message: "Too many requests. Please try again later.",
        retryAfter: Math.ceil((record.resetAt - now) / 1000), // seconds until reset
      });
      return;
    }
    next();
  };
}

// General rate limit
// app.use(rateLimit(RATE_LIMIT_MAX));

// Stricter rate limit for auth endpoints
// const authRateLimit = rateLimit(AUTH_RATE_LIMIT_MAX);

app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

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
app.use("/api/custom-fields", customFieldRoutes);
app.use("/api/sprints", sprintRoutes);
app.use("/api/milestones", milestoneRoutes);
app.use("/api/key-results", keyResultRoutes);
app.use("/api/resources", resourceRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/teams", teamRoutes);
app.use("/api/roles", roleRoutes);
app.use("/api/audit-logs", auditRoutes);

// Health check endpoint
app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

if (process.env.NODE_ENV === "production") {
  const frontendPath = path.join(__dirname, "../client/dist");
  app.use(express.static(frontendPath));

  app.get("/", (_req, res) => {
    res.sendFile(path.join(frontendPath, "index.html"));
  });
} else {
  app.get("/", (_req, res) => res.send("✅ Task Manager API is running..."));
}

const PORT = process.env.PORT || 3001;

const startServer = async () => {
  try {
    await connectDB();

    const mongoose = (await import("mongoose")).default;
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

    httpServer.listen(PORT, () => {
      console.log(
        `🚀 Server running on port ${PORT} in ${process.env.NODE_ENV || "development"} mode`,
      );
    });

    process.on("unhandledRejection", (err: Error) => {
      console.error("Unhandled Rejection:", err);
      process.exit(1);
    });

    process.on("uncaughtException", (err: Error) => {
      console.error("Uncaught Exception:", err);
      process.exit(1);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

startServer();
