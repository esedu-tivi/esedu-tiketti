import express from 'express';
import { ticketController } from '../controllers/ticketController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();

// Tikettien reitit
router.get('/', authMiddleware, ticketController.getAllTickets);
router.get('/:id', authMiddleware, ticketController.getTicketById);
router.post('/', authMiddleware, ticketController.createTicket);
router.put('/:id', authMiddleware, ticketController.updateTicket);
router.delete('/:id', authMiddleware, ticketController.deleteTicket);

export default router; 