import express from "express";
import protect, { orgAdminOnly } from "../middleware/authMiddleware.js";
import {
  listDependencies,
  createDependency,
  deleteDependency,
  getDependencyAnalysis,
} from "../controllers/dependencyControllers.js";

const router = express.Router();

router.get("/", protect, listDependencies);
router.get("/analysis", protect, getDependencyAnalysis);
router.post("/", protect, orgAdminOnly, createDependency);
router.delete("/:id", protect, orgAdminOnly, deleteDependency);

export default router;
