import { ChatOpenAI } from "@langchain/openai";
import logger from '../../utils/logger.js';
import CONVERSATION_SUMMARY_PROMPT from "../prompts/conversationSummaryPrompt.js";
import { AI_CONFIG } from "../config.js";
import { aiSettingsService } from '../../services/aiSettingsService.js';
import { createTokenCallback } from '../../utils/tokenCallbackHandler.js';
import { prisma } from '../../lib/prisma.js';
import { TicketStatus, Ticket, Comment, User, Category } from '@prisma/client'; // Import related types

// Type for comments including author (matching fetch in controller)
type CommentWithAuthor = Comment & { author: User | null };

// Type for the input data required by the agent
interface SummarizeParams {
  ticket: Ticket & { category: Category | null; comments: CommentWithAuthor[] };
}


/**
 * SummarizerAgent generates concise summaries of ticket conversations.
 */
export class SummarizerAgent {
  private model: ChatOpenAI | null = null;
  private currentModelName: string | null = null;

  constructor() {
    logger.info('SummarizerAgent: Created - model will be initialized on first use');
  }
  
  private async initializeModel(): Promise<void> {
    const modelName = await aiSettingsService.getModelForAgent('summarizer');
    
    // Check if model needs to be reinitialized due to settings change
    if (this.model && this.currentModelName === modelName) {
      return; // Model is already initialized with correct settings
    }
    
    // Initialize or reinitialize the model
    logger.info('SummarizerAgent: Initializing model', { 
      previousModel: this.currentModelName, 
      newModel: modelName,
      isReinitializing: !!this.model
    });
    
    this.model = new ChatOpenAI({
      openAIApiKey: AI_CONFIG.openai.apiKey,
      model: modelName,  // Use 'model' instead of deprecated 'modelName'
    });
    this.currentModelName = modelName;
    logger.info('SummarizerAgent: Model initialized:', { model: modelName });
  }

  /**
   * Generates a summary for the given ticket and its conversation history.
   */
  async summarizeConversation(params: SummarizeParams): Promise<string> {
    // Ensure model is initialized
    await this.initializeModel();
    
    const { ticket } = params;
    const ticketId = ticket.id; // Get ticket ID for saving
    // --- DEBUG LOG: Input Parameters --- 
    logger.info(`SummarizerAgent: summarizeConversation called for ticket ID: ${ticketId}`);
    // logger.info('SummarizerAgent: Received Ticket Data:', JSON.stringify(ticket, null, 2)); // Optional: Log full ticket data if needed
    
    try {
      // Format Conversation History - Filter out system messages
      const conversationHistory = ticket.comments
        .filter(comment => comment.author?.name !== 'Järjestelmä') // Filter out system messages
        .map((comment) => {
          const authorName = comment.author?.name || 'Tuntematon';
          const timestamp = comment.createdAt.toLocaleString('fi-FI');
          return `[${timestamp}] ${authorName}: ${comment.content}`;
        })
        .join('\n');

      // Prepare Prompt Input - Add current ticket status
      const promptInput = {
        ticketTitle: ticket.title,
        ticketDescription: ticket.description,
        categoryName: ticket.category?.name || 'Ei kategoriaa',
        ticketStatus: ticket.status as TicketStatus, // Pass current status
        conversationHistory: conversationHistory || 'Ei keskusteluhistoriaa.',
      };
      // --- DEBUG LOG: Prompt Input --- 
      logger.info('SummarizerAgent: Prompt Input Data:', JSON.stringify(promptInput, null, 2));

      // Format Prompt
      const formattedMessages = await CONVERSATION_SUMMARY_PROMPT.formatMessages(promptInput);
      // --- DEBUG LOG: Formatted Prompt --- 
      // Log only the first message (system) and the second message (human template content) for brevity
      logger.info('SummarizerAgent: Formatted Prompt Messages (System & Human):', JSON.stringify(formattedMessages.slice(0, 2), null, 2)); 
      
      // Invoke LLM
      logger.info(`SummarizerAgent: Invoking LLM for summarization of ticket ${ticketId}...`);
      const startTime = performance.now();
      
      // Create token tracking callback
      const modelName = await aiSettingsService.getModelForAgent('summarizer');
      const tokenCallback = createTokenCallback({
        agentType: 'summarizer',
        modelUsed: modelName,
        ticketId: ticketId,
        requestType: 'generate_summary'
      });
      
      const response = await this.model!.invoke(formattedMessages, {
        callbacks: [tokenCallback]
      });
      const endTime = performance.now();
      const responseTime = ((endTime - startTime) / 1000).toFixed(2);
      logger.info(`SummarizerAgent: Summarization LLM response received (${responseTime}s).`);

      const summary = response?.content?.toString().trim() || 'Yhteenvedon luonti epäonnistui.';
      // --- DEBUG LOG: Summary Output --- 
      logger.info(`SummarizerAgent: Generated Summary:`, summary);

      // --- Save Summary to Database --- 
      if (summary && summary !== 'Yhteenvedon luonti epäonnistui.' && summary !== 'Virhe yhteenvedon luonnissa.') {
        try {
          await prisma.ticket.update({
            where: { id: ticketId },
            data: { aiSummary: summary },
          });
          logger.info(`SummarizerAgent: Successfully saved summary for ticket ${ticketId}`);
        } catch (dbError) {
          logger.error(`SummarizerAgent: Failed to save summary for ticket ${ticketId}:`, dbError);
          // Don't fail the whole operation, just log the error
        }
      }
      // --- End Save Summary --- 

      return summary;

    } catch (error: any) {
      logger.error(`SummarizerAgent Error summarizing conversation for ticket ${ticketId}:`, error);
      // Re-throw or return a specific error message?
      // Returning an error message seems safer for the controller.
      return 'Virhe yhteenvedon luonnissa.'; 
    }
  }
}

// Create and export a singleton instance
export const summarizerAgent = new SummarizerAgent(); 