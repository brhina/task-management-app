import express from "express";
import {
  loginUser,
  // Signup disabled — registerUser is turned off.
  // registerUser,
  getUserProfile,
  updateUserProfile,
} from "../controllers/authControllers.js";
import protect from "../middleware/authMiddleware.js";
import upload from "../middleware/uploadMiddleware.js";
import { AuthRequest } from "../middleware/authMiddleware.js";
import { Response } from "express";
import {
  validate,
  // Signup disabled — registerSchema is unused.
  // registerSchema,
  loginSchema,
  updateProfileSchema,
} from "../middleware/validate.js";
import {
  saveUploadedFile,
  getPublicAssetUrl,
} from "../services/fileStorage.js";

const router = express.Router();

router.post("/login", validate(loginSchema), loginUser);
// Signup disabled — self-service registration is turned off.
// router.post("/register", validate(registerSchema), registerUser);
router.get("/profile", protect, getUserProfile);
router.put(
  "/profile/:id",
  protect,
  validate(updateProfileSchema),
  updateUserProfile,
);

router.post(
  "/upload-image",
  protect,
  upload.single("image"),
  async (req: AuthRequest, res: Response) => {
    if (!req.file) {
      res.status(400).json({ message: "No file uploaded" });
      return;
    }

    try {
      const saved = await saveUploadedFile(req.file, "profiles");
      const imageUrl = getPublicAssetUrl(saved.url, req);
      res.status(200).json({ imageUrl });
    } catch (err) {
      console.error("Profile image upload failed:", err);
      res.status(500).json({ message: "Failed to upload image" });
    }
  },
);

export default router;
