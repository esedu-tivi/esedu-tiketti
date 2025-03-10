import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { TypedRequest } from '../types/index.js';

interface LoginRequestBody {
  email: string;
  name: string;
  jobTitle?: string;
}

const prisma = new PrismaClient();

export const authController = {
  handleLogin: async (req: TypedRequest<LoginRequestBody>, res: Response) => {
    try {
      const { email, name, jobTitle } = req.body;

      if (!email || !name) {
        return res.status(400).json({ error: 'Email and name are required' });
      }

      // Etsi käyttäjä sähköpostiosoitteen perusteella
      let user = await prisma.user.findUnique({
        where: { email }
      });

      if (!user) {
        // Jos käyttäjää ei löydy, luodaan uusi
        user = await prisma.user.create({
          data: {
            email,
            name,
            jobTitle,
            role: 'USER', // Oletuksena normaali käyttäjä
          }
        });
      } else {
        // Päivitä käyttäjän tiedot, jos ne ovat muuttuneet
        if (user.name !== name || user.jobTitle !== jobTitle) {
          user = await prisma.user.update({
            where: { email },
            data: {
              name,
              jobTitle,
            }
          });
        }
      }

      res.json({ user });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Internal server error during login' });
    }
  }
}; 