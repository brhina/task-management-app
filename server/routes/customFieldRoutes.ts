import express from "express";
import protect, { orgAdminOnly } from "../middleware/authMiddleware.js";
import {
  listCustomFields,
  createCustomField,
  updateCustomField,
  deleteCustomField,
} from "../controllers/customFieldControllers.js";

const router = express.Router();

router.get("/", protect, listCustomFields);
router.post("/", protect, orgAdminOnly, createCustomField);
router.put("/:id", protect, orgAdminOnly, updateCustomField);
router.delete("/:id", protect, orgAdminOnly, deleteCustomField);

export default router;
