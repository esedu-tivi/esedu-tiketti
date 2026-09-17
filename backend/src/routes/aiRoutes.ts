import express from 'express';
import { aiController } from '../controllers/aiController.js';
import { aiSettingsController } from '../controllers/aiSettingsController.js';
import { requireRole } from '../middleware/roleMiddleware.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { UserRole } from '@prisma/client';

const router = express.Router();

// First apply the auth middleware to parse the JWT token
router.use(authMiddleware);

// Only admins and support staff can access AI features
router.use(requireRole([UserRole.ADMIN, UserRole.SUPPORT]));

// Check OpenAI configuration status
// Käytetään vain AITools-sivulla, joka on admin-rajattu.
router.get('/config-status', requireRole([UserRole.ADMIN]), aiController.checkConfiguration);

// Get AI agent configuration (categories, complexity etc.)
// Käytetään vain tikettigeneraattorissa, joka on admin-rajattu.
router.get('/config', requireRole([UserRole.ADMIN]), aiController.getAgentConfig);

// Generate training ticket preview (does not save)
// HUOM: vain ADMIN. Tässä järjestelmässä SUPPORT-rooli tarkoittaa harjoittelevaa
// opiskelijaa, joten hänen ei pidä pystyä luomaan itselleen harjoitustikettejä.
// Esikatselu palauttaa myös ratkaisun.
router.post(
  '/generate-ticket-preview',
  requireRole([UserRole.ADMIN]),
  aiController.generateTrainingTicketPreview
);

// Confirm and create the training ticket after preview
router.post(
  '/confirm-ticket-creation',
  requireRole([UserRole.ADMIN]),
  aiController.confirmTrainingTicketCreation
);

// Generate simulated user response for an AI ticket
router.post('/tickets/:id/generate-response', aiController.generateUserResponse);

// Get the solution for an AI-generated ticket
// HUOM: vain ADMIN. Tämä palauttaa tiketin piilotetun ratkaisun, jonka
// opiskelijan on tarkoitus selvittää itse. Aiemmin reitti oli avoinna myös
// SUPPORT-roolille eli harjoitteleville opiskelijoille.
router.get(
  '/tickets/:ticketId/solution',
  requireRole([UserRole.ADMIN]),
  aiController.getTicketSolution
);

// Summarize a ticket conversation
router.post('/tickets/:ticketId/summarize', aiController.summarizeConversation);

// Get support assistant response for a specific question about a ticket
router.post('/tickets/:ticketId/support-assistant', aiController.getSupportAssistantResponse);

// Get streaming support assistant response for a specific question about a ticket
router.post('/tickets/:ticketId/support-assistant/stream', aiController.getSupportAssistantResponseStream);

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

// --- AI Settings Routes (Admin only) ---
router.get(
  '/settings',
  requireRole([UserRole.ADMIN]),
  aiSettingsController.getSettings
);

router.put(
  '/settings',
  requireRole([UserRole.ADMIN]),
  aiSettingsController.updateSettings
);

router.post(
  '/settings/reset',
  requireRole([UserRole.ADMIN]),
  aiSettingsController.resetSettings
);
// --- End AI Settings Routes ---

export default router; 