import { PrismaClient } from '@prisma/client';
import logger from '../utils/logger.js';

const prisma = new PrismaClient();

export interface AISettingsData {
  chatAgentVersion: string;
  chatAgentSyncWithGenerator: boolean;
  ticketGeneratorVersion: string;
  hintSystemEnabled: boolean;
  hintOnEarlyThreshold: number;
  hintOnProgressThreshold: number | null;
  hintOnCloseThreshold: number | null;
  hintCooldownTurns: number;
  hintMaxPerConversation: number;
  // Model settings
  chatAgentModel: string;
  supportAssistantModel: string;
  ticketGeneratorModel: string;
  summarizerModel: string;
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
            chatAgentSyncWithGenerator: false,
            ticketGeneratorVersion: 'legacy',
            hintSystemEnabled: true,
            hintOnEarlyThreshold: 3,
            hintOnProgressThreshold: null,
            hintOnCloseThreshold: null,
            hintCooldownTurns: 0,
            hintMaxPerConversation: 999,
            chatAgentModel: 'gpt-4.1',
            supportAssistantModel: 'gpt-4o-mini',
            ticketGeneratorModel: 'gpt-4.1',
            summarizerModel: 'gpt-4.1',
          }
        });
        logger.info('🔧 Created default AI settings in service');
      }

      // Update cache
      this.cachedSettings = {
        chatAgentVersion: settings.chatAgentVersion,
        chatAgentSyncWithGenerator: settings.chatAgentSyncWithGenerator,
        ticketGeneratorVersion: settings.ticketGeneratorVersion,
        hintSystemEnabled: settings.hintSystemEnabled,
        hintOnEarlyThreshold: settings.hintOnEarlyThreshold,
        hintOnProgressThreshold: settings.hintOnProgressThreshold,
        hintOnCloseThreshold: settings.hintOnCloseThreshold,
        hintCooldownTurns: settings.hintCooldownTurns,
        hintMaxPerConversation: settings.hintMaxPerConversation,
        chatAgentModel: settings.chatAgentModel,
        supportAssistantModel: settings.supportAssistantModel,
        ticketGeneratorModel: settings.ticketGeneratorModel,
        summarizerModel: settings.summarizerModel,
      };
      this.cacheExpiry = new Date(Date.now() + this.CACHE_DURATION_MS);

      return this.cachedSettings;
    } catch (error) {
      logger.error('❌ Error fetching AI settings in service:', error);
      
      // Return default settings on error
      return {
        chatAgentVersion: 'modern',
        chatAgentSyncWithGenerator: false,
        ticketGeneratorVersion: 'legacy',
        hintSystemEnabled: true,
        hintOnEarlyThreshold: 3,
        hintOnProgressThreshold: null,
        hintOnCloseThreshold: null,
        hintCooldownTurns: 0,
        hintMaxPerConversation: 999,
        chatAgentModel: 'gpt-4.1',
        supportAssistantModel: 'gpt-4o-mini',
        ticketGeneratorModel: 'gpt-4.1',
        summarizerModel: 'gpt-4.1',
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
  
  // Check if we should use modern ticket generator
  async useModernTicketGenerator(): Promise<boolean> {
    const settings = await this.getSettings();
    return settings.ticketGeneratorVersion === 'modern';
  }

  // Check if hint system is enabled
  async isHintSystemEnabled(): Promise<boolean> {
    const settings = await this.getSettings();
    return settings.hintSystemEnabled;
  }

  // Get model for specific agent
  async getModelForAgent(agent: 'chat' | 'support' | 'generator' | 'summarizer'): Promise<string> {
    const settings = await this.getSettings();
    switch (agent) {
      case 'chat':
        return settings.chatAgentModel;
      case 'support':
        return settings.supportAssistantModel;
      case 'generator':
        return settings.ticketGeneratorModel;
      case 'summarizer':
        return settings.summarizerModel;
      default:
        return 'gpt-4.1';
    }
  }
}

export const aiSettingsService = new AISettingsService();