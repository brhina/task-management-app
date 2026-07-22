import express from "express";
import protect, { orgAdminOnly } from "../middleware/authMiddleware.js";
import {
  listKeyResults,
  createKeyResult,
  updateKeyResult,
  deleteKeyResult,
} from "../controllers/keyResultControllers.js";

const router = express.Router();

router.get("/", protect, listKeyResults);
router.post("/", protect, orgAdminOnly, createKeyResult);
router.put("/:id", protect, orgAdminOnly, updateKeyResult);
router.delete("/:id", protect, orgAdminOnly, deleteKeyResult);

export default router;
