import { ChatOpenAI } from "@langchain/openai";
import CONVERSATION_SUMMARY_PROMPT from "../prompts/conversationSummaryPrompt.js";
import { AI_CONFIG } from "../config.js";
import { PrismaClient, TicketStatus } from '@prisma/client';
import { Ticket, Comment, User, Category } from '@prisma/client'; // Import related types

// Type for comments including author (matching fetch in controller)
type CommentWithAuthor = Comment & { author: User | null };

// Type for the input data required by the agent
interface SummarizeParams {
  ticket: Ticket & { category: Category | null; comments: CommentWithAuthor[] };
}

const prisma = new PrismaClient(); // Add prisma client instance if not already present

/**
 * SummarizerAgent generates concise summaries of ticket conversations.
 */
export class SummarizerAgent {
  private model: ChatOpenAI;

  constructor() {
    // Initialize the language model
    this.model = new ChatOpenAI({
      openAIApiKey: AI_CONFIG.openai.apiKey,
      modelName: AI_CONFIG.openai.chatModel, 
      temperature: 0.3, // Keep lower temperature for focused summary
    });
    console.log('SummarizerAgent: Initialized with model:', AI_CONFIG.openai.chatModel);
  }

  /**
   * Generates a summary for the given ticket and its conversation history.
   */
  async summarizeConversation(params: SummarizeParams): Promise<string> {
    const { ticket } = params;
    const ticketId = ticket.id; // Get ticket ID for saving
    // --- DEBUG LOG: Input Parameters --- 
    console.log(`SummarizerAgent: summarizeConversation called for ticket ID: ${ticketId}`);
    // console.log('SummarizerAgent: Received Ticket Data:', JSON.stringify(ticket, null, 2)); // Optional: Log full ticket data if needed
    
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
      console.log('SummarizerAgent: Prompt Input Data:', JSON.stringify(promptInput, null, 2));

      // Format Prompt
      const formattedMessages = await CONVERSATION_SUMMARY_PROMPT.formatMessages(promptInput);
      // --- DEBUG LOG: Formatted Prompt --- 
      // Log only the first message (system) and the second message (human template content) for brevity
      console.log('SummarizerAgent: Formatted Prompt Messages (System & Human):', JSON.stringify(formattedMessages.slice(0, 2), null, 2)); 
      
      // Invoke LLM
      console.log(`SummarizerAgent: Invoking LLM for summarization of ticket ${ticketId}...`);
      const startTime = performance.now();
      const response = await this.model.invoke(formattedMessages);
      const endTime = performance.now();
      const responseTime = ((endTime - startTime) / 1000).toFixed(2);
      console.log(`SummarizerAgent: Summarization LLM response received (${responseTime}s).`);

      const summary = response?.content?.toString().trim() || 'Yhteenvedon luonti epäonnistui.';
      // --- DEBUG LOG: Summary Output --- 
      console.log(`SummarizerAgent: Generated Summary:`, summary);

      // --- Save Summary to Database --- 
      if (summary && summary !== 'Yhteenvedon luonti epäonnistui.' && summary !== 'Virhe yhteenvedon luonnissa.') {
        try {
          await prisma.ticket.update({
            where: { id: ticketId },
            data: { aiSummary: summary },
          });
          console.log(`SummarizerAgent: Successfully saved summary for ticket ${ticketId}`);
        } catch (dbError) {
          console.error(`SummarizerAgent: Failed to save summary for ticket ${ticketId}:`, dbError);
          // Don't fail the whole operation, just log the error
        }
      }
      // --- End Save Summary --- 

      return summary;

    } catch (error: any) {
      console.error(`SummarizerAgent Error summarizing conversation for ticket ${ticketId}:`, error);
      // Re-throw or return a specific error message?
      // Returning an error message seems safer for the controller.
      return 'Virhe yhteenvedon luonnissa.'; 
    }
  }
}

// Create and export a singleton instance
export const summarizerAgent = new SummarizerAgent(); 