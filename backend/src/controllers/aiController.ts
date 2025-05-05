import { Request, Response } from 'express';
import { ticketGenerator } from '../ai/agents/ticketGeneratorAgent.js';
import { chatAgent } from '../ai/agents/chatAgent.js';
import { PrismaClient, TicketStatus, Comment, User, Category } from '@prisma/client';
import { ticketService } from '../services/ticketService.js';
import { CreateTicketDTO } from '../types/index.js';
import { Prisma } from '@prisma/client';
import { summarizerAgent } from '../ai/agents/summarizerAgent.js';
import { getSocketService } from '../services/socketService.js';
import { supportAssistantAgent } from '../ai/agents/supportAssistantAgent.js';

const prisma = new PrismaClient();

export const aiController = {
  /**
   * Generate a *preview* of a training ticket without saving it.
   */
  generateTrainingTicketPreview: async (req: Request, res: Response) => {
    try {
      const { complexity, category, userProfile, assignToId, responseFormat } = req.body;
      
      console.log('Received request to generate training ticket preview:', req.body);
      
      // Validate the required parameters
      if (!complexity || !category || !userProfile) {
        return res.status(400).json({
          error: 'Missing required parameters',
          details: 'complexity, category, and userProfile are required'
        });
      }
      
      // Generate ticket data using the AI agent but DO NOT save it yet
      console.log('Calling ticket generator for preview with parameters:', { complexity, category, userProfile, assignToId, responseFormat });
      const ticketData = await ticketGenerator.generateTicket({
        complexity,
        category,
        userProfile,
        assignToId, // Pass assignToId so it's included in the preview data
        responseFormat
      });
      
      console.log('Successfully generated ticket preview data');
      
      // ALSO generate the solution during preview
      console.log('Generating solution for preview...');
      // We need some details from ticketData to generate the solution
      // Note: ticketData.id doesn't exist yet, so we call generateSolution with raw data
      // Assuming generateSolution can handle raw data or we adapt it slightly
      // For now, let's pass the necessary components. We might need to adjust ticketGeneratorAgent if this fails.
      const solution = await ticketGenerator.generateSolutionForPreview({
        title: ticketData.title,
        description: ticketData.description,
        device: ticketData.device,
        categoryId: ticketData.categoryId, // We need category ID to find the name
      });
      console.log('Successfully generated solution for preview');
      
      // Return the generated data AND the solution for confirmation
      res.status(200).json({ 
        ticketData: ticketData, // Send the raw generated ticket data
        solution: solution      // Send the generated solution text
      });
      
    } catch (error: any) {
      console.error('Error generating training ticket preview:', error);
      res.status(500).json({ 
        error: 'Failed to generate training ticket preview',
        details: error.message || 'Unknown error'
      });
    }
  },

  /**
   * Confirm and create a training ticket after preview.
   */
  confirmTrainingTicketCreation: async (req: Request, res: Response) => {
    try {
      // Receive the ticket data AND the pre-generated solution
      const { ticketData, complexity, solution } = req.body; // Added solution
      
      console.log('Received request to confirm training ticket creation:', req.body);
      
      // Validate the received ticket data (basic check)
      if (!ticketData || !ticketData.title || !ticketData.description || !ticketData.categoryId || !ticketData.createdById || !complexity || !solution) { // Added check for solution
        return res.status(400).json({
          error: 'Invalid ticket data provided for confirmation',
          details: 'Essential ticket data, complexity, or solution is missing' // Updated details
        });
      }
      
      // Create the ticket with standard fields from the confirmed data
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
      };
      
      // Create the ticket using the service
      console.log('Creating ticket in database with confirmed data:', createTicketData);
      const ticket = await ticketService.createTicket(createTicketData, ticketData.createdById);
      console.log('Ticket created with ID:', ticket.id);
      
      // Explicitly mark the ticket as AI-generated after creation
      await prisma.ticket.update({
        where: { id: ticket.id! }, 
        data: { isAiGenerated: true },
      });
      console.log('Marked ticket as AI-generated');
      
      // Store the PRE-GENERATED solution (received from frontend) in a knowledge base entry
      console.log('Storing pre-generated solution for ticket ID:', ticket.id);
      await prisma.knowledgeArticle.create({
        data: {
          // Use the received solution text
          title: solution.startsWith("### Ongelma:") ? solution.split("\n")[0].replace("### ", "") : `Ratkaisu: ${ticket.title}`, // Updated title generation logic
          content: solution, // Use the solution from the request body
          categoryId: ticketData.categoryId,
          relatedTicketIds: [ticket.id!],
          complexity: complexity, // Use complexity passed from frontend
          isAiGenerated: true
        }
      });
      console.log('Knowledge article created for solution');
      
      let finalTicket = ticket; // Use the initially created ticket by default
      
      // If assignToId is specified in the confirmed data, update the ticket
      if (ticketData.assignedToId) {
        console.log('Assigning ticket to user ID:', ticketData.assignedToId);
        await ticketService.updateTicket(ticket.id!, {
          assignedToId: ticketData.assignedToId,
          status: 'IN_PROGRESS' as TicketStatus
        });
        
        // Fetch the updated ticket to include assignment info
        const updatedTicket = await ticketService.getTicketById(ticket.id!);
        if (updatedTicket) {
          finalTicket = updatedTicket; // Use the updated ticket if assignment was successful
          console.log('Ticket successfully assigned');
        } else {
           console.warn('Failed to fetch updated ticket after assignment, returning original ticket');
        }
      }
      
      console.log('Training ticket creation confirmed and completed.');
      // Include the solution content in the response (as it was received)
      res.status(201).json({ 
        ticket: finalTicket, 
        solution: solution, // Send back the solution that was saved
        isAiGenerated: true
      });
      
    } catch (error: any) {
      console.error('Error confirming training ticket creation:', error);
      res.status(500).json({ 
        error: 'Failed to confirm training ticket creation',
        details: error.message || 'Unknown error'
      });
    }
  },

  /**
   * Generate a training ticket for IT support students
   */
  // generateTrainingTicket: async (req: Request, res: Response) => { ... existing code ... }, // Keep old one commented out or remove later
  
  /**
   * Generate a simulated user response to a support comment
   * This makes AI-generated tickets interactive for training purposes
   */
  generateUserResponse: async (req: Request, res: Response) => {
    const ticketId = req.params.id || req.body.ticketId;
    const { commentText, supportUserId } = req.body;
    let supportUserEmail: string | null = null;
    const socketService = getSocketService(); // Get socket service instance

    try {
      console.log(`Received request to generate AI chat response for ticket ${ticketId}`);
      
      // Validate parameters
      if (!ticketId || !commentText || !supportUserId) {
        return res.status(400).json({
          error: 'Missing required parameters',
          details: 'ticketId, commentText and supportUserId are required'
        });
      }

      // Find the support user's email early for socket events
      const supportUser = await prisma.user.findUnique({
        where: { id: supportUserId },
        select: { email: true }
      });
      supportUserEmail = supportUser?.email || null;

      if (!supportUserEmail) {
         console.warn(`[Socket] Could not find email for support user ID ${supportUserId} to send AI typing status.`);
         // Proceed without sending typing status if user not found, but maybe log?
      }
      
      // Get the ticket with its context
      const ticket = await prisma.ticket.findUnique({
        where: { 
          id: ticketId,
          isAiGenerated: true // Only allow responses for AI-generated tickets
        },
        include: {
          comments: {
            orderBy: { createdAt: 'asc' }
          },
          category: true,
          createdBy: true
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
      
      // Get userProfile from the fetched ticket
      const userProfile = ticket.userProfile || 'student'; 
      console.log(`Using userProfile from ticket: ${userProfile}`);

      // Translate user profile
      let userProfileFinnish: string;
      switch (userProfile) {
        case 'student':
          userProfileFinnish = 'Opiskelija';
          break;
        case 'teacher':
          userProfileFinnish = 'Opettaja';
          break;
        case 'staff':
          userProfileFinnish = 'Henkilökunta';
          break;
        case 'administrator':
          userProfileFinnish = 'Järjestelmänvalvoja';
          break;
        default:
          userProfileFinnish = userProfile; // Fallback
      }
      console.log(`Translated userProfile to Finnish for ChatAgent: ${userProfileFinnish}`);

      // --- Emit AI Typing Start ---
      if (supportUserEmail) {
        console.log(`[Socket] Emitting AI typing start to support user: ${supportUserEmail}`);
        socketService.emitTypingStatus(supportUserEmail, { isTyping: true, ticketId });
      }
      // -------------------------
      
      // Generate AI response as the ticket creator using the chat agent
      const { responseText, evaluation } = await chatAgent.generateChatResponse({
        ticket: {
          id: ticket.id,
          title: ticket.title,
          description: ticket.description,
          device: ticket.device || '',
          priority: ticket.priority,
          categoryId: ticket.categoryId,
          userProfile: userProfileFinnish, // Use the translated Finnish profile
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
      
      // Create the comment from the AI user
      const comment = await prisma.comment.create({
        data: {
          content: responseText,
          ticketId: ticket.id,
          authorId: ticket.createdById,
          isAiGenerated: true,
          evaluationResult: evaluation
        },
        include: { 
          author: true
        }
      });

      // --- Emit AI Typing Stop & New Comment START ---
      if (supportUserEmail) {
         try {
           // Emit that AI stopped typing *before* sending the comment
           console.log(`[Socket] Emitting AI stopped typing to support user: ${supportUserEmail}`);
           socketService.emitTypingStatus(supportUserEmail, { isTyping: false, ticketId: ticket.id });

           // Emit the actual comment
           console.log(`[Socket] Emitting AI comment back to support user: ${supportUserEmail}`);
           socketService.emitNewCommentToUser(supportUserEmail, comment);
         } catch (socketError) {
           console.error('[Socket Error] Failed to send AI comment update/stop typing:', socketError);
         }
      } else {
          console.warn(`[Socket] Could not find email for support user ID ${supportUserId} to send AI comment update.`);
      }
      // --- Emit AI Typing Stop & New Comment END ---
      
      // Return the created comment
      return res.status(201).json({ 
        comment,
        isAiGenerated: true  
      });
      
    } catch (error: any) {
       // --- Emit AI Typing Stop on Error --- 
       if (supportUserEmail) {
         try {
            console.log(`[Socket] Emitting AI stopped typing due to error for user: ${supportUserEmail}`);
            socketService.emitTypingStatus(supportUserEmail, { isTyping: false, ticketId });
         } catch (emitError) {
            console.error('[Socket Error] Failed to emit stop typing on error:', emitError);
         }
       }
      // -----------------------------------

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
    const { ticketId } = req.params; 
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

  /**
   * Get support assistant response to a specific query about a ticket
   */
  getSupportAssistantResponse: async (req: Request, res: Response) => {
    const ticketId = req.params.ticketId;
    const { supportQuestion, supportUserId } = req.body;
    
    try {
      console.log(`Received request for support assistant on ticket ${ticketId}`);
      
      // Validate parameters
      if (!ticketId || !supportQuestion || !supportUserId) {
        return res.status(400).json({
          error: 'Missing required parameters',
          details: 'ticketId, supportQuestion and supportUserId are required'
        });
      }
      
      // Fetch the ticket with its comments
      const ticket = await prisma.ticket.findUnique({
        where: { id: ticketId },
        include: {
          comments: {
            orderBy: { createdAt: 'asc' },
            include: {
              author: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  role: true
                }
              }
            }
          }
        }
      });
      
      if (!ticket) {
        return res.status(404).json({
          error: 'Ticket not found',
          details: `No ticket found with ID ${ticketId}`
        });
      }
      
      // Format comments for the agent
      const comments = ticket.comments.map(comment => ({
        id: comment.id,
        text: comment.content,
        userId: comment.authorId,
        ticketId: comment.ticketId,
        createdAt: comment.createdAt,
        author: comment.author
      }));
      
      // Generate response using the support assistant agent
      const result = await supportAssistantAgent.generateAssistantResponse({
        ticket: {
          id: ticket.id,
          title: ticket.title,
          description: ticket.description,
          device: ticket.device || '',
          priority: ticket.priority,
          categoryId: ticket.categoryId,
          additionalInfo: ticket.additionalInfo || ''
        },
        comments,
        supportQuestion,
        supportUserId
      });
      
      // Log activity
      console.log(`Support assistant generated response for ticket ${ticketId}, requested by user ${supportUserId}`);
      console.log(`Response time: ${result.responseTime.toFixed(2)} seconds`);
      
      // Log activity details for monitoring usage
      console.log('Support assistant usage details:', JSON.stringify({
        ticketId,
        supportUserId,
        timestamp: new Date().toISOString(),
        question: supportQuestion.substring(0, 100) + (supportQuestion.length > 100 ? '...' : ''), // Truncate for logging
        responseLength: result.response.length,
        responseTime: result.responseTime,
        interactionId: result.interaction?.id || 'not tracked'
      }));
      
      // Return result with the interactionId for frontend analytics tracking 
      // If the agent has already tracked the interaction, it will be included in result.interaction
      res.status(200).json({
        success: true,
        response: result.response,
        interactionId: result.interaction?.id || null,
        responseTime: result.responseTime
      });
      
    } catch (error: any) {
      console.error('Error generating support assistant response:', error);
      res.status(500).json({
        error: 'Failed to generate support assistant response',
        details: error.message || 'Unknown error'
      });
    }
  },
}; 