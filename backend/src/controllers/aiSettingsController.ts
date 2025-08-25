import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import logger from '../utils/logger.js';

const prisma = new PrismaClient();

// Validation schema for AI settings
const AISettingsSchema = z.object({
  chatAgentVersion: z.enum(['modern', 'legacy']).optional(),
  hintSystemEnabled: z.boolean().optional(),
  hintOnEarlyThreshold: z.number().min(1).max(10).optional(),
  hintOnProgressThreshold: z.number().min(1).max(10).nullable().optional(),
  hintOnCloseThreshold: z.number().min(1).max(10).nullable().optional(),
  hintCooldownTurns: z.number().min(0).max(999).optional(),
  hintMaxPerConversation: z.number().min(1).max(999).optional(),
});

export const aiSettingsController = {
  /**
   * Get current AI settings
   * GET /api/ai/settings
   */
  async getSettings(req: Request, res: Response) {
    try {
      // Try to get existing settings
      let settings = await prisma.aISettings.findFirst();
      
      // If no settings exist, create default settings
      if (!settings) {
        settings = await prisma.aISettings.create({
          data: {
            chatAgentVersion: 'modern',
            hintSystemEnabled: true,
            hintOnEarlyThreshold: 3,
            hintOnProgressThreshold: null,
            hintOnCloseThreshold: null,
            hintCooldownTurns: 0,
            hintMaxPerConversation: 999,
          }
        });
        logger.info('🔧 Created default AI settings');
      }
      
      res.json({
        success: true,
        data: settings
      });
    } catch (error) {
      logger.error('❌ Error fetching AI settings:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch AI settings'
      });
    }
  },
  
  /**
   * Update AI settings
   * PUT /api/ai/settings
   */
  async updateSettings(req: Request, res: Response) {
    try {
      // Validate input
      const validatedData = AISettingsSchema.parse(req.body);
      
      // Get user ID from auth
      const userId = (req as any).user?.id;
      
      // Get existing settings or create if not exists
      let settings = await prisma.aISettings.findFirst();
      
      if (!settings) {
        // Create new settings with provided data
        settings = await prisma.aISettings.create({
          data: {
            ...validatedData,
            updatedBy: userId,
            chatAgentVersion: validatedData.chatAgentVersion || 'modern',
            hintSystemEnabled: validatedData.hintSystemEnabled ?? true,
            hintOnEarlyThreshold: validatedData.hintOnEarlyThreshold || 3,
            hintCooldownTurns: validatedData.hintCooldownTurns ?? 0,
            hintMaxPerConversation: validatedData.hintMaxPerConversation || 999,
          }
        });
      } else {
        // Update existing settings
        settings = await prisma.aISettings.update({
          where: { id: settings.id },
          data: {
            ...validatedData,
            updatedBy: userId,
            updatedAt: new Date()
          }
        });
      }
      
      logger.info(`✅ AI settings updated by user ${userId}`);
      
      res.json({
        success: true,
        data: settings,
        message: 'AI settings updated successfully'
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: 'Invalid settings data',
          details: error.errors
        });
      }
      
      logger.error('❌ Error updating AI settings:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update AI settings'
      });
    }
  },
  
  /**
   * Reset AI settings to defaults
   * POST /api/ai/settings/reset
   */
  async resetSettings(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      
      // Delete existing settings
      await prisma.aISettings.deleteMany({});
      
      // Create default settings
      const settings = await prisma.aISettings.create({
        data: {
          chatAgentVersion: 'modern',
          hintSystemEnabled: true,
          hintOnEarlyThreshold: 3,
          hintOnProgressThreshold: null,
          hintOnCloseThreshold: null,
          hintCooldownTurns: 0,
          hintMaxPerConversation: 999,
          updatedBy: userId
        }
      });
      
      logger.info(`🔄 AI settings reset to defaults by user ${userId}`);
      
      res.json({
        success: true,
        data: settings,
        message: 'AI settings reset to defaults'
      });
    } catch (error) {
      logger.error('❌ Error resetting AI settings:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to reset AI settings'
      });
    }
  }
};