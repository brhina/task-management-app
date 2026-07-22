import express from "express";
import {
  getMyOrgs,
  leaveOrg,
  generateInviteToken,
  joinOrgByInvite,
  getOrgMembers,
  updateMemberRole,
  removeMember,
} from "../controllers/orgMembershipControllers.js";
import protect, { orgAdminOnly } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/my-orgs", protect, getMyOrgs);
router.post("/:orgId/leave", protect, leaveOrg);
router.post("/:orgId/invite", protect, orgAdminOnly, generateInviteToken);
router.post("/join", protect, joinOrgByInvite);
router.get("/:orgId/members", protect, getOrgMembers);
router.put(
  "/:orgId/members/:memberId/role",
  protect,
  orgAdminOnly,
  updateMemberRole,
);
router.delete(
  "/:orgId/members/:memberId",
  protect,
  orgAdminOnly,
  removeMember,
);

export default router;
