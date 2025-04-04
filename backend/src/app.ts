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
import aiRoutes from './routes/aiRoutes.js';
import { createServer } from 'http';
import { initializeSocketService } from './services/socketService.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Get current file's directory path in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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

// Käytetään CORS-middlewarea
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Serve static files from the uploads directory
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Määritellään reitit
app.use('/api/tickets', ticketRoutes);
app.use('/api/users', userRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/notification-settings', notificationSettingsRoutes);
app.use('/api/ai', aiRoutes);

// Terveyden tarkistus
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Suljetaan Prisma-yhteys kun sovellus suljetaan
process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

export { httpServer };
export default app; 