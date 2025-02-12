import { Request, Response, NextFunction } from 'express';
import { PrismaClient, UserRole } from '@prisma/client';

const prisma = new PrismaClient();

// Middleware roolien tarkistamiseen
export const requireRole = (requiredRoles: UserRole | UserRole[]) => {
  const roles = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];
  
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user?.email) {
        return res.status(403).json({ error: 'Käyttäjä ei ole kirjautunut sisään' });
      }

      const user = await prisma.user.findUnique({
        where: { email: req.user.email },
        select: { role: true }
      });

      if (!user) {
        return res.status(403).json({ error: 'Käyttäjää ei löydy' });
      }

      // Admin has access to everything
      if (user.role === UserRole.ADMIN) {
        return next();
      }

      // Check if user's role is in the required roles
      if (!roles.includes(user.role)) {
        return res.status(403).json({ error: 'Ei käyttöoikeutta' });
      }

      next();
    } catch (error) {
      console.error('Role middleware error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
};

// Middleware käyttäjän omien resurssien tarkistamiseen
export const requireOwnership = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user?.email) {
      return res.status(403).json({ error: 'Käyttäjä ei ole kirjautunut sisään' });
    }

    const user = await prisma.user.findUnique({
      where: { email: req.user.email },
      select: { id: true, role: true }
    });

    if (!user) {
      return res.status(403).json({ error: 'Käyttäjää ei löydy' });
    }

    // Jos käyttäjä on admin tai tukihenkilö, sallitaan pääsy
    if (user.role === UserRole.ADMIN || user.role === UserRole.SUPPORT) {
      return next();
    }

    // Tarkistetaan onko resurssi käyttäjän oma
    const resourceId = req.params.id;
    const ticket = await prisma.ticket.findUnique({
      where: { id: resourceId },
      select: { createdById: true }
    });

    if (!ticket) {
      return res.status(404).json({ error: 'Tikettiä ei löydy' });
    }

    if (ticket.createdById !== user.id) {
      return res.status(403).json({ error: 'Ei käyttöoikeutta tähän tikettiin' });
    }

    next();
  } catch (error) {
    console.error('Ownership middleware error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}; 