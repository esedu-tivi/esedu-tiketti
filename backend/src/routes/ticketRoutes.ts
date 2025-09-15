import express from 'express';
import { ticketController } from '../controllers/ticketController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { requireRole, requireOwnership } from '../middleware/roleMiddleware.js';
import { canModifyTicket } from '../middleware/checkRole.js';
import { validateTicket, validateComment } from '../middleware/validationMiddleware.js';
import { mediaUpload, ticketAttachmentsUpload } from '../middleware/uploadMiddleware.js';
import { UserRole } from '@prisma/client';

const router = express.Router();

// Public routes
router.get('/', authMiddleware, ticketController.getAllTickets);
// Käyttäjän omat tiketit - this MUST be BEFORE the /:id route
router.get('/my-tickets', authMiddleware, ticketController.getMyTickets);
// Optimized endpoint for MyWorkView - fetches all work-related tickets in one call
router.get('/my-work', authMiddleware, requireRole(UserRole.SUPPORT), ticketController.getMyWorkTickets);

// Path param routes must come after specific routes
router.get('/:id', authMiddleware, requireOwnership, ticketController.getTicketById);

// Protected routes
router.post('/', 
  authMiddleware, 
  ticketAttachmentsUpload,
  validateTicket, 
  ticketController.createTicket
);

router.post('/:id/comments', 
  authMiddleware, 
  validateComment,
  ticketController.addCommentToTicket
);

// Add media comment route
router.post('/:id/comments/media', 
  authMiddleware, 
  mediaUpload,
  ticketController.addMediaCommentToTicket
);

// Reitit jotka vaativat omistajuuden TAI ADMIN-oikeudet
router.put('/:id', authMiddleware, requireOwnership, validateTicket, ticketController.updateTicket);

// Only ADMINS can delete tickets
router.delete('/bulk', authMiddleware, requireRole([UserRole.ADMIN]), ticketController.bulkDeleteTickets);
router.delete('/:id', authMiddleware, requireRole([UserRole.ADMIN]), ticketController.deleteTicket);

// Management-tason reitit (admin ja tukihenkilöt)
// This is a duplicate route - removing it
// router.get('/', authMiddleware, requireRole(UserRole.SUPPORT), ticketController.getAllTickets);
router.put('/:id/assign', authMiddleware, requireRole(UserRole.SUPPORT), canModifyTicket, ticketController.assignTicket);
router.put('/:id/status', authMiddleware, requireRole(UserRole.SUPPORT), canModifyTicket, ticketController.updateTicketStatusWithComment);
router.put('/:id/take', authMiddleware, requireRole(UserRole.SUPPORT), ticketController.takeTicketIntoProcessing);
router.put('/:id/release', authMiddleware, requireRole(UserRole.SUPPORT), canModifyTicket, ticketController.releaseTicket);
router.put('/:id/transfer', authMiddleware, requireRole(UserRole.SUPPORT), canModifyTicket, ticketController.transferTicket);

export default router; 