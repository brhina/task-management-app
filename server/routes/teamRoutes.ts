import express from "express";
import protect, { requirePermission } from "../middleware/authMiddleware.js";
import {
  listTeams,
  getTeamById,
  createTeam,
  updateTeam,
  deleteTeam,
  getTeamDashboard,
} from "../controllers/teamControllers.js";

const router = express.Router();

router.get("/", protect, requirePermission("team:view"), listTeams);
router.get(
  "/:id/dashboard",
  protect,
  requirePermission("team:view"),
  getTeamDashboard,
);
router.get("/:id", protect, requirePermission("team:view"), getTeamById);
router.post("/", protect, requirePermission("team:manage"), createTeam);
router.put("/:id", protect, requirePermission("team:manage"), updateTeam);
router.delete("/:id", protect, requirePermission("team:manage"), deleteTeam);

export default router;
