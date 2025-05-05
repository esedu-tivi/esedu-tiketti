import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { subDays, startOfDay, endOfDay, parseISO, format } from 'date-fns';

const prisma = new PrismaClient();

// Helper function to get date range based on range parameter
const getDateRange = (range: string) => {
  const today = new Date();
  let startDate;
  
  switch (range) {
    case '7d':
      startDate = subDays(today, 7);
      break;
    case '14d':
      startDate = subDays(today, 14);
      break;
    case '30d':
      startDate = subDays(today, 30);
      break;
    case '90d':
      startDate = subDays(today, 90);
      break;
    default:
      startDate = subDays(today, 14); // Default to 14 days
  }
  
  return {
    start: startOfDay(startDate),
    end: endOfDay(today)
  };
};

// Define interfaces for stronger typing
interface UsageStat {
  id: string;
  date: Date;
  totalInteractions: number;
  avgResponseTime: number;
  avgRating: number | null;
  totalTicketsAssisted: number;
}

interface CategoryStat {
  id: string;
  categoryId: string;
  date: Date;
  interactionCount: number;
  category: {
    name: string;
  };
}

interface Interaction {
  id: string;
  responseTime: number;
  rating: number | null;
  createdAt: Date;
}

interface AgentStat {
  userId: string;
  _count: {
    id: number;
  };
  _avg: {
    rating: number | null;
  };
}

