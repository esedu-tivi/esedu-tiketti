import { ChatOpenAI } from "@langchain/openai";
import SUPPORT_ASSISTANT_PROMPT from "../prompts/supportAssistantPrompt.js";
import { AI_CONFIG } from "../config.js";
import { PrismaClient } from '@prisma/client';
import { performance } from 'perf_hooks';

// Create Prisma client
const prisma = new PrismaClient();

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
}

/**
 * SupportAssistantAgent provides assistance to support staff for resolving tickets.
 * It gives guidance, troubleshooting steps, and recommendations based on ticket context.
 */
export class SupportAssistantAgent {
  private model: ChatOpenAI;
  
  constructor() {
    // Initialize the language model
    this.model = new ChatOpenAI({
      openAIApiKey: AI_CONFIG.openai.apiKey,
      modelName: AI_CONFIG.openai.chatModel,
      temperature: 0.1, 
    });
    
    console.log('SupportAssistantAgent: Initialized with model:', AI_CONFIG.openai.chatModel);
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
    const startTime = performance.now();
    
    try {
      const { 
        ticket, 
        comments, 
        supportQuestion, 
        supportUserId
      } = params;
      
      console.log(`SupportAssistantAgent: Generating response for ticket: ${ticket.id}, from support user: ${supportUserId}`);
      console.log(`SupportAssistantAgent: Support question: "${supportQuestion}"`);
      
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
        console.log(`SupportAssistantAgent: AdditionalInfo not provided in params, fetching from database`);
        const fullTicket = await prisma.ticket.findUnique({
          where: { id: ticket.id }
        });
        
        if (fullTicket) {
          ticketAdditionalInfo = fullTicket.additionalInfo || '';
          console.log(`SupportAssistantAgent: Found additionalInfo from database: ${ticketAdditionalInfo}`);
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
      console.log(`SupportAssistantAgent: Searching for knowledge articles directly related to ticket ${ticket.id}`);
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
        console.log(`SupportAssistantAgent: Found ${relatedKnowledgeArticles.length} knowledge articles directly related to ticket ${ticket.id}`);
        knowledgeContext = 'Relevant information from knowledge base:\n\n' + 
          relatedKnowledgeArticles.map(article => 
            `${article.title}\n${article.content}`
          ).join('\n\n');
      } else {
        console.log(`SupportAssistantAgent: No knowledge articles directly related to ticket ${ticket.id} found`);
      }
      
      // Combine knowledge articles if available
      let additionalKnowledge = '';
      if (knowledgeContext) {
        additionalKnowledge = '\n\nRelevant knowledge and potential solutions:\n';
        additionalKnowledge += `\n${knowledgeContext}`;
      }
      
      // Format the prompt with ticket information and conversation history
      const promptInput = {
        ticketTitle: ticket.title,
        ticketDescription: ticket.description,
        deviceInfo: ticket.device || 'Ei määritelty',
        category: category.name,
        additionalInfo: (ticketAdditionalInfo || 'Ei lisätietoja') + additionalKnowledge,
        conversationHistory: conversationHistory || 'Ei aiempaa keskusteluhistoriaa.',
        supportQuestion: supportQuestion
      };
      
      console.log(`SupportAssistantAgent: Sending prompt to model...`);
      
      // Format the messages using the template
      const formattedMessages = await SUPPORT_ASSISTANT_PROMPT.formatMessages(promptInput);
      
      // Log the prompt (for debugging)
      console.log(`SupportAssistantAgent: Prompt created with ${formattedMessages.length} messages`);
      
      // Get the response from the language model
      const llmStartTime = performance.now();
      const response = await this.model.invoke(formattedMessages);
      const llmEndTime = performance.now();
      
      console.log(`SupportAssistantAgent: Got response in ${((llmEndTime - llmStartTime) / 1000).toFixed(2)}s`);
      
      // Extract the assistant's response
      const assistantResponse = response.content.toString();
      
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
        
        console.log(`SupportAssistantAgent: Tracked interaction in analytics, ID: ${interaction.id}`);
      } catch (analyticsError) {
        console.error('SupportAssistantAgent: Error tracking analytics:', analyticsError);
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
      
      console.error('SupportAssistantAgent Error:', error);
      return {
        response: `Valitettavasti en pystynyt käsittelemään pyyntöäsi. Virhe: ${error.message || 'Tuntematon virhe.'}`,
        responseTime: totalResponseTime
      };
    }
  }
}

// Create and export a singleton instance
export const supportAssistantAgent = new SupportAssistantAgent(); 