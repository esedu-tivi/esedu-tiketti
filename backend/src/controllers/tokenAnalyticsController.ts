import { Request, Response } from 'express';
import { tokenTrackingService } from '../services/tokenTrackingService.js';
import logger from '../utils/logger.js';
import { z } from 'zod';

// Validation schemas
const AnalyticsQuerySchema = z.object({
  startDate: z.string().optional().transform(val => val ? new Date(val) : undefined),
  endDate: z.string().optional().transform(val => val ? new Date(val) : undefined),
  agentType: z.enum(['chat', 'support', 'generator', 'summarizer']).optional(),
  userId: z.string().optional(),
  ticketId: z.string().optional(),
});

const DailyUsageQuerySchema = z.object({
  days: z.string().optional().transform(val => val ? parseInt(val) : 30),
});

export const tokenAnalyticsController = {
  /**
   * Get comprehensive token usage analytics
   * GET /api/ai/token-analytics
   */
  async getTokenAnalytics(req: Request, res: Response) {
    try {
      const query = AnalyticsQuerySchema.parse(req.query);
      
      const analytics = await tokenTrackingService.getTokenAnalytics({
        startDate: query.startDate,
        endDate: query.endDate,
        agentType: query.agentType,
        userId: query.userId,
        ticketId: query.ticketId,
      });

      res.json({
        success: true,
        data: analytics
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: 'Invalid query parameters',
          details: error.errors
        });
      }
      
      logger.error('❌ Error fetching token analytics:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch token analytics'
      });
    }
  },

  /**
   * Get daily token usage for charts
   * GET /api/ai/token-analytics/daily
   */
  async getDailyTokenUsage(req: Request, res: Response) {
    try {
      const query = DailyUsageQuerySchema.parse(req.query);
      
      const dailyUsage = await tokenTrackingService.getDailyTokenUsage(query.days);

      res.json({
        success: true,
        data: dailyUsage
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: 'Invalid query parameters',
          details: error.errors
        });
      }
      
      logger.error('❌ Error fetching daily token usage:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch daily token usage'
      });
    }
  },

  /**
   * Get top users by token usage
   * GET /api/ai/token-analytics/top-users
   */
  async getTopUsersByTokenUsage(req: Request, res: Response) {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      
      const topUsers = await tokenTrackingService.getTopUsersByTokenUsage(limit);

      res.json({
        success: true,
        data: topUsers
      });
    } catch (error) {
      logger.error('❌ Error fetching top users by token usage:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch top users'
      });
    }
  },

  /**
   * Get current month's token usage summary
   * GET /api/ai/token-analytics/summary
   */
  async getTokenUsageSummary(req: Request, res: Response) {
    try {
      // Get current month's start date
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      
      // Get analytics for current month
      const currentMonthAnalytics = await tokenTrackingService.getTokenAnalytics({
        startDate: startOfMonth,
        endDate: now
      });

      // Get previous month for comparison
      const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
      
      const lastMonthAnalytics = await tokenTrackingService.getTokenAnalytics({
        startDate: startOfLastMonth,
        endDate: endOfLastMonth
      });

      // Calculate percentage changes
      const tokenChange = lastMonthAnalytics.stats.totalTokens > 0
        ? ((currentMonthAnalytics.stats.totalTokens - lastMonthAnalytics.stats.totalTokens) / lastMonthAnalytics.stats.totalTokens) * 100
        : 0;

      const costChange = lastMonthAnalytics.stats.totalCost > 0
        ? ((currentMonthAnalytics.stats.totalCost - lastMonthAnalytics.stats.totalCost) / lastMonthAnalytics.stats.totalCost) * 100
        : 0;

      res.json({
        success: true,
        data: {
          currentMonth: {
            totalTokens: currentMonthAnalytics.stats.totalTokens,
            totalCost: currentMonthAnalytics.stats.totalCost,
            totalRequests: currentMonthAnalytics.stats.totalRequests,
            avgTokensPerRequest: currentMonthAnalytics.stats.avgTokensPerRequest,
            avgResponseTime: currentMonthAnalytics.stats.avgResponseTime,
            successRate: currentMonthAnalytics.stats.successRate,
            byAgent: currentMonthAnalytics.stats.byAgent,
            byModel: currentMonthAnalytics.stats.byModel
          },
          lastMonth: {
            totalTokens: lastMonthAnalytics.stats.totalTokens,
            totalCost: lastMonthAnalytics.stats.totalCost,
            totalRequests: lastMonthAnalytics.stats.totalRequests
          },
          changes: {
            tokenChange,
            costChange
          }
        }
      });
    } catch (error) {
      logger.error('❌ Error fetching token usage summary:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch token usage summary'
      });
    }
  }
};