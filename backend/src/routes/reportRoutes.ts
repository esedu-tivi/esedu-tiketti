import express from 'express';
import { reportController } from '../controllers/reportController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { requireRole } from '../middleware/roleMiddleware.js';
import { UserRole } from '@prisma/client';

const router = express.Router();

// All report routes require authentication
router.use(authMiddleware);

// All report routes require SUPPORT or ADMIN role
router.use(requireRole([UserRole.SUPPORT, UserRole.ADMIN]));

// Get current user's work report with optional filters
router.get('/my-work', reportController.getMyWorkReport);

// Save a generated report for future reference
router.post('/save', reportController.saveReport);

// Get list of saved reports
router.get('/saved', reportController.getSavedReports);

// Get specific saved report
router.get('/saved/:reportId', reportController.getSavedReport);

// Export routes
router.get('/export/csv', reportController.exportReportAsCSV);
router.get('/export/json', reportController.exportReportAsJSON);
router.get('/export/pdf', reportController.exportReportAsPDF);

export default router;