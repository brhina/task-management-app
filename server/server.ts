import "./config/loadEnv.js";
import express from "express";
import cors from "cors";
import path from "path";
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
import intelligenceRoutes from "./routes/intelligenceRoutes.js";
import { runLegacyOrgMigration } from "./services/legacyMigration.js";
import { startRagChangeStreams } from "./services/ragChangeStreams.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization", "x-org-id"],
    credentials: true,
  }),
);

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
app.use("/api/intelligence", intelligenceRoutes);

app.get("/test-jwt", async (_req, res) => {
  try {
    const { testJWT } = await import("./utils/testJwt.js");
    const result = testJWT();
    res.json({ message: "JWT test completed", success: result });
  } catch (error: any) {
    res.status(500).json({ message: "JWT test failed", error: error.message });
  }
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
    startRagChangeStreams();

    app.listen(PORT, () => {
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
