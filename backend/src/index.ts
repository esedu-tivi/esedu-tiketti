import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import ticketRoutes from './routes/ticketRoutes.js';
import categoryRoutes from './routes/categoryRoutes.js';

dotenv.config();
const prisma = new PrismaClient();

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Perusreitti terveystarkistusta varten
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// API reitit
app.use('/api/tickets', ticketRoutes);
app.use('/api/categories', categoryRoutes);

// Suljetaan Prisma-yhteys kun sovellus suljetaan
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

app.listen(port, () => {
  console.log(`Palvelin käynnissä portissa ${port}`);
}); 
