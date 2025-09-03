import { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { } from '@prisma/client';
import { asyncHandler, AuthenticationError } from '../middleware/errorHandler.js';


// Get user's notification settings
export const getNotificationSettings = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user?.email) {
      return res.status(401).json({ error: 'Unauthorized: User email not found' });
    }

    // First find the user
    const user = await prisma.user.findUnique({
      where: { email: req.user.email }
    });

    if (!user) {
      return res.status(401).json({ error: 'Unauthorized: User not found' });
    }

    // Find or create notification settings with retry logic for race conditions
    let settings;
    let retries = 3;
    
    while (retries > 0) {
      try {
        settings = await (prisma as any).notificationSettings.upsert({
          where: { userId: user.id },
          update: {}, // Don't update if exists, just return it
          create: {
            userId: user.id,
            webNotifications: true,
            notifyOnAssigned: true,
            notifyOnStatusChange: true,
            notifyOnComment: true,
            notifyOnPriority: true,
            notifyOnMention: true
          }
        });
        break; // Success, exit loop
      } catch (error: any) {
        // P2002 is Prisma's unique constraint violation error
        if (error.code === 'P2002' && retries > 1) {
          retries--;
          // Wait a bit before retry (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, 100 * (4 - retries)));
          // Try to find existing settings
          settings = await (prisma as any).notificationSettings.findUnique({
            where: { userId: user.id }
          });
          if (settings) {
            break; // Found existing settings, exit loop
          }
          // Otherwise continue to retry
        } else {
          throw error; // Re-throw if not a unique constraint error or out of retries
        }
      }
    }

    res.json(settings);
});

// Update notification settings
export const updateNotificationSettings = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user?.email) {
      return res.status(401).json({ error: 'Unauthorized: User email not found' });
    }

    const user = await prisma.user.findUnique({
      where: { email: req.user.email }
    });

    if (!user) {
      return res.status(401).json({ error: 'Unauthorized: User not found' });
    }

    const settings = await (prisma as any).notificationSettings.upsert({
      where: {
        userId: user.id
      },
      update: {
        webNotifications: req.body.webNotifications,
        notifyOnAssigned: req.body.notifyOnAssigned,
        notifyOnStatusChange: req.body.notifyOnStatusChange,
        notifyOnComment: req.body.notifyOnComment,
        notifyOnPriority: req.body.notifyOnPriority,
        notifyOnMention: req.body.notifyOnMention
      },
      create: {
        userId: user.id,
        webNotifications: req.body.webNotifications ?? true,
        notifyOnAssigned: req.body.notifyOnAssigned ?? true,
        notifyOnStatusChange: req.body.notifyOnStatusChange ?? true,
        notifyOnComment: req.body.notifyOnComment ?? true,
        notifyOnPriority: req.body.notifyOnPriority ?? true,
        notifyOnMention: req.body.notifyOnMention ?? true
      }
    });

    res.json(settings);
}); 