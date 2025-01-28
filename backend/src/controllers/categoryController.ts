import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const categoryController = {
  // Hae kaikki kategoriat
  getAllCategories: async (req: Request, res: Response) => {
    try {
      const categories = await prisma.category.findMany();
      res.json({ categories });
    } catch (error) {
      console.error('Error fetching categories:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}; 