import { PrismaClient } from '@prisma/client';
import logger from '../utils/logger.js';

const prisma = new PrismaClient();

export interface AISettingsData {
  chatAgentVersion: string;
  hintSystemEnabled: boolean;
  hintOnEarlyThreshold: number;
  hintOnProgressThreshold: number | null;
  hintOnCloseThreshold: number | null;
  hintCooldownTurns: number;
  hintMaxPerConversation: number;
}

class AISettingsService {
  private cachedSettings: AISettingsData | null = null;
  private cacheExpiry: Date | null = null;
  private readonly CACHE_DURATION_MS = 60000; // 1 minute cache

  async getSettings(): Promise<AISettingsData> {
    // Check if cache is still valid
    if (this.cachedSettings && this.cacheExpiry && this.cacheExpiry > new Date()) {
      return this.cachedSettings;
    }

    try {
      // Fetch from database
      let settings = await prisma.aISettings.findFirst();
      
      // Create default settings if none exist
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
        logger.info('🔧 Created default AI settings in service');
      }

      // Update cache
      this.cachedSettings = {
        chatAgentVersion: settings.chatAgentVersion,
        hintSystemEnabled: settings.hintSystemEnabled,
        hintOnEarlyThreshold: settings.hintOnEarlyThreshold,
        hintOnProgressThreshold: settings.hintOnProgressThreshold,
        hintOnCloseThreshold: settings.hintOnCloseThreshold,
        hintCooldownTurns: settings.hintCooldownTurns,
        hintMaxPerConversation: settings.hintMaxPerConversation,
      };
      this.cacheExpiry = new Date(Date.now() + this.CACHE_DURATION_MS);

      return this.cachedSettings;
    } catch (error) {
      logger.error('❌ Error fetching AI settings in service:', error);
      
      // Return default settings on error
      return {
        chatAgentVersion: 'modern',
        hintSystemEnabled: true,
        hintOnEarlyThreshold: 3,
        hintOnProgressThreshold: null,
        hintOnCloseThreshold: null,
        hintCooldownTurns: 0,
        hintMaxPerConversation: 999,
      };
    }
  }

  // Clear cache when settings are updated
  clearCache(): void {
    this.cachedSettings = null;
    this.cacheExpiry = null;
  }

  // Check if we should use modern chat agent
  async useModernChatAgent(): Promise<boolean> {
    const settings = await this.getSettings();
    return settings.chatAgentVersion === 'modern';
  }

  // Check if hint system is enabled
  async isHintSystemEnabled(): Promise<boolean> {
    const settings = await this.getSettings();
    return settings.hintSystemEnabled;
  }
}

export const aiSettingsService = new AISettingsService();