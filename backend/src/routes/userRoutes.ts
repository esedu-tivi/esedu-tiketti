import express from 'express';
import { PrismaClient, UserRole } from '@prisma/client';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { requireRole } from '../middleware/roleMiddleware.js';

const router = express.Router();
const prisma = new PrismaClient();

// Hae kirjautuneen käyttäjän tiedot
router.get('/me', authMiddleware, async (req, res) => {
  try {
    if (!req.user?.email) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const user = await prisma.user.findUnique({
      where: { email: req.user.email },
      select: {
        id: true,
        email: true,
        name: true,
        jobTitle: true,
        role: true
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Hae kaikki käyttäjät (vain admin)
router.get('/', authMiddleware, requireRole(UserRole.ADMIN), async (req, res) => {
  try {
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
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Päivitä käyttäjän rooli (vain admin)
router.put('/:id/role', authMiddleware, requireRole(UserRole.ADMIN), async (req, res) => {
  try {
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
  } catch (error) {
    console.error('Error updating user role:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Vaihda käyttäjän rooli (vain development-ympäristössä)
router.put('/role', authMiddleware, async (req, res) => {
  // Tarkistetaan että ollaan development-ympäristössä
  if (process.env.ENVIRONMENT === 'production') {
    return res.status(403).json({ error: 'Role switching is only available in development environment' });
  }

  try {
    if (!req.user?.email) {
      return res.status(401).json({ error: 'Unauthorized' });
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
  } catch (error) {
    console.error('Error updating user role:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Hae kaikki tukihenkilöt (sallittu tukihenkilöille ja admineille)
router.get('/support', authMiddleware, requireRole([UserRole.SUPPORT, UserRole.ADMIN]), async (req, res) => {
  try {
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
  } catch (error) {
    console.error('Error fetching support users:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router; 