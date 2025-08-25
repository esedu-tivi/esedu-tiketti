import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger.js';
import { asyncHandler, NotFoundError, AuthorizationError } from '../middleware/errorHandler.js';
import { prisma } from '../lib/prisma.js';
import { NotificationType } from '@prisma/client';
import { getSocketService } from '../services/socketService.js';


// Utility function to create notifications
export const createNotification = async (
  userId: string,
  type: NotificationType,
  content: string,
  ticketId?: string,
  metadata?: Record<string, any>
) => {
  logger.info('Creating notification:', { userId, type, content, ticketId, metadata });

  // Get or create notification settings with retry logic for race conditions
  let settings;
  let retries = 3;
  
  while (retries > 0) {
    try {
      settings = await prisma.notificationSettings.upsert({
        where: { userId: userId },
        update: {}, // Don't update if exists, just return it
        create: {
          userId: userId,
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
        logger.warn(`Notification settings upsert failed due to race condition, retrying... (${retries} retries left)`);
        // Wait a bit before retry (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, 100 * (4 - retries)));
        // Try to find existing settings
        settings = await prisma.notificationSettings.findUnique({
          where: { userId: userId }
        });
        if (settings) {
          logger.info('Found existing notification settings after retry');
          break; // Found existing settings, exit loop
        }
        // Otherwise continue to retry
      } else {
        throw error; // Re-throw if not a unique constraint error or out of retries
      }
    }
  }
  
  if (!settings) {
    logger.error('Failed to get or create notification settings after retries');
    return null;
  }

  logger.info('Notification settings:', settings);

  // Check if notifications are enabled for this type
  const shouldNotify = (() => {
    switch (type) {
      case 'TICKET_ASSIGNED':
        return settings.notifyOnAssigned;
      case 'COMMENT_ADDED':
        return settings.notifyOnComment;
      case 'STATUS_CHANGED':
        return settings.notifyOnStatusChange;
      case 'PRIORITY_CHANGED':
        return settings.notifyOnPriority;
      case 'MENTIONED':
        return settings.notifyOnMention;
      default:
        return true;
    }
  })();

  logger.info('Should notify based on settings:', shouldNotify);

  // If notifications are disabled for this type, return without creating notification
  if (!shouldNotify) {
    logger.info(`Notification of type ${type} skipped due to user settings`);
    return null;
  }

  // If web notifications are disabled, don't create notification
  if (!settings.webNotifications) {
    logger.info('Web notifications are disabled for user');
    return null;
  }
  
  // Get user email for WebSocket notification
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true }
  });

  const notification = await prisma.notification.create({
    data: {
      userId,
      type,
      content,
      ticketId,
      metadata,
    },
    include: {
      ticket: {
        select: {
          id: true,
          title: true,
        },
      },
    },
  });

  logger.info('Created notification in database:', notification);

  if (user?.email) {
    // Send real-time notification via WebSocket
    logger.info('Sending notification via WebSocket to:', user.email);
    getSocketService().sendNotificationToUser(user.email, notification);
  } else {
    logger.info('Could not send WebSocket notification - user email not found');
  }

  return notification;
};

// Get all notifications for the current user
export const getUserNotifications = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user?.email) {
      return res.status(401).json({ error: 'Unauthorized: User email not found' });
    }

    const user = await prisma.user.findUnique({
      where: { email: req.user.email }
    });

    if (!user) {
      return res.status(401).json({ error: 'Unauthorized: User not found' });
    }

    const notifications = await prisma.notification.findMany({
      where: {
        userId: user.id,
      },
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        ticket: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    res.json(notifications);
});

// Mark notification as read
export const markAsRead = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
    if (!req.user?.email) {
      return res.status(401).json({ error: 'Unauthorized: User email not found' });
    }

    const user = await prisma.user.findUnique({
      where: { email: req.user.email }
    });

    if (!user) {
      return res.status(401).json({ error: 'Unauthorized: User not found' });
    }

    const notification = await prisma.notification.findUnique({
      where: { id },
    });

    if (!notification) {
      throw new NotFoundError('Notification not found');
    }

    if (notification.userId !== user.id) {
      throw new AuthorizationError('Not authorized to modify this notification');
    }

    const updatedNotification = await prisma.notification.update({
      where: { id },
      data: { read: true },
    });

    res.json(updatedNotification);
});

// Mark all notifications as read for the current user
export const markAllAsRead = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user?.email) {
      return res.status(401).json({ error: 'Unauthorized: User email not found' });
    }

    const user = await prisma.user.findUnique({
      where: { email: req.user.email }
    });

    if (!user) {
      return res.status(401).json({ error: 'Unauthorized: User not found' });
    }

    await prisma.notification.updateMany({
      where: {
        userId: user.id,
        read: false,
      },
      data: { read: true },
    });

    res.json({ message: 'All notifications marked as read' });
});

// Delete a notification
export const deleteNotification = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
    if (!req.user?.email) {
      return res.status(401).json({ error: 'Unauthorized: User email not found' });
    }

    const user = await prisma.user.findUnique({
      where: { email: req.user.email }
    });

    if (!user) {
      return res.status(401).json({ error: 'Unauthorized: User not found' });
    }

    const notification = await prisma.notification.findUnique({
      where: { id },
    });

    if (!notification) {
      throw new NotFoundError('Notification not found');
    }

    if (notification.userId !== user.id) {
      throw new AuthorizationError('Not authorized to delete this notification');
    }

    await prisma.notification.delete({
      where: { id },
    });

    res.json({ message: 'Notification deleted successfully' });
});

// Get unread notification count
export const getUnreadCount = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user?.email) {
      return res.status(401).json({ error: 'Unauthorized: User email not found' });
    }

    const user = await prisma.user.findUnique({
      where: { email: req.user.email }
    });

    if (!user) {
      return res.status(401).json({ error: 'Unauthorized: User not found' });
    }

    const count = await prisma.notification.count({
      where: {
        userId: user.id,
        read: false,
      },
    });

    res.json({ count });
}); 