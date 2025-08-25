import express, { Request, Response } from 'express';
import logger from '../utils/logger.js';
import { prisma } from '../lib/prisma.js';
import os from 'os';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = express.Router();

/**
 * Health check endpoint - no authentication required
 * Used by load balancers and monitoring services
 */
router.get('/', asyncHandler(async (_req: Request, res: Response) => {
  const healthcheck: any = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    service: 'esedu-tiketti-backend',
    version: process.env.npm_package_version || '1.0.0'
  };

  try {
    // Check database connectivity
    await prisma.$queryRaw`SELECT 1`;
    healthcheck.database = 'connected';
  } catch (error) {
    healthcheck.status = 'degraded';
    healthcheck.database = 'disconnected';
    logger.error('Database health check failed:', error);
  }

  // Add system metrics
  healthcheck.system = {
    platform: process.platform,
    memory: {
      free: os.freemem(),
      total: os.totalmem(),
      usage: process.memoryUsage()
    },
    cpu: {
      cores: os.cpus().length,
      loadAverage: os.loadavg()
    }
  };

  const statusCode = healthcheck.status === 'healthy' ? 200 : 503;
  res.status(statusCode).json(healthcheck);
}));

/**
 * Simple liveness probe - just returns OK
 */
router.get('/live', (_req, res) => {
  res.status(200).send('OK');
});

/**
 * Readiness probe - checks if service is ready to handle requests
 */
router.get('/ready', asyncHandler(async (_req: Request, res: Response) => {
  try {
    // Check database is accessible
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).send('READY');
  } catch (error) {
    logger.error('Readiness check failed:', error);
    res.status(503).send('NOT READY');
  }
}));

export default router;