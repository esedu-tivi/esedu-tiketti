import { Request, Response } from 'express';
import { TypedRequest } from '../types/index.js';
import { prisma } from '../lib/prisma.js';
import { asyncHandler, ValidationError } from '../middleware/errorHandler.js';
import logger from '../utils/logger.js';

interface LoginRequestBody {
  email: string;
  name: string;
  jobTitle?: string;
}

export const authController = {
  handleLogin: asyncHandler(async (req: TypedRequest<LoginRequestBody>, res: Response) => {
      const { email, name, jobTitle } = req.body;

      logger.info('Login attempt:', { email, name, jobTitle });

      if (!email || !name) {
        logger.warn('Login failed: Missing email or name', { email, name });
        throw new ValidationError('Email and name are required');
      }

      // Use atomic upsert to avoid race conditions
      logger.info('Upserting user:', { email, name });
      
      const user = await prisma.user.upsert({
        where: { email },
        update: {
          // Always update name and jobTitle in case they changed
          name,
          jobTitle
        },
        create: {
          email,
          name,
          jobTitle,
          role: 'USER' // Oletuksena normaali käyttäjä
        }
      });
      
      logger.info('User upserted successfully:', { userId: user.id, email: user.email });

      // Create notification settings if they don't exist
      // This prevents the need for multiple API calls from the frontend
      await prisma.notificationSettings.upsert({
        where: { userId: user.id },
        update: {}, // Don't update if exists
        create: {
          userId: user.id,
          webNotifications: true,
          notifyOnAssigned: true,
          notifyOnStatusChange: true,
          notifyOnComment: true,
          notifyOnPriority: true,
          notifyOnMention: true,
        },
      });

      // Fetch complete user data with notification settings
      const userWithSettings = await prisma.user.findUnique({
        where: { id: user.id },
        include: {
          notificationSettings: true,
        },
      });

      res.json({ 
        user: userWithSettings,
        message: 'Authentication successful'
      });
  })
}; 