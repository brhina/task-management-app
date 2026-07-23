import express from "express";
import protect, { requirePermission } from "../middleware/authMiddleware.js";
import {
  getMyOrgs,
  leaveOrg,
  generateInviteToken,
  joinOrgByInvite,
  getOrgMembers,
  updateMemberRole,
  removeMember,
} from "../controllers/orgMembershipControllers.js";

const router = express.Router();

router.get("/my-orgs", protect, getMyOrgs);
router.post("/:orgId/leave", protect, leaveOrg);
router.post(
  "/:orgId/invite",
  protect,
  requirePermission("member:invite"),
  generateInviteToken,
);
router.post("/join", protect, joinOrgByInvite);
router.get("/:orgId/members", protect, getOrgMembers);
router.put(
  "/:orgId/members/:memberId/role",
  protect,
  requirePermission("member:manage"),
  updateMemberRole,
);
router.delete(
  "/:orgId/members/:memberId",
  protect,
  requirePermission("member:manage"),
  removeMember,
);

export default router;
