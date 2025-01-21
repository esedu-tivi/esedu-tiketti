import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Mock data
const mockTickets = [
  {
    id: 1,
    title: 'Esimerkki tiketti 1',
    description: 'Tämä on ensimmäinen testaus tiketti.',
    status: 'Avoin',
    createdAt: new Date().toISOString()
  },
  {
    id: 2,
    title: 'Esimerkki tiketti 2',
    description: 'Toinen testaus tiketti testausta varten.',
    status: 'Työn alla',
    createdAt: new Date().toISOString()
  }
];

// Perusreitti terveystarkistusta varten
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

// Tikettien reitti - palauttaa mock dataa
app.get('/api/tickets', (req: Request, res: Response) => {
  res.json({ tickets: mockTickets });
});

app.listen(port, () => {
  console.log(`Palvelin käynnissä portissa ${port}`);
}); 
