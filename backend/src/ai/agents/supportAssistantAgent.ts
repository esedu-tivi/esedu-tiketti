import { ChatOpenAI } from "@langchain/openai";
import logger from '../../utils/logger.js';
import SUPPORT_ASSISTANT_PROMPT from "../prompts/supportAssistantPrompt.js";
import { AI_CONFIG } from "../config.js";
import { prisma } from '../../lib/prisma.js';
import { aiSettingsService } from '../../services/aiSettingsService.js';
import { createTokenCallback } from '../../utils/tokenCallbackHandler.js';
import { PrismaClient } from '@prisma/client';
import { performance } from 'perf_hooks';

// Create Prisma client

/**
 * Interface for the comment object used in conversations
 */
interface CommentData {
  id: string;
  text: string;
  userId: string;
  ticketId: string;
  createdAt: Date;
  author?: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
}

/**
 * Interface for the parameters used to generate assistant responses
 */
interface SupportAssistantParams {
  ticket: {
    id: string;
    title: string;
    description: string;
    device: string;
    priority: string;
    categoryId: string;
    additionalInfo?: string;
  };
  comments: CommentData[];
  supportQuestion: string;
  supportUserId: string;
  studentAssistantConversationHistory?: string;
}

/**
 * SupportAssistantAgent provides assistance to support staff for resolving tickets.
 * It gives guidance, troubleshooting steps, and recommendations based on ticket context.
 * 
 * IMPORTANT: Responses are NEVER cached as each ticket context is unique.
 * Only generates fresh, context-aware assistance for support staff.
 */
export class SupportAssistantAgent {
  private model: ChatOpenAI | null = null;
  private currentModelName: string | null = null;
  
  constructor() {
    // Model will be initialized on first use with settings from database
    logger.info('🚀 [SupportAssistantAgent] Created - model will be initialized on first use');
  }
  
  private async initializeModel(): Promise<void> {
    const modelName = await aiSettingsService.getModelForAgent('support');
    logger.info(`🔍 [SupportAssistantAgent] Retrieved model from settings: "${modelName}"`);
    
    // Check if model needs to be reinitialized due to settings change
    if (this.model && this.currentModelName === modelName) {
      return; // Model is already initialized with correct settings
    }
    
    // Initialize or reinitialize the model
    logger.info('🔄 [SupportAssistantAgent] Initializing model', { 
      previousModel: this.currentModelName, 
      newModel: modelName,
      isReinitializing: !!this.model
    });
    
    this.model = new ChatOpenAI({
      openAIApiKey: AI_CONFIG.openai.apiKey,
      model: modelName,  // Use 'model' instead of deprecated 'modelName' // Add temperature for balanced creativity and consistency
      cache: true, // Enable OpenAI's built-in deduplication only
    });
    this.currentModelName = modelName;
    
    // Log the actual model that LangChain will use
    logger.info(`🚀 [SupportAssistantAgent] Model initialized with settings model: "${modelName}"`);
    logger.info(`🚀 [SupportAssistantAgent] LangChain ChatOpenAI model property: "${this.model.model}"`);
    logger.info('🚀 [SupportAssistantAgent] Full initialization details:', {
      settingsModel: modelName,
      responseCaching: 'DISABLED - Always fresh, context-aware responses',
      note: 'Each ticket requires unique assistance'
    });
  }

