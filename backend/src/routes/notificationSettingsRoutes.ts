import express from 'express';
import {
  getNotificationSettings,
  updateNotificationSettings,
} from '../controllers/notificationSettingsController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// Get user's notification settings
router.get('/', getNotificationSettings);

// Update notification settings
router.put('/', updateNotificationSettings);

export default router; 