import express from 'express';
import {
  getUserNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  getUnreadCount,
} from '../controllers/notificationController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// Get all notifications for the current user
router.get('/', getUserNotifications);

// Get unread notification count
router.get('/unread/count', getUnreadCount);

// Mark a notification as read
router.put('/:id/read', markAsRead);

// Mark all notifications as read
router.put('/read/all', markAllAsRead);

// Delete a notification
router.delete('/:id', deleteNotification);

export default router; 