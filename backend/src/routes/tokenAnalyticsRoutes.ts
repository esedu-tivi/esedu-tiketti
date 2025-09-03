import { Router } from 'express';
import { tokenAnalyticsController } from '../controllers/tokenAnalyticsController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { requireRole } from '../middleware/roleMiddleware.js';

const router = Router();

// All token analytics routes require authentication and admin/support role
router.use(authMiddleware);
router.use(requireRole(['ADMIN', 'SUPPORT']));

// Get comprehensive token analytics with filters
router.get('/', tokenAnalyticsController.getTokenAnalytics);

// Get daily token usage for charts
router.get('/daily', tokenAnalyticsController.getDailyTokenUsage);

// Get top users by token usage
router.get('/top-users', tokenAnalyticsController.getTopUsersByTokenUsage);

// Get current month's summary with comparison
router.get('/summary', tokenAnalyticsController.getTokenUsageSummary);

export default router;