  /**
   * Generates an assistant response to help support staff with a ticket
   * @param params Parameters containing ticket information, comment history, and support question
   * @returns The assistant's response text and metadata
   */
  async generateAssistantResponse(params: SupportAssistantParams): Promise<{
    response: string;
    responseTime: number;
    interaction?: any;
  }> {
    // Ensure model is initialized
    await this.initializeModel();
    
    const startTime = performance.now();
    
    try {
      const { 
        ticket, 
        comments, 
        supportQuestion, 
        supportUserId,
        studentAssistantConversationHistory
      } = params;
      
      logger.info(`\n=== SUPPORT ASSISTANT CONVERSATION ===`);
      logger.info(`Ticket: #${ticket.id} - ${ticket.title}`);
      logger.info(`Support User: ${supportUserId}`);
      logger.info(`Current Question: "${supportQuestion}"`);
      
      // Format customer-support conversation history
      if (comments && comments.length > 0) {
        logger.info(`\n--- CUSTOMER-SUPPORT CONVERSATION ---`);
        comments.forEach((comment, index) => {
          const userName = comment.author?.name || 'Unknown User';
          const role = comment.author?.role === 'SUPPORT' || comment.author?.role === 'ADMIN' ? 'Support' : 'Customer';
          logger.info(`[${comment.createdAt.toLocaleString('fi-FI')}] ${role} (${userName}): ${comment.text}`);
        });
        logger.info(`--- END CUSTOMER-SUPPORT CONVERSATION ---\n`);
      } else {
        logger.info(`\n--- NO CUSTOMER-SUPPORT CONVERSATION YET ---\n`);
      }
      
      // Display student-assistant conversation history
      if (studentAssistantConversationHistory) {
        logger.info(`\n--- STUDENT-ASSISTANT CONVERSATION HISTORY ---`);
        // Split the conversation into exchanges for better readability
        const exchanges = studentAssistantConversationHistory.split('\n\n').filter(exchange => exchange.trim());
        if (exchanges.length > 0) {
          exchanges.forEach((exchange, index) => {
            logger.info(`${exchange}`);
            if (index < exchanges.length - 1) logger.info('');  // Add empty line between exchanges
          });
        }
        logger.info(`--- END STUDENT-ASSISTANT CONVERSATION HISTORY ---\n`);
      } else {
        logger.info(`\n--- NO PREVIOUS STUDENT-ASSISTANT CONVERSATION ---\n`);
      }
      
      // Get category name
      const category = await prisma.category.findUnique({
        where: { id: ticket.categoryId }
      });
      
      if (!category) {
        throw new Error(`Category not found for ticket ${ticket.id}`);
      }
      
      // Get full ticket data including additionalInfo if not provided
      let ticketAdditionalInfo = ticket.additionalInfo;
      if (!ticketAdditionalInfo) {
        logger.info(`SupportAssistantAgent: AdditionalInfo not provided in params, fetching from database`);
        const fullTicket = await prisma.ticket.findUnique({
          where: { id: ticket.id }
        });
        
        if (fullTicket) {
          ticketAdditionalInfo = fullTicket.additionalInfo || '';
          logger.info(`SupportAssistantAgent: Found additionalInfo from database: ${ticketAdditionalInfo}`);
        }
      }
      
      // Format conversation history for the prompt
      const conversationHistory = comments.map(comment => {
        const userName = comment.author?.name || 'Unknown User';
        const isSupport = comment.author?.role === 'SUPPORT' || comment.author?.role === 'ADMIN';
        const role = isSupport ? "Tukihenkilö" : "Käyttäjä";
        
        return `[${comment.createdAt.toLocaleString('fi-FI')}] ${role} (${userName}): ${comment.text}`;
      }).join('\n\n');
      
      // Search for knowledge articles that are specifically related to this ticket
      logger.info(`SupportAssistantAgent: Searching for knowledge articles directly related to ticket ${ticket.id}`);
      const relatedKnowledgeArticles = await prisma.knowledgeArticle.findMany({
        where: {
          relatedTicketIds: {
            has: ticket.id
          }
        },
        orderBy: {
          updatedAt: 'desc'
        }
      });
      
      // Prepare additional context from knowledge articles if available
      let knowledgeContext = '';
      if (relatedKnowledgeArticles && relatedKnowledgeArticles.length > 0) {
        logger.info(`SupportAssistantAgent: Found ${relatedKnowledgeArticles.length} knowledge articles directly related to ticket ${ticket.id}`);
        knowledgeContext = 'Relevant information from knowledge base:\n\n' + 
          relatedKnowledgeArticles.map(article => 
            `${article.title}\n${article.content}`
          ).join('\n\n');
      } else {
        logger.info(`SupportAssistantAgent: No knowledge articles directly related to ticket ${ticket.id} found`);
      }
      
      // Combine knowledge articles if available
      let knowledgeForPrompt = '';
      if (knowledgeContext) {
        knowledgeForPrompt = knowledgeContext;
      }
      
      // Format the prompt with ticket information and conversation history
      const promptInput = {
        ticketTitle: ticket.title,
        ticketDescription: ticket.description,
        deviceInfo: ticket.device || 'Ei määritelty',
        category: category.name,
        additionalInfo: ticketAdditionalInfo || 'Ei lisätietoja',
        knowledgeBaseContent: knowledgeForPrompt || 'Ei tietoa',
        conversationHistory: conversationHistory || 'Ei aiempaa keskusteluhistoriaa asiakkaan kanssa.',
        studentAssistantConversationHistory: studentAssistantConversationHistory || 'Tämä on tämän chat-istunnon ensimmäinen viesti sinulle.',
        supportQuestion: supportQuestion
      };
      
      logger.info(`SupportAssistantAgent: Sending prompt to model...`);
      logger.info(`SupportAssistantAgent: Prompt includes ticket title: "${ticket.title}", category: "${category.name}"`);
      logger.info(`SupportAssistantAgent: Using ${comments.length} comments from the ticket's conversation history`);
      logger.info(`SupportAssistantAgent: Using ${studentAssistantConversationHistory ? 'existing' : 'first-time'} student-assistant conversation history`);
      
      // Format the messages using the template
      const formattedMessages = await SUPPORT_ASSISTANT_PROMPT.formatMessages(promptInput);
      
      // Log the prompt (for debugging)
      logger.info(`\n--- PROMPT FORMATTING ---`);
      logger.info(`Ticket: "${ticket.title}" in category: "${category.name}"`);
      logger.info(`Comments in conversation: ${comments.length}`);
      logger.info(`Knowledge base content length: ${knowledgeForPrompt ? knowledgeForPrompt.length : 0} characters`);
      logger.info(`--- END PROMPT FORMATTING ---\n`);
      
      // Get FRESH response - NEVER cache support responses as they're context-dependent
      logger.info(`\n--- SENDING TO LANGUAGE MODEL (NO RESPONSE CACHING) ---`);
      const llmStartTime = performance.now();
      
      // Create token tracking callback
      const modelName = await aiSettingsService.getModelForAgent('support');
      logger.info(`📊 [SupportAssistant] Tracking model for token analytics: ${modelName}`);
      logger.info(`📊 [SupportAssistant] Actual model being used by LangChain: ${this.model!.model}`);
      
      const tokenCallback = createTokenCallback({
        agentType: 'support',
        modelUsed: modelName,
        ticketId: ticket.id,
        userId: supportUserId,
        requestType: 'support_assistance'
      });
      
      const response = await this.model!.invoke(formattedMessages, {
        callbacks: [tokenCallback]
      });
      const llmEndTime = performance.now();
      
      const responseTime = (llmEndTime - llmStartTime) / 1000;
      logger.info(`🚀 [SupportAssistant] Fresh response generated in ${responseTime.toFixed(2)}s`);
      logger.info(`--- END LANGUAGE MODEL CALL ---\n`);
      
      // Extract the assistant's response
      const assistantResponse = response.content.toString();
      
      // Log the response
      logger.info(`\n--- NEW SUPPORT ASSISTANT RESPONSE ---`);
      logger.info(assistantResponse);
      logger.info(`--- END SUPPORT ASSISTANT RESPONSE ---\n`);
      
      // Calculate total time
      const endTime = performance.now();
      const totalResponseTime = (endTime - startTime) / 1000;
      
      // Store the interaction in the database for analytics
      let interaction;
      try {
        interaction = await prisma.aIAssistantInteraction.create({
          data: {
            ticketId: ticket.id,
            userId: supportUserId,
            query: supportQuestion,
            response: assistantResponse,
            responseTime: totalResponseTime
          }
        });
        
        // Update daily usage statistics
        const today = new Date();
        const todayStart = new Date(today.setHours(0, 0, 0, 0));
        
        // Find or create usage stats for today
        let usageStat = await prisma.aIAssistantUsageStat.findUnique({
          where: { date: todayStart }
        });
        
        if (usageStat) {
          // Update existing stats
          await prisma.aIAssistantUsageStat.update({
            where: { id: usageStat.id },
            data: {
              totalInteractions: usageStat.totalInteractions + 1,
              avgResponseTime: (usageStat.avgResponseTime * usageStat.totalInteractions + totalResponseTime) / (usageStat.totalInteractions + 1),
              totalTicketsAssisted: ticket ? usageStat.totalTicketsAssisted + 1 : usageStat.totalTicketsAssisted
            }
          });
        } else {
          // Create new stats for today
          await prisma.aIAssistantUsageStat.create({
            data: {
              date: todayStart, 
              totalInteractions: 1,
              avgResponseTime: totalResponseTime,
              totalTicketsAssisted: ticket ? 1 : 0
            }
          });
        }
        
        // Update category stats
        // Find or create category stats for today
        const categoryStat = await prisma.aIAssistantCategoryStat.findUnique({
          where: {
            categoryId_date: {
              categoryId: ticket.categoryId,
              date: todayStart
            }
          }
        });
        
        if (categoryStat) {
          await prisma.aIAssistantCategoryStat.update({
            where: { id: categoryStat.id },
            data: {
              interactionCount: categoryStat.interactionCount + 1
            }
          });
        } else {
          await prisma.aIAssistantCategoryStat.create({
            data: {
              categoryId: ticket.categoryId,
              date: todayStart,
              interactionCount: 1
            }
          });
        }
        
        logger.info(`SupportAssistantAgent: Tracked interaction in analytics, ID: ${interaction.id}`);
      } catch (analyticsError) {
        logger.error('SupportAssistantAgent: Error tracking analytics:', analyticsError);
        // Don't break the main functionality if analytics tracking fails
      }
      
      return {
        response: assistantResponse,
        responseTime: totalResponseTime,
        interaction: interaction
      };
      
    } catch (error: any) {
      const endTime = performance.now();
      const totalResponseTime = (endTime - startTime) / 1000;
      
      logger.error('SupportAssistantAgent Error:', error);
      return {
        response: `Valitettavasti en pystynyt käsittelemään pyyntöäsi. Virhe: ${error.message || 'Tuntematon virhe.'}`,
        responseTime: totalResponseTime
      };
    }
  }

