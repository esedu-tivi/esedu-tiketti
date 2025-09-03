import { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { asyncHandler } from '../middleware/errorHandler.js';

export const categoryController = {
  // Hae kaikki kategoriat
  getAllCategories: asyncHandler(async (req: Request, res: Response) => {
      const categories = await prisma.category.findMany();
      res.json({ categories });
  })
}; 