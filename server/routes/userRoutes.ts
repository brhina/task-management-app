import express from "express";
import {
  getAllUsers,
  getUserById,
  deleteUser,
  getUserPerformance,
} from "../controllers/userControllers.js";
import protect, { orgAdminOnly } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", protect, getAllUsers);
router.get("/performance/:id", protect, getUserPerformance);
router.get("/:id/performance", protect, getUserPerformance);
router.get("/:id", protect, getUserById);
router.delete("/:id", protect, orgAdminOnly, deleteUser);

export default router;
