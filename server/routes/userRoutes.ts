import express from 'express';
import { getAllUsers, getUserById, deleteUser } from '../controllers/userControllers.js';
import protect, { orgAdminOnly } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', protect, orgAdminOnly, getAllUsers);
router.get('/:id', protect, getUserById);
router.delete('/:id', protect, orgAdminOnly, deleteUser);

export default router;
