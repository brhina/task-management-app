import express from "express";
import {
  createOrg,
  getOrgById,
  updateOrg,
  deleteOrg,
  addMemberByEmail,
  checkUserExists,
  listWorkspaceTemplates,
} from "../controllers/orgControllers.js";
import protect, {
  requirePermission,
} from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/templates", protect, listWorkspaceTemplates);
router.post("/", protect, createOrg);
router.get("/check-user/:email", protect, checkUserExists);
router.get("/:orgId", protect, getOrgById);
router.put(
  "/:orgId",
  protect,
  requirePermission("org:manage"),
  updateOrg,
);
router.delete(
  "/:orgId",
  protect,
  requirePermission("org:manage"),
  deleteOrg,
);
router.post(
  "/:orgId/add-member",
  protect,
  requirePermission("member:invite"),
  addMemberByEmail,
);

export default router;
