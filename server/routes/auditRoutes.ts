import express from "express";
import protect, { requirePermission } from "../middleware/authMiddleware.js";
import {
  listAuditLogs,
  exportAuditLogs,
} from "../controllers/auditControllers.js";

const router = express.Router();

router.get("/", protect, requirePermission("org:audit"), listAuditLogs);
router.get("/export", protect, requirePermission("org:audit"), exportAuditLogs);

export default router;
