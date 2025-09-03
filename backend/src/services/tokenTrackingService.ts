import { PrismaClient } from '@prisma/client';
import logger from '../utils/logger.js';

const prisma = new PrismaClient();

interface TokenUsageData {
  agentType: 'chat' | 'support' | 'generator' | 'summarizer';
  modelUsed: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  ticketId?: string;
  userId?: string;
  requestType?: string;
  success?: boolean;
  errorMessage?: string;
  responseTime?: number;
}

// Cost per 1K tokens for different models (in USD)
// OpenAI prices are per 1M tokens, so we divide by 1000 for per 1K calculation
const MODEL_COSTS = {
  // GPT-5 models (prices per 1M tokens / 1000)
  'gpt-5': { input: 1.25 / 1000, output: 10.0 / 1000 }, // $1.25/$10 per 1M
  'gpt-5-mini': { input: 0.25 / 1000, output: 2.0 / 1000 }, // $0.25/$2 per 1M
  'gpt-5-nano': { input: 0.05 / 1000, output: 0.4 / 1000 }, // $0.05/$0.40 per 1M
  
  // GPT-4.1 models (prices per 1M tokens / 1000)
  'gpt-4.1': { input: 3.0 / 1000, output: 12.0 / 1000 }, // $3/$12 per 1M
  'gpt-4.1-mini': { input: 0.8 / 1000, output: 3.2 / 1000 }, // $0.80/$3.20 per 1M
  'gpt-4.1-nano': { input: 0.2 / 1000, output: 0.8 / 1000 }, // $0.20/$0.80 per 1M
  
// O4 models (prices per 1M tokens / 1000)
  'o4-mini': { input: 4.0 / 1000, output: 16.0 / 1000 }, // $4/$16 per 1M
  
  // Legacy GPT-4 models (keeping for backward compatibility)
  'gpt-4': { input: 0.03, output: 0.06 },
  'gpt-4-turbo': { input: 0.01, output: 0.03 },
  'gpt-4o': { input: 0.005, output: 0.015 },
  'gpt-4o-mini': { input: 0.00015, output: 0.0006 },
  
  // GPT-3.5 models
  'gpt-3.5-turbo': { input: 0.0005, output: 0.0015 },
  
  // Default fallback
  'default': { input: 0.001, output: 0.002 }
};

class TokenTrackingService {
  /**
   * Calculate estimated cost based on model and token usage
   */
  private calculateCost(modelName: string, promptTokens: number, completionTokens: number): number {
    const costs = MODEL_COSTS[modelName as keyof typeof MODEL_COSTS] || MODEL_COSTS.default;
    
    const inputCost = (promptTokens / 1000) * costs.input;
    const outputCost = (completionTokens / 1000) * costs.output;
    
    return inputCost + outputCost;
  }

  /**
   * Track token usage for an AI request
   */
  async trackTokenUsage(data: TokenUsageData): Promise<void> {
    try {
      const estimatedCost = this.calculateCost(
        data.modelUsed,
        data.promptTokens,
        data.completionTokens
      );

      await prisma.aITokenUsage.create({
        data: {
          agentType: data.agentType,
          modelUsed: data.modelUsed,
          promptTokens: data.promptTokens,
          completionTokens: data.completionTokens,
          totalTokens: data.totalTokens,
          estimatedCost,
          ticketId: data.ticketId,
          userId: data.userId,
          requestType: data.requestType,
          success: data.success ?? true,
          errorMessage: data.errorMessage,
          responseTime: data.responseTime,
        }
      });

      logger.info(`📊 [TokenTracking] Tracked usage: ${data.agentType} - ${data.totalTokens} tokens ($${estimatedCost.toFixed(4)})`);
    } catch (error) {
      logger.error('❌ [TokenTracking] Failed to track token usage:', error);
      // Don't throw - we don't want token tracking failures to break the main flow
    }
  }

