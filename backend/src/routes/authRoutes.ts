import express from 'express';
import { authController } from '../controllers/authController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();

// Vaatii tarkistetun tokenin: käyttäjätili luodaan tokenin tietojen
// perusteella. Aiemmin reitti oli täysin avoin, jolloin kuka tahansa
// pystyi luomaan tilejä ja muuttamaan olemassa olevien nimiä.
router.post('/login', authMiddleware, authController.handleLogin);

export default router; 