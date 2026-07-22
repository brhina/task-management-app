import express from "express";
import protect, { orgAdminOnly } from "../middleware/authMiddleware.js";
import {
  listProjects,
  getProjectById,
  createProject,
  updateProject,
  deleteProject,
} from "../controllers/projectControllers.js";
import { getProjectGantt } from "../controllers/resourceControllers.js";
import {
  validate,
  createProjectSchema,
  updateProjectSchema,
} from "../middleware/validate.js";

const router = express.Router();

router.get("/", protect, listProjects);
router.get("/:id/gantt", protect, getProjectGantt);
router.get("/:id", protect, getProjectById);
router.post("/", protect, orgAdminOnly, validate(createProjectSchema), createProject);
router.put("/:id", protect, orgAdminOnly, validate(updateProjectSchema), updateProject);
router.delete("/:id", protect, orgAdminOnly, deleteProject);

export default router;