  /**
   * Get token usage analytics for a specific time period
   */
  async getTokenAnalytics(params: {
    startDate?: Date;
    endDate?: Date;
    agentType?: string;
    userId?: string;
    ticketId?: string;
  }) {
    const where: any = {};

    if (params.startDate || params.endDate) {
      where.createdAt = {};
      if (params.startDate) where.createdAt.gte = params.startDate;
      if (params.endDate) where.createdAt.lte = params.endDate;
    }

    if (params.agentType) where.agentType = params.agentType;
    if (params.userId) where.userId = params.userId;
    if (params.ticketId) where.ticketId = params.ticketId;

    const usage = await prisma.aITokenUsage.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });

    // Calculate aggregated stats
    const stats = {
      totalRequests: usage.length,
      totalTokens: usage.reduce((sum: number, u: any) => sum + u.totalTokens, 0),
      totalPromptTokens: usage.reduce((sum: number, u: any) => sum + u.promptTokens, 0),
      totalCompletionTokens: usage.reduce((sum: number, u: any) => sum + u.completionTokens, 0),
      totalCost: usage.reduce((sum: number, u: any) => sum + (u.estimatedCost || 0), 0),
      avgTokensPerRequest: usage.length > 0 
        ? Math.round(usage.reduce((sum: number, u: any) => sum + u.totalTokens, 0) / usage.length)
        : 0,
      avgResponseTime: usage.length > 0
        ? usage.reduce((sum: number, u: any) => sum + (u.responseTime || 0), 0) / usage.length
        : 0,
      successRate: usage.length > 0
        ? (usage.filter((u: any) => u.success).length / usage.length) * 100
        : 100,
      byAgent: {} as Record<string, any>,
      byModel: {} as Record<string, any>,
    };

    // Group by agent type
    for (const record of usage) {
      if (!stats.byAgent[record.agentType]) {
        stats.byAgent[record.agentType] = {
          requests: 0,
          totalTokens: 0,
          totalCost: 0,
          avgResponseTime: 0,
          responseTimeSum: 0
        };
      }
      
      const agent = stats.byAgent[record.agentType];
      agent.requests++;
      agent.totalTokens += record.totalTokens;
      agent.totalCost += record.estimatedCost || 0;
      agent.responseTimeSum += record.responseTime || 0;
    }

    // Calculate averages for agents
    for (const agentType in stats.byAgent) {
      const agent = stats.byAgent[agentType];
      agent.avgResponseTime = agent.requests > 0 
        ? agent.responseTimeSum / agent.requests 
        : 0;
      delete agent.responseTimeSum;
    }

    // Group by model
    for (const record of usage) {
      if (!stats.byModel[record.modelUsed]) {
        stats.byModel[record.modelUsed] = {
          requests: 0,
          totalTokens: 0,
          totalCost: 0
        };
      }
      
      const model = stats.byModel[record.modelUsed];
      model.requests++;
      model.totalTokens += record.totalTokens;
      model.totalCost += record.estimatedCost || 0;
    }

    return {
      usage,
      stats
    };
  }

  /**
   * Get daily token usage for charts
   */
  async getDailyTokenUsage(days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const usage = await prisma.aITokenUsage.groupBy({
      by: ['createdAt'],
      where: {
        createdAt: {
          gte: startDate
        }
      },
      _sum: {
        totalTokens: true,
        estimatedCost: true
      },
      _count: {
        id: true
      }
    });

    // Group by actual date (not datetime)
    const dailyUsage: Record<string, any> = {};
    
    for (const record of usage) {
      const date = new Date(record.createdAt).toISOString().split('T')[0];
      
      if (!dailyUsage[date]) {
        dailyUsage[date] = {
          date,
          totalTokens: 0,
          totalCost: 0,
          requests: 0
        };
      }
      
      dailyUsage[date].totalTokens += record._sum.totalTokens || 0;
      dailyUsage[date].totalCost += record._sum.estimatedCost || 0;
      dailyUsage[date].requests += record._count.id;
    }

    return Object.values(dailyUsage).sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  }

  /**
   * Get top users by token usage
   */
  async getTopUsersByTokenUsage(limit: number = 10) {
    const usage = await prisma.aITokenUsage.groupBy({
      by: ['userId'],
      where: {
        userId: {
          not: null
        }
      },
      _sum: {
        totalTokens: true,
        estimatedCost: true
      },
      _count: {
        id: true
      },
      orderBy: {
        _sum: {
          totalTokens: 'desc'
        }
      },
      take: limit
    });

    // Get user details
    const userIds = usage.map(u => u.userId).filter(Boolean) as string[];
    const users = await prisma.user.findMany({
      where: {
        id: {
          in: userIds
        }
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true
      }
    });

    const userMap = new Map(users.map(u => [u.id, u]));

    return usage.map((u: any) => ({
      user: userMap.get(u.userId!),
      totalTokens: u._sum.totalTokens || 0,
      totalCost: u._sum.estimatedCost || 0,
      requests: u._count.id
    }));
  }
}

export const tokenTrackingService = new TokenTrackingService();