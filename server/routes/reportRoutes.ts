import express from 'express';
import protect, { orgAdminOnly } from '../middleware/authMiddleware.js';
import { exportTasksReport, exportUsersReport } from '../controllers/reportControllers.js';

const router = express.Router();

router.get('/export-tasks', protect, orgAdminOnly, exportTasksReport);
router.get('/export-users', protect, orgAdminOnly, exportUsersReport);

export default router;
