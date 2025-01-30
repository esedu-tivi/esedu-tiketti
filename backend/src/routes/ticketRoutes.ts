import express from 'express';
import { ticketController } from '../controllers/ticketController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { requireRole, requireOwnership } from '../middleware/roleMiddleware.js';
import { UserRole } from '@prisma/client';

const router = express.Router();

// Julkiset reitit (vaativat vain autentikaation)
router.post('/', authMiddleware, ticketController.createTicket);

// Käyttäjän omat tiketit
router.get('/my-tickets', authMiddleware, ticketController.getMyTickets);

// Reitit jotka vaativat omistajuuden tai admin-oikeudet
router.get('/:id', authMiddleware, requireOwnership, ticketController.getTicketById);
router.put('/:id', authMiddleware, requireOwnership, ticketController.updateTicket);
router.delete('/:id', authMiddleware, requireOwnership, ticketController.deleteTicket);

// Management-tason reitit (admin ja tukihenkilöt)
router.get('/', authMiddleware, requireRole(UserRole.SUPPORT), ticketController.getAllTickets);
router.put('/:id/assign', authMiddleware, requireRole(UserRole.SUPPORT), ticketController.assignTicket);
router.put('/:id/status', authMiddleware, requireRole(UserRole.SUPPORT), ticketController.updateTicketStatus);

export default router; 