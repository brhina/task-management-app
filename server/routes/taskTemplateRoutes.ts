import express from "express";
import protect, { orgAdminOnly } from "../middleware/authMiddleware.js";
import {
  listTemplates,
  getTemplate,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  createTaskFromTemplate,
} from "../controllers/taskTemplateControllers.js";

const router = express.Router();

router.get("/", protect, listTemplates);
router.get("/:id", protect, getTemplate);
router.post("/", protect, orgAdminOnly, createTemplate);
router.put("/:id", protect, orgAdminOnly, updateTemplate);
router.delete("/:id", protect, orgAdminOnly, deleteTemplate);
router.post("/:id/create-task", protect, orgAdminOnly, createTaskFromTemplate);

export default router;
