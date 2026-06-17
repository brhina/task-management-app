import express from "express";
import protect, { orgAdminOnly } from "../middleware/authMiddleware.js";
import { listProjects, getProjectById, createProject, updateProject, deleteProject } from "../controllers/projectControllers.js";

const router = express.Router();

router.get("/", protect, listProjects);
router.get("/:id", protect, getProjectById);
router.post("/", protect, orgAdminOnly, createProject);
router.put("/:id", protect, orgAdminOnly, updateProject);
router.delete("/:id", protect, orgAdminOnly, deleteProject);

export default router;