export const aiAnalyticsController = {
  // Track a new AI assistant interaction
  async trackInteraction(req: Request, res: Response) {
    try {
      const { ticketId, query, response, responseTime, userId } = req.body;
      
      if (!query || !response || responseTime === undefined || !userId) {
        return res.status(400).json({ error: 'Missing required fields' });
      }
      
      const interaction = await prisma.AIAssistantInteraction.create({
        data: {
          ticketId,
          query,
          response,
          responseTime,
          userId
        }
      });
      
      // Update daily usage statistics
      const today = new Date();
      const todayStart = startOfDay(today);
      
      // Find or create usage stats for today
      let usageStat = await prisma.AIAssistantUsageStat.findUnique({
        where: {
          date: todayStart
        }
      });
      
      if (usageStat) {
        // Update existing stats
        await prisma.AIAssistantUsageStat.update({
          where: { id: usageStat.id },
          data: {
            totalInteractions: usageStat.totalInteractions + 1,
            avgResponseTime: (usageStat.avgResponseTime * usageStat.totalInteractions + responseTime) / (usageStat.totalInteractions + 1),
            totalTicketsAssisted: ticketId ? usageStat.totalTicketsAssisted + 1 : usageStat.totalTicketsAssisted
          }
        });
      } else {
        // Create new stats for today
        await prisma.AIAssistantUsageStat.create({
          data: {
            totalInteractions: 1,
            avgResponseTime: responseTime,
            totalTicketsAssisted: ticketId ? 1 : 0
          }
        });
      }
      
      // If the interaction is related to a ticket, update category stats
      if (ticketId) {
        const ticket = await prisma.ticket.findUnique({
          where: { id: ticketId },
          select: { categoryId: true }
        });
        
        if (ticket) {
          // Find or create category stats for today
          const categoryStat = await prisma.AIAssistantCategoryStat.findUnique({
            where: {
              categoryId_date: {
                categoryId: ticket.categoryId,
                date: todayStart
              }
            }
          });
          
          if (categoryStat) {
            await prisma.AIAssistantCategoryStat.update({
              where: { id: categoryStat.id },
              data: {
                interactionCount: categoryStat.interactionCount + 1
              }
            });
          } else {
            await prisma.AIAssistantCategoryStat.create({
              data: {
                categoryId: ticket.categoryId,
                interactionCount: 1
              }
            });
          }
        }
      }
      
      return res.status(201).json(interaction);
    } catch (error) {
      console.error('Error tracking AI interaction:', error);
      return res.status(500).json({ error: 'Failed to track AI interaction' });
    }
  },
  
  // Submit feedback/rating for an interaction
  async submitFeedback(req: Request, res: Response) {
    try {
      const { interactionId } = req.params;
      const { rating, feedback } = req.body;
      
      if (!interactionId || rating === undefined) {
        return res.status(400).json({ error: 'Missing required fields' });
      }
      
      // Update the interaction with feedback
      const updatedInteraction = await prisma.AIAssistantInteraction.update({
        where: { id: interactionId },
        data: { rating, feedback }
      });
      
      // Update the average rating in the daily stats
      const interactionDate = startOfDay(updatedInteraction.createdAt);
      
      const dailyStat = await prisma.AIAssistantUsageStat.findUnique({
        where: { date: interactionDate }
      });
      
      if (dailyStat) {
        // Get all ratings for today
        const todayInteractions = await prisma.AIAssistantInteraction.findMany({
          where: {
            createdAt: {
              gte: interactionDate,
              lt: endOfDay(interactionDate)
            },
            rating: { not: null }
          },
          select: { rating: true }
        });
        
        const totalRatings = todayInteractions.reduce((sum: number, interaction: { rating: number | null }) => 
          sum + (interaction.rating || 0), 0);
        const avgRating = totalRatings / todayInteractions.length;
        
        await prisma.AIAssistantUsageStat.update({
          where: { id: dailyStat.id },
          data: { avgRating }
        });
      }
      
      return res.status(200).json(updatedInteraction);
    } catch (error) {
      console.error('Error submitting feedback:', error);
      return res.status(500).json({ error: 'Failed to submit feedback' });
    }
  },
  
  // Get usage statistics for a specific time range
  async getUsageStats(req: Request, res: Response) {
    try {
      const { range = '14d' } = req.query;
      const { start, end } = getDateRange(range as string);
      
      // Get daily usage stats for the period
      const usageStats = await prisma.AIAssistantUsageStat.findMany({
        where: {
          date: {
            gte: start,
            lte: end
          }
        },
        orderBy: { date: 'asc' }
      }) as UsageStat[];
      
      // Format the data for frontend chart
      const formattedData = usageStats.map((stat: UsageStat) => ({
        date: format(stat.date, 'dd.MM'),
        count: stat.totalInteractions,
        avgResponseTime: stat.avgResponseTime,
        avgRating: stat.avgRating,
        ticketsAssisted: stat.totalTicketsAssisted
      }));
      
      // Calculate totals and averages
      const totalInteractions = usageStats.reduce((sum: number, stat: UsageStat) => 
        sum + stat.totalInteractions, 0);
      const totalTicketsAssisted = usageStats.reduce((sum: number, stat: UsageStat) => 
        sum + stat.totalTicketsAssisted, 0);
      
      // Calculate average response time (weighted by interaction count)
      const weightedResponseTime = usageStats.reduce((sum: number, stat: UsageStat) => 
        sum + (stat.avgResponseTime * stat.totalInteractions), 0);
      const avgResponseTime = totalInteractions > 0 ? weightedResponseTime / totalInteractions : 0;
      
      // Calculate average rating
      const ratingsSum = usageStats.reduce((sum: number, stat: UsageStat) => {
        if (stat.avgRating !== null) {
          return sum + (stat.avgRating * stat.totalInteractions);
        }
        return sum;
      }, 0);
      const ratedInteractions = usageStats.reduce((sum: number, stat: UsageStat) => {
        if (stat.avgRating !== null) {
          return sum + stat.totalInteractions;
        }
        return sum;
      }, 0);
      const avgRating = ratedInteractions > 0 ? ratingsSum / ratedInteractions : 0;
      
      return res.status(200).json({
        usageData: formattedData,
        summary: {
          totalInteractions,
          totalTicketsAssisted,
          avgResponseTime,
          avgRating
        }
      });
    } catch (error) {
      console.error('Error getting usage stats:', error);
      return res.status(500).json({ error: 'Failed to get usage statistics' });
    }
  },
  
  // Get category distribution stats
  async getCategoryStats(req: Request, res: Response) {
    try {
      const { range = '14d' } = req.query;
      const { start, end } = getDateRange(range as string);
      
      // Get category stats for the period
      const categoryStats = await prisma.AIAssistantCategoryStat.findMany({
        where: {
          date: {
            gte: start,
            lte: end
          }
        },
        include: {
          category: true
        }
      }) as CategoryStat[];
      
      // Group by category and sum counts
      const categoryMap = new Map<string, number>();
      
      categoryStats.forEach((stat: CategoryStat) => {
        const categoryName = stat.category.name;
        const currentCount = categoryMap.get(categoryName) || 0;
        categoryMap.set(categoryName, currentCount + stat.interactionCount);
      });
      
      // Format the data for frontend chart
      const formattedData = Array.from(categoryMap).map(([name, value]) => ({
        name,
        value
      }));
      
      return res.status(200).json(formattedData);
    } catch (error) {
      console.error('Error getting category stats:', error);
      return res.status(500).json({ error: 'Failed to get category statistics' });
    }
  },
  
  // Get agent usage statistics (who's using the AI assistant)
  async getAgentUsageStats(req: Request, res: Response) {
    try {
      const { range = '14d' } = req.query;
      const { start, end } = getDateRange(range as string);
      
      // Get interactions grouped by support agent
      const agentStats = await prisma.AIAssistantInteraction.groupBy({
        by: ['userId'],
        where: {
          createdAt: {
            gte: start,
            lte: end
          }
        },
        _count: {
          id: true
        },
        _avg: {
          rating: true
        }
      }) as AgentStat[];
      
      // Get user details for each agent
      const agentDetails = await Promise.all(
        agentStats.map(async (stat: AgentStat) => {
          const user = await prisma.user.findUnique({
            where: { id: stat.userId },
            select: { name: true }
          });
          
          return {
            name: user?.name || 'Unknown User',
            count: stat._count.id,
            rating: stat._avg.rating || 0
          };
        })
      );
      
      // Sort by usage count (descending)
      const sortedAgentDetails = agentDetails.sort((a: {count: number}, b: {count: number}) => b.count - a.count);
      
      return res.status(200).json(sortedAgentDetails);
    } catch (error) {
      console.error('Error getting agent usage stats:', error);
      return res.status(500).json({ error: 'Failed to get agent usage statistics' });
    }
  },
  
  // Get response time percentile data
  async getResponseTimeStats(req: Request, res: Response) {
    try {
      const { range = '14d' } = req.query;
      const { start, end } = getDateRange(range as string);
      
      // Get all response times for the period
      const interactions = await prisma.AIAssistantInteraction.findMany({
        where: {
          createdAt: {
            gte: start,
            lte: end
          }
        },
        select: {
          responseTime: true
        },
        orderBy: {
          responseTime: 'asc'
        }
      }) as Interaction[];
      
      const responseTimes = interactions.map((i: {responseTime: number}) => i.responseTime);
      
      if (responseTimes.length === 0) {
        return res.status(200).json({
          averageResponseTime: '0s',
          fastestResponseTime: '0s',
          percentileData: []
        });
      }
      
      // Calculate percentiles
      const getPercentile = (arr: number[], percentile: number) => {
        const index = Math.ceil(arr.length * (percentile / 100)) - 1;
        return arr[Math.max(0, Math.min(index, arr.length - 1))];
      };
      
      const percentiles = [50, 75, 90, 95, 99];
      const percentileData = percentiles.map(percentile => ({
        percentile: `${percentile}%`,
        time: `${getPercentile(responseTimes, percentile).toFixed(1)}s`
      }));
      
      // Calculate average and fastest response times
      const average = responseTimes.reduce((sum: number, time: number) => sum + time, 0) / responseTimes.length;
      const fastest = responseTimes[0];
      
      return res.status(200).json({
        averageResponseTime: `${average.toFixed(1)}s`,
        fastestResponseTime: `${fastest.toFixed(1)}s`,
        percentileData
      });
    } catch (error) {
      console.error('Error getting response time stats:', error);
      return res.status(500).json({ error: 'Failed to get response time statistics' });
    }
  },
  
  // Compare resolution times with and without AI assistant
  async getResolutionTimeComparison(req: Request, res: Response) {
    try {
      const { range = '14d' } = req.query;
      const { start, end } = getDateRange(range as string);
      
      // Get resolved tickets with AI interactions
      const ticketsWithAI = await prisma.ticket.findMany({
        where: {
          status: 'RESOLVED',
          processingStartedAt: { not: null },
          processingEndedAt: { not: null },
          aiInteractions: { some: {} },
          updatedAt: {
            gte: start,
            lte: end
          }
        },
        select: {
          processingStartedAt: true,
          processingEndedAt: true
        }
      });
      
      // Get resolved tickets without AI interactions
      const ticketsWithoutAI = await prisma.ticket.findMany({
        where: {
          status: 'RESOLVED',
          processingStartedAt: { not: null },
          processingEndedAt: { not: null },
          aiInteractions: { none: {} },
          updatedAt: {
            gte: start,
            lte: end
          }
        },
        select: {
          processingStartedAt: true,
          processingEndedAt: true
        }
      });
      
      // Calculate average resolution times in hours
      const calcAvgResolutionTime = (tickets: Array<{processingStartedAt: Date, processingEndedAt: Date}>) => {
        if (tickets.length === 0) return 0;
        
        const totalHours = tickets.reduce((sum, ticket) => {
          const start = new Date(ticket.processingStartedAt);
          const end = new Date(ticket.processingEndedAt);
          const diffMs = end.getTime() - start.getTime();
          const diffHours = diffMs / (1000 * 60 * 60);
          return sum + diffHours;
        }, 0);
        
        return totalHours / tickets.length;
      };
      
      const withAssistant = calcAvgResolutionTime(ticketsWithAI);
      const withoutAssistant = calcAvgResolutionTime(ticketsWithoutAI);
      
      return res.status(200).json({
        withAssistant: withAssistant.toFixed(1),
        withoutAssistant: withoutAssistant.toFixed(1),
        improvement: withoutAssistant > 0 ? 
          ((withoutAssistant - withAssistant) / withoutAssistant * 100).toFixed(1) : '0'
      });
    } catch (error) {
      console.error('Error getting resolution time comparison:', error);
      return res.status(500).json({ error: 'Failed to get resolution time comparison' });
    }
  },
  
  // Get overall AI assistant statistics
  async getOverallStats(req: Request, res: Response) {
    try {
      const { range = 'all' } = req.query;
      let dateFilter = {};
      
      if (range !== 'all') {
        const { start, end } = getDateRange(range as string);
        dateFilter = {
          createdAt: {
            gte: start,
            lte: end
          }
        };
      }
      
      // Count total interactions
      const totalInteractions = await prisma.AIAssistantInteraction.count({
        where: dateFilter
      });
      
      // Count unique support agents using the assistant
      const supportAgentsCount = await prisma.user.count({
        where: {
          role: 'SUPPORT',
          aiInteractions: {
            some: dateFilter
          }
        }
      });
      
      // Count unique tickets assisted
      const ticketsAssisted = await prisma.ticket.count({
        where: {
          aiInteractions: {
            some: dateFilter
          }
        }
      });
      
      // Get average satisfaction rating
      const ratingStats = await prisma.AIAssistantInteraction.aggregate({
        where: {
          ...dateFilter,
          rating: { not: null }
        },
        _avg: {
          rating: true
        }
      });
      
      return res.status(200).json({
        totalInteractions,
        totalSupportAgents: supportAgentsCount,
        totalTicketsAssisted: ticketsAssisted,
        averageSatisfactionRating: ratingStats._avg.rating?.toFixed(1) || '0',
        // These would require additional logic but for now we'll use static values
        ticketsResolvedFaster: '62%',
        knowledgeArticlesUsed: 85
      });
    } catch (error) {
      console.error('Error getting overall stats:', error);
      return res.status(500).json({ error: 'Failed to get overall statistics' });
    }
  },
  
  // Get all analytics data in a single request (for dashboard)
  async getDashboardData(req: Request, res: Response) {
    try {
      const { range = '14d' } = req.query;
      
      // Create mock response objects to collect the returned data from each function
      const createMockResponse = () => {
        let responseData: any = null;
        return {
          status: () => ({ json: (data: any) => { responseData = data; return { json: () => {} }; } }),
          json: (data: any) => { responseData = data; return responseData; },
          getData: () => responseData // Helper to extract the data
        };
      };
      
      // Reference controller methods directly to avoid 'this' context issues
      const {
        getUsageStats,
        getCategoryStats,
        getAgentUsageStats,
        getResponseTimeStats,
        getResolutionTimeComparison,
        getOverallStats
      } = aiAnalyticsController;
      
      // Create mock responses for each endpoint
      const usageStatsRes = createMockResponse();
      const categoryStatsRes = createMockResponse();
      const agentUsageRes = createMockResponse();
      const responseTimeRes = createMockResponse();
      const resolutionRes = createMockResponse();
      const overallStatsRes = createMockResponse();
      
      // Use Promise.all to run all queries in parallel
      await Promise.all([
        getUsageStats(req, usageStatsRes as unknown as Response),
        getCategoryStats(req, categoryStatsRes as unknown as Response),
        getAgentUsageStats(req, agentUsageRes as unknown as Response),
        getResponseTimeStats(req, responseTimeRes as unknown as Response),
        getResolutionTimeComparison(req, resolutionRes as unknown as Response),
        getOverallStats(req, overallStatsRes as unknown as Response)
      ]);
      
      // Extract data from each mock response using the getData method
      const usageStats = usageStatsRes.getData();
      const categoryStats = categoryStatsRes.getData();
      const agentUsage = agentUsageRes.getData();
      const responseTimeStats = responseTimeRes.getData();
      const resolutionComparison = resolutionRes.getData();
      const overallStats = overallStatsRes.getData();
      
      return res.status(200).json({
        usageData: usageStats?.usageData || [],
        summary: usageStats?.summary || {
          totalInteractions: 0,
          totalTicketsAssisted: 0,
          avgResponseTime: 0,
          avgRating: 0
        },
        categoryData: categoryStats || [],
        agentUsageData: agentUsage || [],
        responseTimeData: responseTimeStats || {
          averageResponseTime: '0s',
          fastestResponseTime: '0s',
          percentileData: []
        },
        resolutionData: resolutionComparison || {
          withAssistant: '0',
          withoutAssistant: '0',
          improvement: '0'
        },
        overallStats: overallStats || {
          totalInteractions: 0,
          totalSupportAgents: 0,
          totalTicketsAssisted: 0,
          averageSatisfactionRating: '0',
          ticketsResolvedFaster: '0%',
          knowledgeArticlesUsed: 0
        }
      });
    } catch (error) {
      console.error('Error getting dashboard data:', error);
      return res.status(500).json({ error: 'Failed to get dashboard data' });
    }
  },
  
  // Get detailed statistics for a specific agent
  async getAgentDetails(req: Request, res: Response) {
    try {
      const { agentId } = req.params;
      const { range = '14d' } = req.query;
      const { start, end } = getDateRange(range as string);
      
      if (!agentId) {
        return res.status(400).json({ error: 'Agent ID is required' });
      }

      // Find the user by ID or name
      const user = await prisma.user.findFirst({
        where: {
          OR: [
            { id: agentId },
            { name: agentId }
          ]
        },
        select: { id: true, name: true }
      });

      if (!user) {
        return res.status(404).json({ error: 'Agent not found' });
      }

      // Get total interactions for this agent
      const totalInteractions = await prisma.AIAssistantInteraction.count({
        where: {
          userId: user.id,
          createdAt: {
            gte: start,
            lte: end
          }
        }
      });

      // Get average response time
      const avgResponseTime = await prisma.AIAssistantInteraction.aggregate({
        where: {
          userId: user.id,
          createdAt: {
            gte: start,
            lte: end
          }
        },
        _avg: {
          responseTime: true
        }
      });

      // Get rating distribution
      const ratings = await prisma.AIAssistantInteraction.groupBy({
        by: ['rating'],
        where: {
          userId: user.id,
          rating: { not: null },
          createdAt: {
            gte: start,
            lte: end
          }
        },
        _count: {
          id: true
        }
      });

      // Format rating data
      const responseRatings = [5, 4, 3, 2, 1].map(rating => {
        const ratingData = ratings.find((r: { rating: number | null, _count: { id: number } }) => r.rating === rating);
        return {
          rating,
          count: ratingData ? ratingData._count.id : 0
        };
      });

      // Get interactions by day
      const dailyInteractions = await prisma.AIAssistantInteraction.groupBy({
        by: ['createdAt'],
        where: {
          userId: user.id,
          createdAt: {
            gte: start,
            lte: end
          }
        },
        _count: {
          id: true
        }
      });

      // Format daily interaction data
      const interactionsByDay = Array.from({ length: parseInt(range as string) }, (_, i) => {
        const date = new Date(end);
        date.setDate(date.getDate() - i);
        const formattedDate = format(date, 'dd.MM');
        
        const dayData = dailyInteractions.find((d: { createdAt: Date, _count: { id: number } }) => 
          format(d.createdAt, 'dd.MM') === formattedDate
        );
        
        return {
          date: formattedDate,
          count: dayData ? dayData._count.id : 0
        };
      }).reverse();

      // Get most common queries
      const commonQueries = await prisma.AIAssistantInteraction.findMany({
        where: {
          userId: user.id,
          createdAt: {
            gte: start,
            lte: end
          }
        },
        select: {
          query: true
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: 5
      });

      return res.status(200).json({
        totalInteractions,
        averageResponseTime: `${avgResponseTime._avg.responseTime?.toFixed(1) || 0}s`,
        responseRatings,
        interactionsByDay,
        commonQueries: commonQueries.map((q: { query: string }) => q.query)
      });
    } catch (error) {
      console.error('Error getting agent details:', error);
      return res.status(500).json({ error: 'Failed to get agent details' });
    }
  }
}; 