  /**
   * Generates a streaming assistant response to help support staff with a ticket
   * @param params Parameters containing ticket information, comment history, and support question
   * @returns An async generator that yields response chunks
   */
  async *generateAssistantResponseStream(params: SupportAssistantParams): AsyncGenerator<{
    chunk?: string;
    done?: boolean;
    interactionId?: string;
    error?: string;
  }> {
    // Ensure model is initialized
    await this.initializeModel();
    
    const startTime = performance.now();
    
    try {
      const { 
        ticket, 
        comments, 
        supportQuestion, 
        supportUserId,
        studentAssistantConversationHistory
      } = params;
      
      logger.info(`\n=== SUPPORT ASSISTANT STREAMING CONVERSATION ===`);
      logger.info(`Ticket: #${ticket.id} - ${ticket.title}`);
      logger.info(`Support User: ${supportUserId}`);
      logger.info(`Current Question: "${supportQuestion}"`);
      
      // Get the category name
      const category = await prisma.category.findUnique({
        where: { id: ticket.categoryId },
        select: { name: true }
      });
      
      if (!category) {
        yield { error: 'Kategoriaa ei löytynyt. Tarkista tiketin tiedot.' };
        return;
      }
      
      // Format conversation history
      const conversationHistory = comments.map((comment, index) => {
        const userName = comment.author?.name || 'Unknown User';
        const role = comment.author?.role === 'SUPPORT' || comment.author?.role === 'ADMIN' ? 'Support' : 'Customer';
        return `[${comment.createdAt.toLocaleString('fi-FI')}] ${role} (${userName}): ${comment.text}`;
      }).join('\n\n');
      
      // Search for knowledge articles
      const relatedKnowledgeArticles = await prisma.knowledgeArticle.findMany({
        where: {
          relatedTicketIds: {
            has: ticket.id
          }
        },
        orderBy: {
          updatedAt: 'desc'
        }
      });
      
      // Prepare knowledge context
      let knowledgeContext = '';
      if (relatedKnowledgeArticles && relatedKnowledgeArticles.length > 0) {
        knowledgeContext = 'Relevant information from knowledge base:\n\n' + 
          relatedKnowledgeArticles.map(article => 
            `${article.title}\n${article.content}`
          ).join('\n\n');
      }
      
      // Format the prompt
      const promptInput = {
        ticketTitle: ticket.title,
        ticketDescription: ticket.description,
        deviceInfo: ticket.device || 'Ei määritelty',
        category: category.name,
        additionalInfo: ticket.additionalInfo || 'Ei lisätietoja',
        knowledgeBaseContent: knowledgeContext || 'Ei tietoa',
        conversationHistory: conversationHistory || 'Ei aiempaa keskusteluhistoriaa asiakkaan kanssa.',
        studentAssistantConversationHistory: studentAssistantConversationHistory || 'Tämä on tämän chat-istunnon ensimmäinen viesti sinulle.',
        supportQuestion: supportQuestion
      };
      
      const formattedMessages = await SUPPORT_ASSISTANT_PROMPT.formatMessages(promptInput);
      
      logger.info(`\n--- STARTING STREAMING RESPONSE ---`);
      const llmStartTime = performance.now();
      
      // Create token tracking callback for streaming
      const modelName = await aiSettingsService.getModelForAgent('support');
      const streamCallback = createTokenCallback({
        agentType: 'support',
        modelUsed: modelName,
        ticketId: ticket.id,
        userId: supportUserId,
        requestType: 'support_assistance_stream'
      });
      
      // Use stream method instead of invoke
      const stream = await this.model!.stream(formattedMessages, {
        callbacks: [streamCallback]
      });
      
      let fullResponse = '';
      
      // Stream chunks to the client
      for await (const chunk of stream) {
        const text = chunk.content.toString();
        fullResponse += text;
        yield { chunk: text };
      }
      
      const llmEndTime = performance.now();
      logger.info(`Streaming completed in ${((llmEndTime - llmStartTime) / 1000).toFixed(2)}s`);
      
      // Calculate total time
      const endTime = performance.now();
      const totalResponseTime = (endTime - startTime) / 1000;
      
      // Store the interaction in the database for analytics
      let interaction;
      try {
        interaction = await prisma.aIAssistantInteraction.create({
          data: {
            ticketId: ticket.id,
            userId: supportUserId,
            query: supportQuestion,
            response: fullResponse,
            responseTime: totalResponseTime
          }
        });
        
        // Update statistics (same as before)
        const today = new Date();
        const todayStart = new Date(today.setHours(0, 0, 0, 0));
        
        const usageStat = await prisma.aIAssistantUsageStat.findUnique({
          where: { date: todayStart }
        });
        
        if (usageStat) {
          await prisma.aIAssistantUsageStat.update({
            where: { id: usageStat.id },
            data: {
              totalInteractions: usageStat.totalInteractions + 1,
              avgResponseTime: (usageStat.avgResponseTime * usageStat.totalInteractions + totalResponseTime) / (usageStat.totalInteractions + 1),
            }
          });
        } else {
          await prisma.aIAssistantUsageStat.create({
            data: {
              date: todayStart,
              totalInteractions: 1,
              avgResponseTime: totalResponseTime,
              totalTicketsAssisted: 1
            }
          });
        }
        
        logger.info(`SupportAssistantAgent: Tracked streaming interaction in analytics, ID: ${interaction.id}`);
      } catch (analyticsError) {
        logger.error('SupportAssistantAgent: Error tracking analytics:', analyticsError);
      }
      
      // Send done signal with interaction ID
      yield { 
        done: true, 
        interactionId: interaction?.id 
      };
      
    } catch (error: any) {
      logger.error('SupportAssistantAgent Streaming Error:', error);
      yield { 
        error: `Valitettavasti en pystynyt käsittelemään pyyntöäsi. Virhe: ${error.message || 'Tuntematon virhe.'}` 
      };
    }
  }
  
}

// Create and export a singleton instance
export const supportAssistantAgent = new SupportAssistantAgent(); 