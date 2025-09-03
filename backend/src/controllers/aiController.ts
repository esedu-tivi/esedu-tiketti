import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger.js';
import { asyncHandler, ValidationError, NotFoundError } from '../middleware/errorHandler.js';
import { ticketGenerator } from '../ai/agents/ticketGeneratorAgent.js';
import { modernTicketGenerator } from '../ai/agents/modernTicketGeneratorAgent.js';
import { chatAgent } from '../ai/agents/chatAgent.js';
import { modernChatAgent, ConversationStateMachine } from '../ai/agents/modernChatAgent.js';
import { enhancedModernChatAgent } from '../ai/agents/enhancedModernChatAgent.js';
import { TicketStatus, Comment, User, Category, Prisma } from '@prisma/client';
import { ticketService } from '../services/ticketService.js';
import { CreateTicketDTO } from '../types/index.js';
import { summarizerAgent } from '../ai/agents/summarizerAgent.js';
import { getSocketService } from '../services/socketService.js';
import { supportAssistantAgent } from '../ai/agents/supportAssistantAgent.js';
import { prisma } from '../lib/prisma.js';
import { aiSettingsService } from '../services/aiSettingsService.js';

// In-memory storage for conversation states
// Maps ticketId -> ConversationStateMachine instance
const conversationStates = new Map<string, ConversationStateMachine>();

// Helper to get or create state machine for a ticket
const getOrCreateStateMachine = (ticketId: string): ConversationStateMachine => {
  let stateMachine = conversationStates.get(ticketId);
  if (!stateMachine) {
    stateMachine = new ConversationStateMachine();
    conversationStates.set(ticketId, stateMachine);
    logger.info(`🆕 [StateMachine] Created new state machine for ticket ${ticketId}`);
  }
  return stateMachine;
};

// Clean up state machine after conversation ends
const cleanupStateMachine = (ticketId: string): void => {
  if (conversationStates.delete(ticketId)) {
    logger.info(`🧹 [StateMachine] Cleaned up state machine for ticket ${ticketId}`);
  }
};

