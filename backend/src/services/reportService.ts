import { prisma } from '../lib/prisma.js';
import { TicketStatus, UserRole } from '@prisma/client';
import logger from '../utils/logger.js';

export interface ReportFilters {
  startDate?: Date;
  endDate?: Date;
  categoryId?: string;
  priority?: string;
}

export interface TicketReport {
  id: string;
  title: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  createdAt: Date;
  resolvedAt?: Date;
  processingTime?: number; // in minutes
  commentsCount: number;
  responseFormat: string;
}

export interface UserWorkReport {
  user: {
    id: string;
    name: string;
    email: string;
    jobTitle?: string;
  };
  period: {
    startDate: Date;
    endDate: Date;
  };
  statistics: {
    totalResolved: number;
    totalClosed: number;
    totalInProgress: number;
    averageResolutionTime: number; // in minutes
    categoriesHandled: { name: string; count: number }[];
    priorityBreakdown: { priority: string; count: number }[];
  };
  tickets: TicketReport[];
}

export const reportService = {
  // Get work report for a specific user
  async getUserWorkReport(
    userId: string,
    filters: ReportFilters = {}
  ): Promise<UserWorkReport> {
    try {
      // Get user details
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          email: true,
          jobTitle: true,
          role: true
        }
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Check if user is SUPPORT role
      if (user.role !== UserRole.SUPPORT && user.role !== UserRole.ADMIN) {
        throw new Error('Only support staff can generate work reports');
      }

      // Set date range (default to last 30 days if not specified)
      const endDate = filters.endDate || new Date();
      const startDate = filters.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      // Build where clause for tickets
      // Include tickets that are either:
      // 1. Assigned to the user, OR
      // 2. Have comments from the user (indicating they worked on it)
      const whereClause: any = {
        AND: [
          {
            OR: [
              { assignedToId: userId },
              {
                comments: {
                  some: {
                    authorId: userId
                  }
                }
              }
            ]
          },
          {
            status: {
              in: [TicketStatus.RESOLVED, TicketStatus.CLOSED, TicketStatus.IN_PROGRESS]
            }
          },
          {
            OR: [
              {
                updatedAt: {
                  gte: startDate,
                  lte: endDate
                }
              },
              {
                processingEndedAt: {
                  gte: startDate,
                  lte: endDate
                }
              }
            ]
          }
        ]
      };

      if (filters.categoryId) {
        whereClause.categoryId = filters.categoryId;
      }

      if (filters.priority) {
        whereClause.priority = filters.priority;
      }

      // Fetch tickets
      const tickets = await prisma.ticket.findMany({
        where: whereClause,
        include: {
          category: true,
          comments: true,
          createdBy: true
        },
        orderBy: {
          updatedAt: 'desc'
        }
      });

      // Process tickets for report
      const reportTickets: TicketReport[] = tickets.map(ticket => {
        const processingTime = ticket.processingEndedAt && ticket.processingStartedAt
          ? Math.round((ticket.processingEndedAt.getTime() - ticket.processingStartedAt.getTime()) / 60000)
          : ticket.processingStartedAt
          ? Math.round((new Date().getTime() - ticket.processingStartedAt.getTime()) / 60000)
          : undefined;

        return {
          id: ticket.id,
          title: ticket.title,
          description: ticket.description,
          category: ticket.category.name,
          priority: ticket.priority,
          status: ticket.status,
          createdAt: ticket.createdAt,
          resolvedAt: ticket.processingEndedAt || undefined,
          processingTime,
          commentsCount: ticket.comments.length,
          responseFormat: ticket.responseFormat
        };
      });

      // Calculate statistics
      const resolvedTickets = tickets.filter(t => t.status === TicketStatus.RESOLVED);
      const closedTickets = tickets.filter(t => t.status === TicketStatus.CLOSED);
      const inProgressTickets = tickets.filter(t => t.status === TicketStatus.IN_PROGRESS);

      // Calculate average resolution time (only for resolved/closed tickets)
      const completedTickets = [...resolvedTickets, ...closedTickets];
      const resolutionTimes = completedTickets
        .filter(t => t.processingStartedAt && t.processingEndedAt)
        .map(t => (t.processingEndedAt!.getTime() - t.processingStartedAt!.getTime()) / 60000);
      
      const averageResolutionTime = resolutionTimes.length > 0
        ? Math.round(resolutionTimes.reduce((a, b) => a + b, 0) / resolutionTimes.length)
        : 0;

      // Category breakdown
      const categoryMap = new Map<string, number>();
      tickets.forEach(ticket => {
        const categoryName = ticket.category.name;
        categoryMap.set(categoryName, (categoryMap.get(categoryName) || 0) + 1);
      });
      const categoriesHandled = Array.from(categoryMap.entries())
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count);

      // Priority breakdown
      const priorityMap = new Map<string, number>();
      tickets.forEach(ticket => {
        priorityMap.set(ticket.priority, (priorityMap.get(ticket.priority) || 0) + 1);
      });
      const priorityBreakdown = Array.from(priorityMap.entries())
        .map(([priority, count]) => ({ priority, count }))
        .sort((a, b) => {
          const priorityOrder = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
          return priorityOrder.indexOf(a.priority) - priorityOrder.indexOf(b.priority);
        });

      return {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          jobTitle: user.jobTitle || undefined
        },
        period: {
          startDate,
          endDate
        },
        statistics: {
          totalResolved: resolvedTickets.length,
          totalClosed: closedTickets.length,
          totalInProgress: inProgressTickets.length,
          averageResolutionTime,
          categoriesHandled,
          priorityBreakdown
        },
        tickets: reportTickets
      };
    } catch (error) {
      logger.error('Error generating user work report:', error);
      throw error;
    }
  },

  // Save report to database for future reference
  async saveReport(userId: string, reportData: UserWorkReport): Promise<string> {
    try {
      const report = await prisma.studentReport.create({
        data: {
          userId,
          startDate: reportData.period.startDate,
          endDate: reportData.period.endDate,
          ticketCount: reportData.tickets.length,
          reportData: JSON.stringify(reportData)
        }
      });

      return report.id;
    } catch (error) {
      logger.error('Error saving report:', error);
      throw error;
    }
  },

  // Get saved report by ID
  async getSavedReport(reportId: string, userId: string): Promise<UserWorkReport | null> {
    try {
      const report = await prisma.studentReport.findFirst({
        where: {
          id: reportId,
          userId
        }
      });

      if (!report) {
        return null;
      }

      return JSON.parse(report.reportData as string) as UserWorkReport;
    } catch (error) {
      logger.error('Error retrieving saved report:', error);
      throw error;
    }
  },

  // Get list of saved reports for a user
  async getUserReports(userId: string) {
    try {
      const reports = await prisma.studentReport.findMany({
        where: { userId },
        select: {
          id: true,
          startDate: true,
          endDate: true,
          ticketCount: true,
          createdAt: true,
          exportedAt: true
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      return reports;
    } catch (error) {
      logger.error('Error fetching user reports:', error);
      throw error;
    }
  },

  // Mark report as exported
  async markReportAsExported(reportId: string): Promise<void> {
    try {
      await prisma.studentReport.update({
        where: { id: reportId },
        data: { exportedAt: new Date() }
      });
    } catch (error) {
      logger.error('Error marking report as exported:', error);
      throw error;
    }
  }
};