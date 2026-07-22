import express from "express";
import protect from "../middleware/authMiddleware.js";
import {
  listTimeEntries,
  createTimeEntry,
  updateTimeEntry,
  deleteTimeEntry,
  timeReport,
} from "../controllers/timeEntryControllers.js";

const router = express.Router();

router.get("/report", protect, timeReport);
router.get("/", protect, listTimeEntries);
router.post("/", protect, createTimeEntry);
router.put("/:id", protect, updateTimeEntry);
router.delete("/:id", protect, deleteTimeEntry);

export default router;
