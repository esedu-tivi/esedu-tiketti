import express from 'express';
import { ticketController } from '../controllers/ticketController.js';

const router = express.Router();

// Tikettien reitit
router.get('/', ticketController.getAllTickets);
router.get('/:id', ticketController.getTicketById);
router.post('/', ticketController.createTicket);
router.put('/:id', ticketController.updateTicket);
router.delete('/:id', ticketController.deleteTicket);

export default router; 