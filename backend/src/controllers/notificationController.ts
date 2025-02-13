import { Request, Response } from 'express';
import { PrismaClient, NotificationType } from '@prisma/client';
import { getSocketService } from '../services/socketService.js';

const prisma = new PrismaClient();

// Utility function to create notifications
export const createNotification = async (
  userId: string,
  type: NotificationType,
  content: string,
  ticketId?: string,
  metadata?: Record<string, any>
) => {
  console.log('Creating notification:', { userId, type, content, ticketId, metadata });

  // Get user's notification settings with proper type inclusion
  const userWithSettings = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      notificationSettings: true
    }
  });

  console.log('User with settings:', userWithSettings);

  const settings = userWithSettings?.notificationSettings;
  console.log('Notification settings:', settings);

  // Check if notifications are enabled for this type
  if (settings) {
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
        case 'DEADLINE_APPROACHING':
          return settings.notifyOnDeadline;
        default:
          return true;
      }
    })();

    console.log('Should notify based on settings:', shouldNotify);

    // If notifications are disabled for this type, return without creating notification
    if (!shouldNotify) {
      console.log(`Notification of type ${type} skipped due to user settings`);
      return null;
    }

    // If web notifications are disabled, don't create notification
    if (!settings.webNotifications) {
      console.log('Web notifications are disabled for user');
      return null;
    }
  } else {
    // If no settings exist, create default settings
    console.log('No notification settings found, creating default settings');
    await prisma.notificationSettings.create({
      data: {
        userId: userId,
        emailNotifications: true,
        webNotifications: true,
        notifyOnAssigned: true,
        notifyOnStatusChange: true,
        notifyOnComment: true,
        notifyOnPriority: true,
        notifyOnMention: true,
        notifyOnDeadline: true
      }
    });
  }

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

  console.log('Created notification in database:', notification);

  if (userWithSettings?.email) {
    // Send real-time notification via WebSocket
    console.log('Sending notification via WebSocket to:', userWithSettings.email);
    getSocketService().sendNotificationToUser(userWithSettings.email, notification);
  } else {
    console.log('Could not send WebSocket notification - user email not found');
  }

  return notification;
};

// Get all notifications for the current user
export const getUserNotifications = async (req: Request, res: Response) => {
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
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
};

// Mark notification as read
export const markAsRead = async (req: Request, res: Response) => {
  const { id } = req.params;

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

    const notification = await prisma.notification.findUnique({
      where: { id },
    });

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    if (notification.userId !== user.id) {
      return res.status(403).json({ error: 'Not authorized to modify this notification' });
    }

    const updatedNotification = await prisma.notification.update({
      where: { id },
      data: { read: true },
    });

    res.json(updatedNotification);
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
};

// Mark all notifications as read for the current user
export const markAllAsRead = async (req: Request, res: Response) => {
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

    await prisma.notification.updateMany({
      where: {
        userId: user.id,
        read: false,
      },
      data: { read: true },
    });

    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({ error: 'Failed to mark notifications as read' });
  }
};

// Delete a notification
export const deleteNotification = async (req: Request, res: Response) => {
  const { id } = req.params;

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

    const notification = await prisma.notification.findUnique({
      where: { id },
    });

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    if (notification.userId !== user.id) {
      return res.status(403).json({ error: 'Not authorized to delete this notification' });
    }

    await prisma.notification.delete({
      where: { id },
    });

    res.json({ message: 'Notification deleted successfully' });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({ error: 'Failed to delete notification' });
  }
};

// Get unread notification count
export const getUnreadCount = async (req: Request, res: Response) => {
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

    const count = await prisma.notification.count({
      where: {
        userId: user.id,
        read: false,
      },
    });

    res.json({ count });
  } catch (error) {
    console.error('Error getting unread count:', error);
    res.status(500).json({ error: 'Failed to get unread count' });
  }
}; 