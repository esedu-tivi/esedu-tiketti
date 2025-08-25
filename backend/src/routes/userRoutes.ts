import express, { Request, Response } from 'express';
import { UserRole } from '@prisma/client';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { requireRole } from '../middleware/roleMiddleware.js';
import { prisma } from '../lib/prisma.js';
import { getProfilePicture, getProfilePictureByEmail, updateProfilePictureFromMicrosoft } from '../controllers/userController.js';
import { asyncHandler, AuthenticationError, NotFoundError, ValidationError, AuthorizationError } from '../middleware/errorHandler.js';

const router = express.Router();

// Hae kirjautuneen käyttäjän tiedot (auto-create if doesn't exist)
router.get('/me', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
    if (!req.user?.email) {
      throw new AuthenticationError('Unauthorized');
    }

    let user = await prisma.user.findUnique({
      where: { email: req.user.email },
      select: {
        id: true,
        email: true,
        name: true,
        jobTitle: true,
        role: true
      }
    });

    // Auto-create user if they don't exist (happens when /auth/login fails or hasn't been called yet)
    if (!user) {
      console.log('[/me] User not found, auto-creating:', req.user.email);
      user = await prisma.user.create({
        data: {
          email: req.user.email,
          name: req.user.name || req.user.email.split('@')[0], // Use name from token or email prefix
          role: UserRole.USER // Default role
        },
        select: {
          id: true,
          email: true,
          name: true,
          jobTitle: true,
          role: true
        }
      });
      console.log('[/me] User auto-created successfully:', user.id);
    }

    res.json(user);
}));

// Hae kaikki käyttäjät (admin ja support)
router.get('/', authMiddleware, requireRole([UserRole.ADMIN, UserRole.SUPPORT]), asyncHandler(async (req: Request, res: Response) => {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        jobTitle: true,
        role: true
      },
      orderBy: {
        name: 'asc'
      }
    });
    res.json(users);
}));

// Päivitä käyttäjän rooli (vain admin)
router.put('/:id/role', authMiddleware, requireRole(UserRole.ADMIN), asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { role } = req.body;

    // Tarkista että rooli on validi
    if (!Object.values(UserRole).includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    // Estä adminin roolin muuttaminen
    const targetUser = await prisma.user.findUnique({
      where: { id },
      select: { role: true }
    });

    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (targetUser.role === UserRole.ADMIN) {
      return res.status(403).json({ error: 'Cannot modify admin role' });
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: { role },
      select: {
        id: true,
        email: true,
        name: true,
        role: true
      }
    });

    res.json(updatedUser);
}));

// Vaihda käyttäjän rooli (vain development-ympäristössä)
router.put('/role', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
  // Tarkistetaan että ollaan development-ympäristössä
  if (process.env.ENVIRONMENT === 'production') {
    throw new AuthorizationError('Role switching is only available in development environment');
  }

    if (!req.user?.email) {
      throw new AuthenticationError('Unauthorized');
    }

    const { role } = req.body;

    // Tarkistetaan että rooli on validi
    if (!Object.values(UserRole).includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    const updatedUser = await prisma.user.update({
      where: { email: req.user.email },
      data: { role },
      select: {
        id: true,
        email: true,
        name: true,
        role: true
      }
    });

    res.json(updatedUser);
}));

// Hae kaikki tukihenkilöt (sallittu tukihenkilöille ja admineille)
router.get('/support', authMiddleware, requireRole([UserRole.SUPPORT, UserRole.ADMIN]), asyncHandler(async (req: Request, res: Response) => {
    const users = await prisma.user.findMany({
      where: {
        OR: [
          { role: UserRole.SUPPORT },
          { role: UserRole.ADMIN }
        ]
      },
      select: {
        id: true,
        email: true,
        name: true,
        jobTitle: true,
        role: true
      },
      orderBy: {
        name: 'asc'
      }
    });
    res.json(users);
}));

// Profile picture routes - using Microsoft Graph API
router.post('/profile-picture/microsoft', authMiddleware, updateProfilePictureFromMicrosoft);
router.get('/profile-picture/:userId', getProfilePicture);
router.get('/profile-picture/by-email/:email', getProfilePictureByEmail);

export default router; 