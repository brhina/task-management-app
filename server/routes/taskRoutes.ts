import express from 'express';
import protect, { orgAdminOnly } from '../middleware/authMiddleware.js';
import { getDashboardTasks, getUserDashboardTasks, getTasks, getTaskById, createTask, updateTask, updateTaskStatus, updateTaskAssignee, updateTaskCheckList, deleteTask } from '../controllers/taskControllers.js';

const router = express.Router();

router.get('/dashboard-tasks', protect, getDashboardTasks);
router.get('/user-dashboard-tasks', protect, getUserDashboardTasks);
router.get('/', protect, getTasks);
router.get('/:id', protect, getTaskById);
router.post('/', protect, orgAdminOnly, createTask);
router.put('/:id', protect, orgAdminOnly, updateTask);
router.delete('/:id', protect, orgAdminOnly, deleteTask);
router.put('/:id/status', protect, updateTaskStatus);
router.put('/:id/assignee', protect, orgAdminOnly, updateTaskAssignee);
router.put('/:id/todo', protect, updateTaskCheckList);

export default router;
