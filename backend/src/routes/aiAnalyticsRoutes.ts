import express from 'express';
import { aiAnalyticsController } from '../controllers/aiAnalyticsController.js';
import { requireRole } from '../middleware/roleMiddleware.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { UserRole } from '@prisma/client';

const router = express.Router();

// First apply the auth middleware to parse the JWT token
router.use(authMiddleware);

// Only admins and support staff can access analytics features
router.use(requireRole([UserRole.ADMIN, UserRole.SUPPORT]));

// Track new AI assistant interaction
router.post('/interactions', aiAnalyticsController.trackInteraction);

// Submit feedback for an interaction
router.post('/interactions/:interactionId/feedback', aiAnalyticsController.submitFeedback);

// Get usage statistics
router.get('/usage', aiAnalyticsController.getUsageStats);

// Get category distribution
router.get('/categories', aiAnalyticsController.getCategoryStats);

// Get agent usage statistics
router.get('/agents', aiAnalyticsController.getAgentUsageStats);

// Get detailed statistics for a specific agent
router.get('/agents/:agentId/details', aiAnalyticsController.getAgentDetails);

// Get response time statistics
router.get('/response-times', aiAnalyticsController.getResponseTimeStats);

// Get resolution time comparison
router.get('/resolution-times', aiAnalyticsController.getResolutionTimeComparison);

// Get overall statistics
router.get('/overall', aiAnalyticsController.getOverallStats);

// Get all dashboard data in a single request
router.get('/dashboard', aiAnalyticsController.getDashboardData);

export default router; 