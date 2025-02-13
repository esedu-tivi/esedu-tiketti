import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import ticketRoutes from './routes/ticketRoutes.js';
import userRoutes from './routes/userRoutes.js';
import categoryRoutes from './routes/categoryRoutes.js';
import authRoutes from './routes/authRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import notificationSettingsRoutes from './routes/notificationSettingsRoutes.js';
import { createServer } from 'http';
import { initializeSocketService } from './services/socketService.js';

// Ladataan ympäristömuuttujat
dotenv.config();

// Luodaan Prisma-instanssi
export const prisma = new PrismaClient();

// Luodaan Express-sovellus
const app = express();

// Create HTTP server
const httpServer = createServer(app);

// Initialize Socket.IO
initializeSocketService(httpServer);

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/tickets', ticketRoutes);
app.use('/api/users', userRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/notification-settings', notificationSettingsRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Suljetaan Prisma-yhteys kun sovellus suljetaan
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

export { httpServer };
export default app; 