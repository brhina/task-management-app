import express from "express";
import {
  loginUser,
  registerUser,
  getUserProfile,
  updateUserProfile,
} from "../controllers/authControllers.js";
import protect from "../middleware/authMiddleware.js";
import upload from "../middleware/uploadMiddleware.js";
import { AuthRequest } from "../middleware/authMiddleware.js";
import { Response } from "express";

const router = express.Router();

router.post("/login", loginUser);
router.post("/register", registerUser);
router.get("/profile", protect, getUserProfile);
router.put("/profile/:id", protect, updateUserProfile);

router.post(
  "/upload-image",
  upload.single("image"),
  (req: AuthRequest, res: Response) => {
    if (!req.file) {
      res.status(400).json({ message: "No file uploaded" });
      return;
    }

    const baseUrl =
      process.env.NODE_ENV === "production"
        ? process.env.CLIENT_URL || `${req.protocol}://${req.get("host")}`
        : `${req.protocol}://${req.get("host")}`;

    const imageUrl = `${baseUrl}/uploads/${req.file.filename}`;
    res.status(200).json({ imageUrl });
  },
);

export default router;