export const aiController = {
  /**
   * Check if OpenAI API is configured
   */
  checkConfiguration: asyncHandler(async (req: Request, res: Response) => {
    const hasApiKey = !!process.env.OPENAI_API_KEY;
    const isValidFormat = process.env.OPENAI_API_KEY?.startsWith('sk-') || false;
    
    res.json({
      success: true,
      data: {
        isConfigured: hasApiKey && isValidFormat,
        details: {
          hasApiKey,
          isValidFormat
        }
      }
    });
  }),

  /**
   * Generate a *preview* of a training ticket without saving it.
   */
  generateTrainingTicketPreview: asyncHandler(async (req: Request, res: Response) => {
      const { complexity, category, userProfile, assignToId, manualStyle, manualTechnicalLevel } = req.body;
      
      logger.info('Received request to generate training ticket preview:', req.body);
      
      // Validate the required parameters
      if (!complexity || !category || !userProfile) {
        throw new ValidationError('complexity, category, and userProfile are required');
      }
      
      // Get the requesting user's ID for token tracking
      let userId: string | undefined;
      if (req.user?.email) {
        const user = await prisma.user.findUnique({
          where: { email: req.user.email }
        });
        userId = user?.id;
      }
      
      // Check which ticket generator to use
      const useModernGenerator = await aiSettingsService.useModernTicketGenerator();
      const generator = useModernGenerator ? modernTicketGenerator : ticketGenerator;
      
      logger.info(`Using ${useModernGenerator ? 'modern' : 'legacy'} ticket generator for preview`);
      
      // Generate ticket data using the AI agent but DO NOT save it yet
      logger.info('Calling ticket generator for preview with parameters:', { 
        complexity, category, userProfile, assignToId, userId,
        manualStyle, manualTechnicalLevel 
      });
      const ticketData = await generator.generateTicket({
        complexity,
        category,
        userProfile,
        assignToId, // Pass assignToId so it's included in the preview data
        userId, // Pass userId for token tracking
        manualStyle, // Pass manual style override if provided
        manualTechnicalLevel // Pass manual technical level override if provided
      });
      
      logger.info('Successfully generated ticket preview data');
      
      // Log metadata if using modern generator
      if (ticketData.metadata) {
        logger.info('📊 [Ticket Metadata]:', {
          generatorVersion: ticketData.metadata.generatorVersion,
          writingStyle: ticketData.metadata.writingStyle,
          technicalLevel: ticketData.metadata.technicalLevel,
          technicalAccuracy: ticketData.metadata.technicalAccuracy
        });
      }
      
      // ALSO generate the solution during preview
      logger.info('Generating solution for preview...');
      // We need some details from ticketData to generate the solution
      // Note: ticketData.id doesn't exist yet, so we call generateSolution with raw data
      // Assuming generateSolution can handle raw data or we adapt it slightly
      // For now, let's pass the necessary components. We might need to adjust ticketGeneratorAgent if this fails.
      const solution = await generator.generateSolutionForPreview({
        title: ticketData.title,
        description: ticketData.description,
        device: ticketData.device,
        categoryId: ticketData.categoryId, // We need category ID to find the name
        userId // Pass userId for token tracking
      });
      logger.info('Successfully generated solution for preview');
      
      // Return the generated data AND the solution for confirmation
      res.status(200).json({ 
        ticketData: ticketData, // Send the raw generated ticket data
        solution: solution      // Send the generated solution text
      });
  }),

  /**
   * Confirm and create a training ticket after preview.
   */
  confirmTrainingTicketCreation: asyncHandler(async (req: Request, res: Response) => {
      // Receive the ticket data AND the pre-generated solution
      const { ticketData, complexity, solution } = req.body; // Added solution
      
      logger.info('Received request to confirm training ticket creation:', req.body);
      
      // Validate the received ticket data (basic check)
      if (!ticketData || !ticketData.title || !ticketData.description || !ticketData.categoryId || !ticketData.createdById || !complexity || !solution) { // Added check for solution
        throw new ValidationError('Invalid ticket data provided for confirmation. Essential ticket data, complexity, or solution is missing');
      }
      
      // Create the ticket with standard fields from the confirmed data
      const createTicketData: CreateTicketDTO = {
        title: ticketData.title,
        description: ticketData.description,
        device: ticketData.device,
        additionalInfo: ticketData.additionalInfo,
        priority: ticketData.priority,
        categoryId: ticketData.categoryId,
        responseFormat: 'TEKSTI',  // Always text-only
        userProfile: ticketData.userProfile,
        attachments: [],
      };
      
      // Create the ticket using the service
      logger.info('Creating ticket in database with confirmed data:', createTicketData);
      const ticket = await ticketService.createTicket(createTicketData, ticketData.createdById);
      logger.info('Ticket created with ID:', ticket.id);
      
      // Update ticket with AI-generated flag and metadata if from ModernTicketGenerator
      const updateData: any = { isAiGenerated: true };
      if (ticketData.metadata && ticketData.metadata.generatorVersion === 'modern') {
        updateData.generatorMetadata = ticketData.metadata;
        logger.info('Storing ModernTicketGenerator metadata:', ticketData.metadata);
      }
      
      await prisma.ticket.update({
        where: { id: ticket.id! }, 
        data: updateData,
      });
      logger.info('Marked ticket as AI-generated with metadata');
      
      // Store the PRE-GENERATED solution (received from frontend) in a knowledge base entry
      logger.info('Storing pre-generated solution for ticket ID:', ticket.id);
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
      logger.info('Knowledge article created for solution');
      
      let finalTicket = ticket; // Use the initially created ticket by default
      
      // If assignToId is specified in the confirmed data, update the ticket
      if (ticketData.assignedToId) {
        logger.info('Assigning ticket to user ID:', ticketData.assignedToId);
        await ticketService.updateTicket(ticket.id!, {
          assignedToId: ticketData.assignedToId,
          status: 'IN_PROGRESS' as TicketStatus
        });
        
        // Fetch the updated ticket to include assignment info
        const updatedTicket = await ticketService.getTicketById(ticket.id!);
        if (updatedTicket) {
          finalTicket = updatedTicket; // Use the updated ticket if assignment was successful
          logger.info('Ticket successfully assigned');
        } else {
           logger.warn('Failed to fetch updated ticket after assignment, returning original ticket');
        }
      }
      
      logger.info('Training ticket creation confirmed and completed.');
      // Include the solution content in the response (as it was received)
      res.status(201).json({ 
        ticket: finalTicket, 
        solution: solution, // Send back the solution that was saved
        isAiGenerated: true
      });
      
  }),

  /**
   * Generate a training ticket for IT support students
   */
  // generateTrainingTicket: async (req: Request, res: Response) => { ... existing code ... }, // Keep old one commented out or remove later
  
  /**
   * Generate a simulated user response to a support comment
   * This makes AI-generated tickets interactive for training purposes
   */
  generateUserResponse: asyncHandler(async (req: Request, res: Response) => {
    const ticketId = req.params.id || req.body.ticketId;
    const { commentText, supportUserId } = req.body;
    let supportUserEmail: string | null = null;
    const socketService = getSocketService(); // Get socket service instance

      logger.info(`Received request to generate AI chat response for ticket ${ticketId}`);
      
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
         logger.warn(`[Socket] Could not find email for support user ID ${supportUserId} to send AI typing status.`);
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
      
      logger.info('Using ChatAgent to generate interactive response');
      
      // Get userProfile from the fetched ticket
      const userProfile = ticket.userProfile || 'student'; 
      logger.info(`Using userProfile from ticket: ${userProfile}`);

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
      logger.info(`Translated userProfile to Finnish for ChatAgent: ${userProfileFinnish}`);

      // --- Emit AI Typing Start ---
      if (supportUserEmail) {
        logger.info(`[Socket] Emitting AI typing start to support user: ${supportUserEmail}`);
        socketService.emitTypingStatus(supportUserEmail, { isTyping: true, ticketId });
      }
      // -------------------------
      
      let responseText: string;
      let evaluation: string;
      let emotionalState: string | undefined;
      let reasoning: string | undefined;
      let shouldRevealHint: boolean = false;
      
      // Get AI settings to determine which chat agent to use
      const aiSettings = await aiSettingsService.getSettings();
      const useModernAgent = aiSettings.chatAgentVersion === 'modern';
      const useEnhancedSync = aiSettings.chatAgentSyncWithGenerator && aiSettings.ticketGeneratorVersion === 'modern';
      
      if (useModernAgent) {
        if (useEnhancedSync) {
          logger.info('✨🚀 ============================================');
          logger.info('✨🚀 Using ENHANCED MODERN ChatAgent with style sync');
          logger.info('✨🚀 ============================================');
          logger.info('✨ [EnhancedAgent] Syncing with ModernTicketGenerator');
        } else {
          logger.info('🚀 ============================================');
          logger.info('🚀 Using MODERN ChatAgent for response generation');
          logger.info('🚀 ============================================');
          logger.info('🔍 [ModernAgent] Standard modern implementation');
        }
        
        // Get the ticket creator details
        const ticketCreator = await prisma.user.findUnique({
          where: { id: ticket.createdById }
        });
        logger.info(`👤 [ModernAgent] Ticket creator: ${ticketCreator?.name || 'Unknown'}`);
        
        // Get category details
        const category = await prisma.category.findUnique({
          where: { id: ticket.categoryId }
        });
        logger.info(`📁 [ModernAgent] Category: ${category?.name || 'Unknown'}`);
        
        // Map technical level based on complexity/priority
        const technicalLevel = ticket.priority === 'LOW' ? 'beginner' : 
                               ticket.priority === 'MEDIUM' ? 'intermediate' : 
                               'advanced';
        logger.info(`🎓 [ModernAgent] Technical level mapped: ${technicalLevel} (from priority: ${ticket.priority})`);
        
        logger.info('📊 [ModernAgent] Preparing context for modern agent:', JSON.stringify({
          hasCreator: !!ticketCreator,
          hasCategory: !!category,
          hasSolution: !!solution,
          commentCount: ticket.comments.length,
          priority: ticket.priority
        }, null, 2));
        
        // Get state machine to check if we should force hints
        const stateMachine = getOrCreateStateMachine(ticket.id);
        const hintResult = stateMachine.shouldProvideHint({
          enabled: aiSettings.hintSystemEnabled,
          earlyThreshold: aiSettings.hintOnEarlyThreshold,
          progressThreshold: aiSettings.hintOnProgressThreshold,
          closeThreshold: aiSettings.hintOnCloseThreshold,
          cooldownTurns: aiSettings.hintCooldownTurns,
          maxHints: aiSettings.hintMaxPerConversation
        });
        
        // Build hint instruction if StateMachine decided to give hint
        const hintInstruction = hintResult.shouldHint ? {
          giveHint: true,
          hintType: hintResult.triggerType,
          hintNumber: stateMachine.getHintsGiven() + 1,
          stuckDuration: stateMachine.getStuckCounter()
        } : undefined;
        
        // Choose which agent to use based on sync settings
        let response: any;
        
        if (useEnhancedSync) {
          // Extract metadata from ticket's generatorMetadata field
          let extractedWritingStyle: string | undefined;
          let extractedTechnicalLevel: string | undefined;
          
          if (ticket.generatorMetadata && typeof ticket.generatorMetadata === 'object') {
            const metadata = ticket.generatorMetadata as any;
            if (metadata.generatorVersion === 'modern') {
              extractedWritingStyle = metadata.writingStyle;
              extractedTechnicalLevel = metadata.technicalLevel;
              logger.info('📊 [EnhancedAgent] Using metadata from ModernTicketGenerator:', {
                writingStyle: extractedWritingStyle,
                technicalLevel: extractedTechnicalLevel,
                technicalAccuracy: metadata.technicalAccuracy
              });
            }
          }
          
          // Use enhanced chat agent with writing style sync
          response = await enhancedModernChatAgent.respond(
            {
              title: ticket.title,
              description: ticket.description,
              device: ticket.device || undefined,
              category: category?.name || 'Unknown',
              additionalInfo: ticket.additionalInfo || undefined,
              solution: solution?.content || 'Ei tietoa ratkaisusta',
              userProfile: {
                name: ticketCreator?.name || 'Käyttäjä',
                role: userProfile === 'student' ? 'student' : 
                      userProfile === 'teacher' ? 'teacher' : 
                      'staff' as "student" | "teacher" | "staff",
                technicalLevel: (extractedTechnicalLevel || technicalLevel) as "beginner" | "intermediate" | "advanced"
              },
              // Pass extracted writing style if available from metadata
              initialWritingStyle: extractedWritingStyle as any
            },
            ticket.comments.map(comment => ({
              role: comment.authorId === ticket.createdById ? 'user' : 'support',
              content: comment.content,
              timestamp: comment.createdAt
            })),
            commentText,
            hintInstruction, // Pass hint instruction if needed
            supportUserId,
            ticketId
          );
        } else {
          // Use standard modern chat agent
          response = await modernChatAgent.respond(
            {
              title: ticket.title,
              description: ticket.description,
              device: ticket.device || undefined,
              category: category?.name || 'Unknown',
              additionalInfo: ticket.additionalInfo || undefined,
              solution: solution?.content || 'Ei tietoa ratkaisusta',
              userProfile: {
                name: ticketCreator?.name || 'Käyttäjä',
                role: userProfile === 'student' ? 'student' : 
                      userProfile === 'teacher' ? 'teacher' : 
                      'staff' as "student" | "teacher" | "staff",
                technicalLevel: technicalLevel as "beginner" | "intermediate" | "advanced"
              }
            },
            ticket.comments.map(comment => ({
              role: comment.authorId === ticket.createdById ? 'user' : 'support',
              content: comment.content,
              timestamp: comment.createdAt
            })),
            commentText,
            hintInstruction, // Pass hint instruction if needed
            supportUserId,
            ticketId
          );
        }
        
        responseText = response.response;
        evaluation = response.evaluation;
        emotionalState = response.emotionalState;
        reasoning = response.reasoning;
        // Use hintGiven from response to track if hint was actually given
        shouldRevealHint = response.hintGiven;
        
        // Update state machine AFTER getting response
        stateMachine.transition(evaluation as "EARLY" | "PROGRESSING" | "CLOSE" | "SOLVED");
        
        // Log if we forced a hint
        if (hintResult.shouldHint) {
          logger.info('💡 [StateMachine] Hint was provided to the AI (stuck for ' + stateMachine.getStuckCounter() + ' turns)');
          logger.info('💡 [StateMachine] Hint was given by AI: ' + shouldRevealHint);
          logger.info('💡 [StateMachine] Hint trigger type: ' + hintResult.triggerType);
          reasoning = (reasoning || '') + '\n[StateMachine: Hint provided - ' + hintResult.triggerType + ' threshold triggered]';
        }
        
        // Add state machine info to reasoning
        reasoning = (reasoning || '') + `\n[State: ${stateMachine.getState()}, Turn: ${stateMachine.getTurnCount()}, StuckCounter: ${stateMachine.getStuckCounter()}]`;
        
        // Check if conversation is resolved
        if (stateMachine.getState() === 'resolved') {
          logger.info('🎉 [StateMachine] Conversation marked as resolved!');
          // Clean up the state machine after resolution
          cleanupStateMachine(ticket.id);
        }
        
        logger.info('✅ [ModernAgent] Response generated successfully!');
        logger.info('📊 [ModernAgent] Results:', JSON.stringify({
          evaluation: evaluation,
          emotionalState: response.emotionalState,
          responsePreview: responseText.substring(0, 100) + '...',
          shouldRevealHint: shouldRevealHint,
          stateInfo: {
            state: stateMachine.getState(),
            turnCount: stateMachine.getTurnCount(),
            stuckCounter: stateMachine.getStuckCounter()
          }
        }, null, 2));
        logger.info('🚀 ============================================');
        logger.info('🚀 Modern ChatAgent completed successfully');
        logger.info('🚀 ============================================');
        
      } else {
        logger.info('🔄 ============================================');
        logger.info('🔄 Using LEGACY ChatAgent for response generation');
        logger.info('🔄 ============================================');
        
        // Use legacy chat agent (existing implementation)
        const legacyResponse = await chatAgent.generateChatResponse({
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
        
        responseText = legacyResponse.responseText;
        evaluation = legacyResponse.evaluation;
        
        logger.info(`Legacy chat response generated successfully. Evaluation: ${evaluation}`);
      }
      
      // Create the comment from the AI user
      const comment = await prisma.comment.create({
        data: {
          content: responseText,
          ticketId: ticket.id,
          authorId: ticket.createdById,
          isAiGenerated: true,
          evaluationResult: evaluation,
          emotionalState: emotionalState || null,
          reasoning: reasoning || null,
          shouldRevealHint: shouldRevealHint
        },
        include: { 
          author: true
        }
      });

      // --- Emit AI Typing Stop & New Comment START ---
      if (supportUserEmail) {
         try {
           // Emit that AI stopped typing *before* sending the comment
           logger.info(`[Socket] Emitting AI stopped typing to support user: ${supportUserEmail}`);
           socketService.emitTypingStatus(supportUserEmail, { isTyping: false, ticketId: ticket.id });

           // Emit the actual comment
           logger.info(`[Socket] Emitting AI comment back to support user: ${supportUserEmail}`);
           socketService.emitNewCommentToUser(supportUserEmail, comment);
         } catch (socketError) {
           logger.error('[Socket Error] Failed to send AI comment update/stop typing:', socketError);
         }
      } else {
          logger.warn(`[Socket] Could not find email for support user ID ${supportUserId} to send AI comment update.`);
      }
      // --- Emit AI Typing Stop & New Comment END ---
      
      // Return the created comment
      return res.status(201).json({ 
        comment,
        isAiGenerated: true  
      });
  }),
  
  /**
   * Get AI agent configuration
   */
  getAgentConfig: asyncHandler(async (req: Request, res: Response) => {
      // Get all categories for the dropdown
      const categories = await prisma.category.findMany();
      
      // Return configuration options for the frontend
      res.json({
        complexityOptions: ['simple', 'moderate', 'complex'],
        categoryOptions: categories.map(c => ({ id: c.id, name: c.name })),
        userProfileOptions: ['student', 'teacher', 'staff', 'administrator'],
      });
  }),
  
  /**
   * Get all AI-generated solutions for a ticket
   * This is used to reveal solutions after a support person has attempted to solve the ticket
   */
  getTicketSolution: asyncHandler(async (req: Request, res: Response) => {
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
  }),

  // --- New Analysis Functions --- 

  /**
   * @description Get AI-generated tickets for analysis, with filtering and sorting
   * @route GET /api/ai/analysis/tickets
   * @access Admin
   */
  getAiAnalysisTickets: asyncHandler(async (req: Request, res: Response) => {
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
        } catch (e) { logger.error("Invalid start date format"); }
      }
      if (endDate && typeof endDate === 'string') {
        // Add time component (end of day) to make it inclusive
         try {
           createdAtFilter.lte = new Date(endDate + 'T23:59:59.999Z');
         } catch (e) { logger.error("Invalid end date format"); }
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
  }),
  
  /**
   * Gets the conversation history for a specific AI ticket, including any saved summary.
   * @route GET /api/ai/analysis/tickets/:ticketId/conversation
   * @access Admin, Support
   */
  getAiTicketConversation: asyncHandler(async (req: Request, res: Response) => {
    const { ticketId } = req.params;
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
  }),
  
  /**
   * Generate OR Regenerate a summary for a given ticket conversation
   * @route POST /api/ai/tickets/:id/summarize
   * @access Admin, Support
   */
  summarizeConversation: asyncHandler(async (req: Request, res: Response) => {
    const { ticketId } = req.params; 
    logger.info(`Received request to generate/regenerate summary for ticket ${ticketId}`);
    
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
      logger.info(`Calling SummarizerAgent for ticket ${ticketId}...`);
      const summary = await summarizerAgent.summarizeConversation({ 
         ticket: ticket as FetchedTicketType 
      });
      logger.info(`SummarizerAgent generated and saved summary for ticket ${ticketId}.`);

      // 3. Check for agent error message
      if (summary === 'Virhe yhteenvedon luonnissa.') {
         // return res.status(500).json({ message: summary });
      }

      // 4. Return the NEWLY generated summary
      res.status(200).json({ summary });
  }),
  
  // --- End New Analysis Functions ---

  /**
   * Get support assistant response to a specific query about a ticket
   */
  getSupportAssistantResponse: asyncHandler(async (req: Request, res: Response) => {
    const ticketId = req.params.ticketId;
    const { supportQuestion, supportUserId } = req.body;
    
      logger.info(`Received request for support assistant on ticket ${ticketId}`);
      
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
      
      // Get existing conversation history or create a new one
      let conversation = await prisma.supportAssistantConversation.findUnique({
        where: {
          ticketId_supportUserId: {
            ticketId: ticketId,
            supportUserId: supportUserId
          }
        }
      });
      
      let conversationHistory = conversation?.conversationHistory || '';
      
      logger.info(`SupportAssistant: ${conversation ? 'Found existing' : 'No existing'} conversation history for ticket ${ticketId} and user ${supportUserId}`);
      if (conversation) {
        logger.info(`SupportAssistant: Conversation history length: ${conversationHistory.length} characters`);
        logger.info(`SupportAssistant: Conversation history created at: ${conversation.createdAt}, last updated: ${conversation.updatedAt}`);
      }
      
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
        supportUserId,
        studentAssistantConversationHistory: conversationHistory
      });
      
      // Add this exchange to the conversation history
      const timestamp = new Date().toLocaleString('fi-FI');
      
      // Include interaction ID in the assistant's response for later reference
      const interactionId = result.interaction?.id || null;
      const interactionTag = interactionId ? ` [interaction:${interactionId}]` : '';
      
      // Use a more distinct separator between entries to prevent parsing issues 
      const newExchange = `[${timestamp}] Student: ${supportQuestion}\n\n[${timestamp}] Assistant: ${result.response}${interactionTag}\n\n`;
      
      // Update or create the conversation record
      const updatedConversationHistory = conversationHistory + newExchange;
      logger.info(`SupportAssistant: Adding new exchange to conversation history. New content length: ${newExchange.length} characters`);
      logger.info(`SupportAssistant: First 50 chars of message: "${supportQuestion.substring(0, 50)}${supportQuestion.length > 50 ? '...' : ''}"`);
      logger.info(`SupportAssistant: First 50 chars of response: "${result.response.substring(0, 50)}${result.response.length > 50 ? '...' : ''}"`);
      
      if (conversation) {
        // Update existing conversation
        logger.info(`SupportAssistant: Updating existing conversation (ID: ${conversation.id}) with new exchange`);
        await prisma.supportAssistantConversation.update({
          where: { id: conversation.id },
          data: {
            conversationHistory: updatedConversationHistory,
            updatedAt: new Date()
          }
        });
        logger.info(`SupportAssistant: Conversation updated, total history length now: ${updatedConversationHistory.length} characters`);
      } else {
        // Create new conversation record
        logger.info(`SupportAssistant: Creating new conversation record for ticket ${ticketId} and user ${supportUserId}`);
        const newConversation = await prisma.supportAssistantConversation.create({
          data: {
            ticketId: ticketId,
            supportUserId: supportUserId,
            conversationHistory: newExchange
          }
        });
        logger.info(`SupportAssistant: New conversation created with ID: ${newConversation.id}`);
      }
      
      // Log activity
      logger.info(`Support assistant generated response for ticket ${ticketId}, requested by user ${supportUserId}`);
      logger.info(`Response time: ${result.responseTime.toFixed(2)} seconds`);
      
      // Log activity details for monitoring usage
      logger.info('Support assistant usage details:', JSON.stringify({
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
        responseTime: result.responseTime,
        hasConversationHistory: true // Let frontend know there's history
      });
  }),
  
  /**
   * Retrieve conversation history between a student and the support assistant for a specific ticket
   */
  getSupportAssistantConversationHistory: asyncHandler(async (req: Request, res: Response) => {
    const ticketId = req.params.ticketId;
    const supportUserId = req.params.supportUserId;
    
      logger.info(`Fetching support assistant conversation history for ticket ${ticketId} and user ${supportUserId}`);
      
      // Validate parameters
      if (!ticketId || !supportUserId) {
        return res.status(400).json({
          error: 'Missing required parameters',
          details: 'ticketId and supportUserId are required'
        });
      }
      
      // Get conversation history
      const conversation = await prisma.supportAssistantConversation.findUnique({
        where: {
          ticketId_supportUserId: {
            ticketId: ticketId,
            supportUserId: supportUserId
          }
        }
      });
      
      if (!conversation) {
        return res.status(200).json({
          success: true,
          history: '',
          hasHistory: false
        });
      }
      
      return res.status(200).json({
        success: true,
        history: conversation.conversationHistory,
        hasHistory: true
      });
  }),
  
  /**
   * Clear conversation history between a student and the support assistant for a specific ticket
   */
  clearSupportAssistantConversationHistory: asyncHandler(async (req: Request, res: Response) => {
    const ticketId = req.params.ticketId;
    const supportUserId = req.params.supportUserId;
    
      logger.info(`Clearing support assistant conversation history for ticket ${ticketId} and user ${supportUserId}`);
      
      // Validate parameters
      if (!ticketId || !supportUserId) {
        return res.status(400).json({
          error: 'Missing required parameters',
          details: 'ticketId and supportUserId are required'
        });
      }
      
      // Delete conversation history
      await prisma.supportAssistantConversation.deleteMany({
        where: {
          ticketId: ticketId,
          supportUserId: supportUserId
        }
      });
      
      return res.status(200).json({
        success: true,
        message: 'Conversation history cleared successfully'
      });
      
  }),

  /**
   * Get streaming support assistant response using Server-Sent Events
   */
  getSupportAssistantResponseStream: async (req: Request, res: Response) => {
    const ticketId = req.params.ticketId;
    const { supportQuestion, supportUserId } = req.body;
    
    logger.info(`Received request for streaming support assistant on ticket ${ticketId}`);
    
    // Check if user is authenticated (req.user should be set by authMiddleware)
    if (!req.user) {
      return res.status(401).json({
        error: 'Unauthorized',
        details: 'Authentication required'
      });
    }
    
    // Validate parameters
    if (!ticketId || !supportQuestion || !supportUserId) {
      return res.status(400).json({
        error: 'Missing required parameters',
        details: 'ticketId, supportQuestion and supportUserId are required'
      });
    }
    
    // Set SSE headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable proxy buffering for nginx
      'Access-Control-Allow-Origin': process.env.FRONTEND_URL || 'http://localhost:3000',
      'Access-Control-Allow-Credentials': 'true'
    });
    
    try {
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
        res.write(`data: ${JSON.stringify({ error: `No ticket found with ID ${ticketId}` })}\n\n`);
        res.end();
        return;
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
      
      // Get existing conversation history
      const conversation = await prisma.supportAssistantConversation.findUnique({
        where: {
          ticketId_supportUserId: {
            ticketId: ticketId,
            supportUserId: supportUserId
          }
        }
      });
      
      const conversationHistory = conversation?.conversationHistory || '';
      
      logger.info(`SupportAssistant Streaming: ${conversation ? 'Found existing' : 'No existing'} conversation history`);
      
      // Start streaming response
      const responseGenerator = supportAssistantAgent.generateAssistantResponseStream({
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
        supportUserId,
        studentAssistantConversationHistory: conversationHistory
      });
      
      let fullResponse = '';
      let interactionId: string | undefined;
      
      // Stream chunks to client
      for await (const data of responseGenerator) {
        if (data.chunk) {
          fullResponse += data.chunk;
          res.write(`data: ${JSON.stringify({ chunk: data.chunk })}\n\n`);
        }
        
        if (data.done) {
          interactionId = data.interactionId;
          res.write(`data: ${JSON.stringify({ done: true, interactionId: data.interactionId })}\n\n`);
        }
        
        if (data.error) {
          res.write(`data: ${JSON.stringify({ error: data.error })}\n\n`);
        }
      }
      
      // Update conversation history after streaming completes
      if (fullResponse && !res.writableEnded) {
        const timestamp = new Date().toLocaleString('fi-FI');
        const interactionTag = interactionId ? ` [interaction:${interactionId}]` : '';
        const newExchange = `[${timestamp}] Student: ${supportQuestion}\n\n[${timestamp}] Assistant: ${fullResponse}${interactionTag}\n\n`;
        
        const updatedConversationHistory = conversationHistory + newExchange;
        
        if (conversation) {
          await prisma.supportAssistantConversation.update({
            where: { id: conversation.id },
            data: {
              conversationHistory: updatedConversationHistory,
              updatedAt: new Date()
            }
          });
          logger.info(`SupportAssistant Streaming: Updated conversation history`);
        } else {
          await prisma.supportAssistantConversation.create({
            data: {
              ticketId: ticketId,
              supportUserId: supportUserId,
              conversationHistory: newExchange
            }
          });
          logger.info(`SupportAssistant Streaming: Created new conversation`);
        }
      }
      
      res.end();
      
    } catch (error: any) {
      logger.error('Error in streaming support assistant response:', error);
      if (!res.writableEnded) {
        res.write(`data: ${JSON.stringify({ error: 'Stream error: ' + error.message })}\n\n`);
        res.end();
      }
    }
  },
}; 