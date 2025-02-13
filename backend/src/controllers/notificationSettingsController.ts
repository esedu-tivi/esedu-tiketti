import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Get user's notification settings
export const getNotificationSettings = async (req: Request, res: Response) => {
  try {
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

    // Then find or create notification settings
    const settings = await (prisma as any).notificationSettings.findUnique({
      where: { userId: user.id }
    });

    if (!settings) {
      // Create default settings if none exist
      const newSettings = await (prisma as any).notificationSettings.create({
        data: {
          userId: user.id
        }
      });
      return res.json(newSettings);
    }

    res.json(settings);
  } catch (error) {
    console.error('Error fetching notification settings:', error);
    res.status(500).json({ error: 'Failed to fetch notification settings' });
  }
};

// Update notification settings
export const updateNotificationSettings = async (req: Request, res: Response) => {
  try {
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
        emailNotifications: req.body.emailNotifications,
        webNotifications: req.body.webNotifications,
        notifyOnAssigned: req.body.notifyOnAssigned,
        notifyOnStatusChange: req.body.notifyOnStatusChange,
        notifyOnComment: req.body.notifyOnComment,
        notifyOnPriority: req.body.notifyOnPriority,
        notifyOnMention: req.body.notifyOnMention,
        notifyOnDeadline: req.body.notifyOnDeadline
      },
      create: {
        userId: user.id,
        emailNotifications: req.body.emailNotifications ?? true,
        webNotifications: req.body.webNotifications ?? true,
        notifyOnAssigned: req.body.notifyOnAssigned ?? true,
        notifyOnStatusChange: req.body.notifyOnStatusChange ?? true,
        notifyOnComment: req.body.notifyOnComment ?? true,
        notifyOnPriority: req.body.notifyOnPriority ?? true,
        notifyOnMention: req.body.notifyOnMention ?? true,
        notifyOnDeadline: req.body.notifyOnDeadline ?? true
      }
    });

    res.json(settings);
  } catch (error) {
    console.error('Error updating notification settings:', error);
    res.status(500).json({ error: 'Failed to update notification settings' });
  }
}; 