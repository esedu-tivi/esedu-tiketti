import { Request, Response } from 'express';
import { ticketGenerator } from '../ai/agents/ticketGeneratorAgent.js';
import { chatAgent } from '../ai/agents/chatAgent.js';
import { PrismaClient, TicketStatus, Comment, User, Category } from '@prisma/client';
import { ticketService } from '../services/ticketService.js';
import { CreateTicketDTO } from '../types/index.js';
import { Prisma } from '@prisma/client';
import { summarizerAgent } from '../ai/agents/summarizerAgent.js';

const prisma = new PrismaClient();

export const aiController = {
  /**
   * Generate a training ticket for IT support students
   */
  generateTrainingTicket: async (req: Request, res: Response) => {
    try {
      const { complexity, category, userProfile, assignToId, responseFormat } = req.body;
      
      console.log('Received request to generate training ticket:', req.body);
      
      // Validate the required parameters
      if (!complexity || !category || !userProfile) {
        return res.status(400).json({
          error: 'Missing required parameters',
          details: 'complexity, category, and userProfile are required'
        });
      }
      
      // Generate a ticket using the AI agent - with type guarantees
      console.log('Calling ticket generator with parameters:', { complexity, category, userProfile, assignToId, responseFormat });
      const ticketData = await ticketGenerator.generateTicket({
        complexity,
        category,
        userProfile,
        assignToId,
        responseFormat
      });
      
      console.log('Successfully generated ticket data');
      
      // Create the ticket with standard fields
      const createTicketData: CreateTicketDTO = {
        title: ticketData.title,
        description: ticketData.description,
        device: ticketData.device,
        additionalInfo: ticketData.additionalInfo,
        priority: ticketData.priority,
        categoryId: ticketData.categoryId,
        responseFormat: ticketData.responseFormat,
        userProfile: ticketData.userProfile,
        attachments: [],
        // Store the user profile for later reference in conversations
      };
      
      // Create the ticket first
      const ticket = await ticketService.createTicket(createTicketData, ticketData.createdById);
      
      // Explicitly mark the ticket as AI-generated after creation
      await prisma.ticket.update({
        where: { id: ticket.id! }, // Assuming ticket.id is definitely present
        data: { isAiGenerated: true },
      });
      
      // Generate and store a solution for this ticket
      const solution = await ticketGenerator.generateSolution(ticket.id!);
      
      // Store the solution in a knowledge base entry linked to this ticket
      await prisma.knowledgeArticle.create({
        data: {
          title: solution.startsWith("### Ongelma:") ? solution.split("\n")[0].replace("### ", "") : `Solution: ${ticket.title}`,
          content: solution,
          categoryId: ticketData.categoryId,
          relatedTicketIds: [ticket.id!],
          // Add metadata for tracking
          complexity: complexity,
          isAiGenerated: true
        }
      });
      
      // If assignToId is specified, update the ticket to assign it
      if (ticketData.assignedToId) {
        await ticketService.updateTicket(ticket.id!, {
          assignedToId: ticketData.assignedToId,
          status: 'IN_PROGRESS' as TicketStatus
        });
        
        // Fetch the updated ticket
        const updatedTicket = await ticketService.getTicketById(ticket.id!);
        if (updatedTicket) {
          return res.status(201).json({ 
            ticket: updatedTicket,
            isAiGenerated: true
          });
        }
      }
      
      res.status(201).json({ 
        ticket, 
        isAiGenerated: true
      });
    } catch (error: any) {
      console.error('Error generating training ticket:', error);
      res.status(500).json({ 
        error: 'Failed to generate training ticket',
        details: error.message || 'Unknown error'
      });
    }
  },
  
  /**
   * Generate a simulated user response to a support comment
   * This makes AI-generated tickets interactive for training purposes
   */
  generateUserResponse: async (req: Request, res: Response) => {
    try {
      // Get ticketId from route parameters or body
      const ticketId = req.params.id || req.body.ticketId;
      const { commentText, supportUserId } = req.body;
      
      console.log(`Received request to generate AI chat response for ticket ${ticketId}`);
      
      // Validate parameters
      if (!ticketId || !commentText || !supportUserId) {
        return res.status(400).json({
          error: 'Missing required parameters',
          details: 'ticketId, commentText and supportUserId are required'
        });
      }
      
      // Get the ticket with its context, including userProfile
      const ticket = await prisma.ticket.findUnique({
        where: { 
          id: ticketId,
          isAiGenerated: true // Only allow responses for AI-generated tickets
        },
        include: { // Revert back to include
          comments: {
            orderBy: { createdAt: 'asc' }
          },
          category: true,
          createdBy: true
          // userProfile is now part of the base Ticket model and should be included by default
        }
      });
      
      if (!ticket || !ticket.isAiGenerated) {
        return res.status(404).json({ 
          error: 'Ticket not found',
          details: 'The specified ticket was not found or is not AI-generated.'
        });
      }
      
      // Look up the solution for this ticket
      const solution = await prisma.knowledgeArticle.findFirst({
        where: { 
          relatedTicketIds: { has: ticketId } 
        }
      });
      
      console.log('Using ChatAgent to generate interactive response');
      
      // Get userProfile from the fetched ticket, default to 'student' if null/undefined
      const userProfile = ticket.userProfile || 'student'; 
      console.log(`Using userProfile from ticket: ${userProfile}`); // Log the fetched profile
      
      // Generate AI response as the ticket creator using the chat agent
      const { responseText, evaluation } = await chatAgent.generateChatResponse({
        ticket: {
          id: ticket.id,
          title: ticket.title,
          description: ticket.description,
          device: ticket.device || '',
          priority: ticket.priority,
          categoryId: ticket.categoryId,
          userProfile: userProfile, // Use the fetched profile
          createdById: ticket.createdById,
          additionalInfo: ticket.additionalInfo || ''
        },
        comments: ticket.comments.map(comment => ({
          // Map Prisma Comment to expected structure (text, userId, ticketId)
          id: comment.id,
          text: comment.content, 
          userId: comment.authorId,
          ticketId: comment.ticketId,
          createdAt: comment.createdAt
        })),
        newSupportComment: commentText,
        supportUserId,
        solution: solution?.content || null
      });
      
      console.log(`Chat response generated successfully. Evaluation: ${evaluation}`);
      
      // Create the comment from the AI user, including the evaluation result
      const comment = await prisma.comment.create({
        data: {
          content: responseText, // Use the response text from the agent
          ticketId: ticket.id,
          authorId: ticket.createdById, // Comment as the original ticket creator
          isAiGenerated: true, // Flag for analytics but not shown to user
          evaluationResult: evaluation // Store the evaluation result
        }
      });
      
      // Return the created comment
      return res.status(201).json({ 
        comment,
        isAiGenerated: true  
      });
      
    } catch (error: any) {
      console.error('Error generating chat response:', error);
      res.status(500).json({
        error: 'Failed to generate chat response',
        details: error.message || 'Unknown error'
      });
    }
  },
  
  /**
   * Get AI agent configuration
   */
  getAgentConfig: async (req: Request, res: Response) => {
    try {
      // Get all categories for the dropdown
      const categories = await prisma.category.findMany();
      
      // Return configuration options for the frontend
      res.json({
        complexityOptions: ['simple', 'moderate', 'complex'],
        categoryOptions: categories.map(c => ({ id: c.id, name: c.name })),
        userProfileOptions: ['student', 'teacher', 'staff', 'administrator'],
      });
    } catch (error: any) {
      console.error('Error fetching AI agent configuration:', error);
      res.status(500).json({ error: 'Failed to fetch AI agent configuration' });
    }
  },
  
  /**
   * Get all AI-generated solutions for a ticket
   * This is used to reveal solutions after a support person has attempted to solve the ticket
   */
  getTicketSolution: async (req: Request, res: Response) => {
    try {
      const { ticketId } = req.params;
      
      // Check if the ticket exists and is AI-generated
      const ticket = await prisma.ticket.findUnique({
        where: { id: ticketId },
        select: { isAiGenerated: true }
      });
      
      if (!ticket || !ticket.isAiGenerated) {
        return res.status(404).json({
          error: 'Ticket not found',
          details: 'The specified ticket was not found or is not AI-generated'
        });
      }
      
      // Get the solution from knowledge base
      const solution = await prisma.knowledgeArticle.findFirst({
        where: { 
          relatedTicketIds: { has: ticketId } 
        }
      });
      
      if (!solution) {
        // If no solution exists, generate one now
        const generatedSolution = await ticketGenerator.generateSolution(ticketId);
        
        // Get the ticket details to create the knowledge article
        const ticketDetails = await prisma.ticket.findUnique({
          where: { id: ticketId },
          select: { title: true, categoryId: true }
        });
        
        if (!ticketDetails) {
          return res.status(404).json({
            error: 'Ticket details not found',
            details: 'Could not find the ticket details to generate a solution'
          });
        }
        
        // Store it for future use
        const newSolution = await prisma.knowledgeArticle.create({
          data: {
            title: generatedSolution.startsWith("### Ongelma:") ? generatedSolution.split("\n")[0].replace("### ", "") : `Solution: ${ticketDetails.title}`,
            content: generatedSolution,
            categoryId: ticketDetails.categoryId,
            relatedTicketIds: [ticketId],
            isAiGenerated: true
          }
        });
        
        return res.json({ solution: newSolution });
      }
      
      return res.json({ solution });
      
    } catch (error: any) {
      console.error('Error retrieving ticket solution:', error);
      res.status(500).json({
        error: 'Failed to retrieve ticket solution',
        details: error.message || 'Unknown error'
      });
    }
  },

  // --- New Analysis Functions --- 

  /**
   * @description Get AI-generated tickets for analysis, with filtering and sorting
   * @route GET /api/ai/analysis/tickets
   * @access Admin
   */
  getAiAnalysisTickets: async (req: Request, res: Response) => {
    const { 
      category: filterCategory,
      agent: filterAgent, 
      agentSearch,
      status: filterStatus,
      minInteractions, 
      startDate, 
      endDate,
      sortBy = 'createdAt', 
      sortDir = 'desc',
      page = '1',      // New pagination parameter: page number
      pageSize = '25'  // New pagination parameter: items per page
    } = req.query;

    // --- Parse pagination --- 
    const pageNum = parseInt(page as string, 10);
    const pageSizeNum = parseInt(pageSize as string, 10);
    const skip = (pageNum > 0 ? pageNum - 1 : 0) * pageSizeNum; // Calculate skip for Prisma
    const take = pageSizeNum > 0 ? pageSizeNum : 25; // Ensure pageSize is positive

    // --- Parse minInteractions --- 
    const minInteractionsNum = minInteractions && parseInt(minInteractions as string, 10);
    const hasMinInteractionsFilter = typeof minInteractionsNum === 'number' && !isNaN(minInteractionsNum) && minInteractionsNum >= 0;

    try {
      // --- Build Where Clause --- 
      const whereClause: Prisma.TicketWhereInput = {
        isAiGenerated: true,
      };
      
      // --- Date Filter --- 
      const createdAtFilter: Prisma.DateTimeFilter = {};
      if (startDate && typeof startDate === 'string') {
        // Add time component (start of day) to make it inclusive
        try {
           createdAtFilter.gte = new Date(startDate + 'T00:00:00.000Z');
        } catch (e) { console.error("Invalid start date format"); }
      }
      if (endDate && typeof endDate === 'string') {
        // Add time component (end of day) to make it inclusive
         try {
           createdAtFilter.lte = new Date(endDate + 'T23:59:59.999Z');
         } catch (e) { console.error("Invalid end date format"); }
      }
      // Add date filter to whereClause if it has keys
      if (Object.keys(createdAtFilter).length > 0) {
         whereClause.createdAt = createdAtFilter;
      }
      
      // --- Category Filter --- 
      if (filterCategory && filterCategory !== 'all') {
        whereClause.categoryId = filterCategory as string;
      }
      
      // --- Status Filter --- 
      if (filterStatus && filterStatus !== 'all') {
        whereClause.status = filterStatus as TicketStatus;
      }

      // --- Agent Filter (Search OR Dropdown) --- 
      const agentSearchTrimmed = typeof agentSearch === 'string' ? agentSearch.trim() : '';

      if (agentSearchTrimmed) {
        // If search term exists, use it to filter by agent name
        whereClause.assignedTo = {
          name: {
            contains: agentSearchTrimmed,
            mode: 'insensitive', // Case-insensitive search
          },
        };
      } else if (filterAgent) {
        // If NO search term, use the dropdown filter (if set)
        if (filterAgent === 'unassigned') {
          whereClause.assignedToId = null;
        } else if (filterAgent !== 'all') {
          whereClause.assignedToId = filterAgent as string;
        }
        // Ensure assignedTo block from search doesn't conflict if dropdown is active
        // This shouldn't be strictly necessary with the else if, but safer.
        if (whereClause.assignedTo) delete whereClause.assignedTo;
      }

      // --- Fetch IDs and Calculate Aggregates (BEFORE pagination) --- 
      const initialMatchingTickets = await prisma.ticket.findMany({
         where: whereClause, // Apply non-count filters
         select: { 
           id: true,
           status: true, 
           _count: { select: { comments: { where: { isAiGenerated: true } } } }
         },
      });

      // --- Calculate Aggregates (same as before) --- 
      const totalCountInitial = initialMatchingTickets.length;
      const statusCounts: { [key in TicketStatus]?: number } = {};
      let totalInteractions = 0;
      initialMatchingTickets.forEach(ticket => {
        statusCounts[ticket.status] = (statusCounts[ticket.status] || 0) + 1;
        totalInteractions += ticket._count.comments;
      });

      // --- Apply Count Filter (in code, if needed) --- 
      let finalFilteredTickets = initialMatchingTickets;
      if (hasMinInteractionsFilter) {
        finalFilteredTickets = initialMatchingTickets.filter(ticket => ticket._count.comments >= minInteractionsNum);
      }
      // Get IDs of tickets matching ALL filters (including count)
      const finalTicketIds = finalFilteredTickets.map(t => t.id);
      
      // Update totalCount based on filters including interaction count
      const totalCountAfterFilters = finalTicketIds.length;

      // --- Fetch Paginated Full Data for Final List --- 
      let ticketsForResponse: any[] = [];
      if (totalCountAfterFilters > 0) { // Check if any tickets remain after all filters
         // --- Build OrderBy Clause --- 
         const orderByClause: Prisma.TicketOrderByWithRelationInput | any = {};
         if (sortBy === 'category') {
           orderByClause.category = { name: sortDir as Prisma.SortOrder };
         } else if (sortBy === 'assignedAgent') {
           orderByClause.assignedTo = { 
             ...(orderByClause.assignedTo || {}),
             name: sortDir as Prisma.SortOrder 
           };
         } else if (sortBy !== 'aiInteractionCount') {
           const allowedSortFields = ['createdAt', 'title', 'status', 'priority'];
           if (allowedSortFields.includes(sortBy as string)) {
                orderByClause[sortBy as keyof Prisma.TicketOrderByWithRelationInput] = sortDir as Prisma.SortOrder;
           }
         }

         ticketsForResponse = await prisma.ticket.findMany({
            where: {
              id: { in: finalTicketIds }, // Fetch only the tickets that passed all filters
            },
            select: { 
              id: true, title: true, status: true, createdAt: true, priority: true, 
              category: { select: { id: true, name: true } },
              assignedTo: { select: { id: true, name: true } },
              _count: { select: { comments: { where: { isAiGenerated: true } } } }
            },
            orderBy: sortBy !== 'aiInteractionCount' && Object.keys(orderByClause).length > 0 ? orderByClause : undefined,
            skip: skip,   // Apply pagination: skip
            take: take,   // Apply pagination: take
         });

         // --- Sort by Count (in code, if needed, applied only to the fetched page) --- 
         if (sortBy === 'aiInteractionCount') {
             const direction = sortDir === 'desc' ? -1 : 1;
             ticketsForResponse.sort((a, b) => (a._count.comments - b._count.comments) * direction);
         }
      }

      // --- Format Tickets for Response --- 
      const formattedTickets = ticketsForResponse.map(ticket => ({
         id: ticket.id, title: ticket.title, status: ticket.status, createdAt: ticket.createdAt,
         category: ticket.category.name, assignedAgent: ticket.assignedTo?.name ?? 'Ei vastuuhenkilöä', 
         aiInteractionCount: ticket._count.comments,
      }));

      // --- Prepare Aggregates for Response --- 
      const aggregates = {
         totalCount: totalCountAfterFilters, // Use count AFTER all filters for pagination purposes
         statusCounts: {
            OPEN: statusCounts.OPEN || 0,
            IN_PROGRESS: statusCounts.IN_PROGRESS || 0,
            RESOLVED: statusCounts.RESOLVED || 0,
            CLOSED: statusCounts.CLOSED || 0,
         },
         averageInteractions: totalCountInitial > 0 ? parseFloat((totalInteractions / totalCountInitial).toFixed(1)) : 0, // Avg based on initial filters
      };
      
      // --- Final Response --- 
      res.status(200).json({
         tickets: formattedTickets, // Paginated list
         aggregates: aggregates,    // Aggregates (totalCount is now the paginated total)
         pagination: {             // Include pagination info
            currentPage: pageNum,
            pageSize: take,
            totalItems: totalCountAfterFilters,
            totalPages: Math.ceil(totalCountAfterFilters / take)
         }
      });
    } catch (error: any) {
      console.error('Error fetching AI analysis tickets:', error);
      res.status(500).json({ message: 'Error fetching AI analysis tickets', error: error.message });
    }
  },
  
  /**
   * Gets the conversation history for a specific AI ticket, including any saved summary.
   * @route GET /api/ai/analysis/tickets/:ticketId/conversation
   * @access Admin, Support
   */
  getAiTicketConversation: async (req: Request, res: Response) => {
    const { ticketId } = req.params;
    try {
      const comments = await prisma.comment.findMany({
        where: { ticketId: ticketId },
        include: { author: true }, // Include author details
        orderBy: { createdAt: 'asc' },
      });
      
      // Fetch the saved summary along with the ticket
      const ticket = await prisma.ticket.findUnique({
         where: { id: ticketId },
         select: { aiSummary: true } 
      });

      // Combine comments and summary in the response
      res.status(200).json({
        comments: comments,
        aiSummary: ticket?.aiSummary || null // Return summary or null
      });
    } catch (error: any) {
      console.error(`Error fetching conversation for ticket ${ticketId}:`, error);
      res.status(500).json({ message: 'Error fetching conversation', error: error.message });
    }
  },
  
  /**
   * Generate OR Regenerate a summary for a given ticket conversation
   * @route POST /api/ai/tickets/:id/summarize
   * @access Admin, Support
   */
  summarizeConversation: async (req: Request, res: Response) => {
    const { id: ticketId } = req.params;
    console.log(`Received request to generate/regenerate summary for ticket ${ticketId}`);
    
    try {
      // 1. Fetch Ticket and Conversation Data
      const ticket = await prisma.ticket.findUnique({
        where: { id: ticketId },
        include: {
          comments: {
            include: { author: true }, 
            orderBy: { createdAt: 'asc' },
          },
          category: true,
        },
      });

      if (!ticket) {
        return res.status(404).json({ message: 'Ticket not found' });
      }
      
      // Type assertion now uses imported types
      type FetchedTicketType = typeof ticket & {
         comments: (Comment & { author: User | null })[];
         category: Category | null;
      };
      
      // 2. Call the Summarizer Agent (will generate and save)
      console.log(`Calling SummarizerAgent for ticket ${ticketId}...`);
      const summary = await summarizerAgent.summarizeConversation({ 
         ticket: ticket as FetchedTicketType 
      });
      console.log(`SummarizerAgent generated and saved summary for ticket ${ticketId}.`);

      // 3. Check for agent error message
      if (summary === 'Virhe yhteenvedon luonnissa.') {
         // return res.status(500).json({ message: summary });
      }

      // 4. Return the NEWLY generated summary
      res.status(200).json({ summary });

    } catch (error: any) {
      // Catch errors during data fetching or unexpected agent errors
      console.error(`Error summarizing conversation for ticket ${ticketId}:`, error);
      res.status(500).json({ 
        message: 'Error summarizing conversation', 
        error: error.message 
      });
    }
  },
  
  // --- End New Analysis Functions ---
}; 