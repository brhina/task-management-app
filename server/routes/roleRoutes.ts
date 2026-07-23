import express from "express";
import protect, { requirePermission } from "../middleware/authMiddleware.js";
import {
  listPermissionsCatalog,
  getMyPermissions,
  listCustomRoles,
  createCustomRole,
  updateCustomRole,
  deleteCustomRole,
} from "../controllers/roleControllers.js";

const router = express.Router();

router.get("/catalog", protect, listPermissionsCatalog);
router.get("/me", protect, getMyPermissions);
router.get("/", protect, requirePermission("role:manage"), listCustomRoles);
router.post("/", protect, requirePermission("role:manage"), createCustomRole);
router.put("/:id", protect, requirePermission("role:manage"), updateCustomRole);
router.delete(
  "/:id",
  protect,
  requirePermission("role:manage"),
  deleteCustomRole,
);

export default router;
