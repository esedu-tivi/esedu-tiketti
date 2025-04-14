import express from 'express';
import { aiController } from '../controllers/aiController.js';
import { requireRole } from '../middleware/roleMiddleware.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { UserRole } from '@prisma/client';

const router = express.Router();

// First apply the auth middleware to parse the JWT token
router.use(authMiddleware);

// Only admins and support staff can access AI features
router.use(requireRole([UserRole.ADMIN, UserRole.SUPPORT]));

// Generate training tickets
router.post('/generate-ticket', aiController.generateTrainingTicket);

// Get AI agent configuration
router.get('/config', aiController.getAgentConfig);

// Generate AI user response to support comment
router.post('/tickets/:id/generate-response', aiController.generateUserResponse);

// Get knowledge article solution for a ticket
router.get('/tickets/:ticketId/solution', aiController.getTicketSolution);

// Future endpoint for AI ticket interaction
// router.post('/tickets/:id/interact', aiController.interactWithTicket);

// --- New Analysis Routes ---
router.get(
  '/analysis/tickets',
  requireRole([UserRole.ADMIN]),
  aiController.getAiAnalysisTickets
);

router.get(
  '/analysis/tickets/:ticketId/conversation',
  requireRole([UserRole.ADMIN]),
  aiController.getAiTicketConversation
);
// --- End New Analysis Routes ---

// --- New Route for Summarization ---
router.post('/tickets/:id/summarize', aiController.summarizeConversation);

export default router; 