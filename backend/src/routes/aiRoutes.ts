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

// Get AI agent configuration (categories, complexity etc.)
router.get('/config', aiController.getAgentConfig);

// Generate training ticket preview (does not save)
router.post('/generate-ticket-preview', aiController.generateTrainingTicketPreview);

// Confirm and create the training ticket after preview
router.post('/confirm-ticket-creation', aiController.confirmTrainingTicketCreation);

// Generate simulated user response for an AI ticket
router.post('/tickets/:id/generate-response', aiController.generateUserResponse);

// Get the solution for an AI-generated ticket
router.get('/tickets/:ticketId/solution', aiController.getTicketSolution);

// Summarize a ticket conversation
router.post('/tickets/:ticketId/summarize', aiController.summarizeConversation);

// Get support assistant response for a specific question about a ticket
router.post('/tickets/:ticketId/support-assistant', aiController.getSupportAssistantResponse);

// Get conversation history between a student and the support assistant for a specific ticket
router.get('/tickets/:ticketId/support-assistant/history/:supportUserId', aiController.getSupportAssistantConversationHistory);

// Clear conversation history between a student and the support assistant for a specific ticket
router.delete('/tickets/:ticketId/support-assistant/history/:supportUserId', aiController.clearSupportAssistantConversationHistory);

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

export default router; 