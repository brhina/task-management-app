import express from "express";
import {
  createOrg,
  getOrgById,
  updateOrg,
  deleteOrg,
  addMemberByEmail,
  checkUserExists,
} from "../controllers/orgControllers.js";
import protect from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/", protect, createOrg);
router.get("/:orgId", protect, getOrgById);
router.put("/:orgId", protect, updateOrg);
router.delete("/:orgId", protect, deleteOrg);
router.post("/:orgId/add-member", protect, addMemberByEmail);
router.get("/check-user/:email", protect, checkUserExists);

export default router;
