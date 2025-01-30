import express from 'express';
import { authController } from '../controllers/authController.js';

const router = express.Router();

router.post('/login', authController.handleLogin);

export default router; 