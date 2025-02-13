import express from 'express';
import { ticketController } from '../controllers/ticketController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { requireRole, requireOwnership } from '../middleware/roleMiddleware.js';
import { canModifyTicket } from '../middleware/checkRole.js';
import { UserRole } from '@prisma/client';
import { validateTicket, validateComment } from '../middleware/validationMiddleware.js';

const router = express.Router();

// Julkiset reitit (vaativat vain autentikaation)
router.post('/', 
  authMiddleware, 
  validateTicket,
  ticketController.createTicket
);

router.post('/:id/comments', 
  authMiddleware, 
  validateComment,
  ticketController.addCommentToTicket
);

// Käyttäjän omat tiketit
router.get('/my-tickets', authMiddleware, ticketController.getMyTickets);

// Reitit jotka vaativat omistajuuden tai admin-oikeudet
router.get('/:id', authMiddleware, requireOwnership, ticketController.getTicketById);
router.put('/:id', authMiddleware, requireOwnership, validateTicket, ticketController.updateTicket);
router.delete('/:id', authMiddleware, requireOwnership, ticketController.deleteTicket);

// Management-tason reitit (admin ja tukihenkilöt)
router.get('/', authMiddleware, requireRole(UserRole.SUPPORT), ticketController.getAllTickets);
router.put('/:id/assign', authMiddleware, requireRole(UserRole.SUPPORT), canModifyTicket, ticketController.assignTicket);
router.put('/:id/status', authMiddleware, requireRole(UserRole.SUPPORT), canModifyTicket, ticketController.updateTicketStatusWithComment);
router.put('/:id/take', authMiddleware, requireRole(UserRole.SUPPORT), ticketController.takeTicketIntoProcessing);
router.put('/:id/release', authMiddleware, requireRole(UserRole.SUPPORT), canModifyTicket, ticketController.releaseTicket);
router.put('/:id/transfer', authMiddleware, requireRole(UserRole.SUPPORT), canModifyTicket, ticketController.transferTicket);

export default router; 