import express from "express";
import protect from "../middleware/authMiddleware.js";
import {
  getResourceAllocation,
  getResourceConflicts,
  updateMemberCapacity,
} from "../controllers/resourceControllers.js";

const router = express.Router();

router.get("/allocation", protect, getResourceAllocation);
router.get("/conflicts", protect, getResourceConflicts);
router.put("/capacity/:userId", protect, updateMemberCapacity);

export default router;
