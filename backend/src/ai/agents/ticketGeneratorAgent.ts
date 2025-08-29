import { ChatOpenAI } from "@langchain/openai";
import logger from '../../utils/logger.js';
import { TICKET_GENERATOR_PROMPT } from "../prompts/ticketGeneratorPrompt.js";
import SOLUTION_GENERATOR_PROMPT from "../prompts/solutionGeneratorPrompt.js";
import { AI_CONFIG } from "../config.js";
import { aiSettingsService } from '../../services/aiSettingsService.js';
import { createTokenCallback } from '../../utils/tokenCallbackHandler.js';
import { prisma } from '../../lib/prisma.js';
import { Priority, ResponseFormat } from '@prisma/client';
import { z } from "zod";
import { StructuredOutputParser } from "langchain/output_parsers";

// Define the response format enum values as a tuple to satisfy zod's type requirements
const responseFormatEnum = AI_CONFIG.trainingTickets.responseFormats as [string, ...string[]];

// Define the output schema for our ticket generator
const ticketOutputSchema = z.object({
  title: z.string().min(5).max(100),
  description: z.string().min(10).max(AI_CONFIG.trainingTickets.maxDescriptionLength),
  device: z.string().max(100),
  additionalInfo: z.string().max(1000).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
  responseFormat: z.enum(responseFormatEnum),
});

// Create structured parser for the output
const outputParser = StructuredOutputParser.fromZodSchema(ticketOutputSchema);

// Define the interface for the return type of generateTicket
interface GeneratedTicket {
  title: string;
  description: string;
  device: string;
  additionalInfo: string;
  priority: Priority;
  responseFormat: ResponseFormat;
  userProfile: string;
  categoryId: string;
  createdById: string;
  assignedToId: string | null;
}

/**
 * Ticket Generator Agent that creates realistic IT support tickets for training
 * and simulates user responses in conversations
 */
export class TicketGeneratorAgent {
  private model: ChatOpenAI | null = null;
  
  constructor() {
    logger.debug('TicketGeneratorAgent: Created - model will be initialized on first use'); // DEBUG LOG
  }
  
  private async initializeModel(): Promise<void> {
    if (this.model) return;
    
    const modelName = await aiSettingsService.getModelForAgent('generator');
    this.model = new ChatOpenAI({
      openAIApiKey: AI_CONFIG.openai.apiKey,
      model: modelName,  // Use 'model' instead of deprecated 'modelName'
    });
    logger.debug('TicketGeneratorAgent: Model initialized:', { model: modelName }); // DEBUG LOG
  }

  /**
   * Generates a realistic IT support ticket based on parameters
   */
  async generateTicket(params: {
    complexity?: string;
    category?: string;
    userProfile?: string;
    assignToId?: string; // Optional: Assign ticket to a specific support person
    responseFormat?: string; // Optional: Specify the desired response format
    userId?: string; // Optional: User ID for token tracking
  }): Promise<GeneratedTicket> {
    // Ensure model is initialized
    await this.initializeModel();
    
    // logger.info('TicketGeneratorAgent: generateTicket called with params:', JSON.stringify(params, null, 2)); // DEBUG LOG
    logger.debug('[DEBUG] TicketGeneratorAgent.generateTicket - Start', { params }); // DEBUG LOG
    try {
      // Set default values if not provided
      const complexity = params.complexity || 'moderate';
      const category = params.category || 'Tekniset ongelmat';
      const userProfile = params.userProfile || 'student';
      const userProvidedResponseFormat = params.responseFormat; // Store to use later
      
      // logger.info('TicketGeneratorAgent: Using effective parameters:', { // DEBUG LOG
      //   complexity, 
      //   category, 
      //   userProfile,
      //   responseFormat: userProvidedResponseFormat 
      // });
      logger.debug('[DEBUG] TicketGeneratorAgent.generateTicket - Effective Params', { complexity, category, userProfile, userProvidedResponseFormat }); // DEBUG LOG
      
      // Ensure all required prompt variables are provided and valid
      if (!complexity || !category || !userProfile) {
        // logger.error('TicketGeneratorAgent: Missing required parameters', { complexity, category, userProfile }); // DEBUG LOG
        logger.error('[DEBUG] TicketGeneratorAgent.generateTicket - ERROR: Missing required params', { complexity, category, userProfile }); // DEBUG LOG
        throw new Error('Missing required parameters for ticket generation');
      }
      
      // Validate complexity is one of the allowed values
      if (!AI_CONFIG.trainingTickets.complexityLevels.includes(complexity)) {
        // logger.error('TicketGeneratorAgent: Invalid complexity level:', complexity); // DEBUG LOG
        logger.error('[DEBUG] TicketGeneratorAgent.generateTicket - ERROR: Invalid complexity', { complexity }); // DEBUG LOG
        throw new Error(`Invalid complexity level. Must be one of: ${AI_CONFIG.trainingTickets.complexityLevels.join(', ')}`);
      }
      
      // Validate responseFormat if provided
      if (userProvidedResponseFormat && !AI_CONFIG.trainingTickets.responseFormats.includes(userProvidedResponseFormat)) {
        // logger.error('TicketGeneratorAgent: Invalid response format:', userProvidedResponseFormat); // DEBUG LOG
        logger.error('[DEBUG] TicketGeneratorAgent.generateTicket - ERROR: Invalid response format', { userProvidedResponseFormat }); // DEBUG LOG
        throw new Error(`Invalid response format. Must be one of: ${AI_CONFIG.trainingTickets.responseFormats.join(', ')}`);
      }
      
      // Find the category - either by ID (if UUID) or by name
      let categoryRecord;
      
      // Check if the category parameter looks like a UUID
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(category);
      logger.debug('[DEBUG] TicketGeneratorAgent.generateTicket - Checking category type', { categoryInput: category, isUuid }); // DEBUG LOG
      
      if (isUuid) {
        // If it's a UUID, find by ID
        // logger.info('TicketGeneratorAgent: Looking up category by ID:', category); // DEBUG LOG
        logger.debug('[DEBUG] TicketGeneratorAgent.generateTicket - Finding category by ID', { categoryId: category }); // DEBUG LOG
        categoryRecord = await prisma.category.findUnique({
          where: {
            id: category
          },
        });
      } else {
        // Otherwise, find by name (original behavior)
        // logger.info('TicketGeneratorAgent: Looking up category by name:', category); // DEBUG LOG
        logger.debug('[DEBUG] TicketGeneratorAgent.generateTicket - Finding category by name', { categoryName: category }); // DEBUG LOG
        categoryRecord = await prisma.category.findFirst({
          where: {
            name: {
              contains: category,
              mode: 'insensitive',
            },
          },
        });
      }
      
      if (!categoryRecord) {
        // logger.error('TicketGeneratorAgent: Category not found:', category); // DEBUG LOG
        logger.error('[DEBUG] TicketGeneratorAgent.generateTicket - ERROR: Category not found', { categoryInput: category }); // DEBUG LOG
        throw new Error(`Category "${category}" not found`);
      }
      logger.debug('[DEBUG] TicketGeneratorAgent.generateTicket - Found category record', { categoryRecord }); // DEBUG LOG
      
      // For prompt formatting, we need the actual category name
      const categoryName = categoryRecord.name;

      // Translate user profile to Finnish for the Ticket Generation Prompt
      let userProfileFinnish: string;
      switch (userProfile) { // Use the effective userProfile variable
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
      logger.debug('[DEBUG] TicketGeneratorAgent.generateTicket - Translated userProfile for prompt', { original: userProfile, translated: userProfileFinnish }); // DEBUG LOG
      
      // Format the prompt with provided parameters
      const promptParams = { // DEBUG LOG
        complexity: complexity.trim(),
        category: categoryName.trim(), // Use the category name for the prompt
        userProfile: userProfileFinnish.trim(), // Use the translated Finnish profile
      };
      // logger.info('TicketGeneratorAgent: Formatting prompt with params:', JSON.stringify(promptParams, null, 2)); // DEBUG LOG
      logger.debug('[DEBUG] TicketGeneratorAgent.generateTicket - Formatting prompt', { promptParams }); // DEBUG LOG
      const formattedMessages = await TICKET_GENERATOR_PROMPT.formatMessages(promptParams);
      
      // logger.info('TicketGeneratorAgent: Invoking LLM for ticket generation...'); // DEBUG LOG
      logger.debug('[DEBUG] TicketGeneratorAgent.generateTicket - Invoking LLM for ticket content...'); // DEBUG LOG
      logger.debug('[DEBUG] TicketGeneratorAgent.generateTicket - LLM Input:', JSON.stringify(formattedMessages, null, 2)); // DEBUG LOG
      
      // Call the language model to generate ticket content
      // Create token tracking callback
      const modelName = await aiSettingsService.getModelForAgent('generator');
      const tokenCallback = createTokenCallback({
        agentType: 'generator',
        modelUsed: modelName,
        requestType: 'generate_ticket',
        userId: params.userId // Pass userId if provided
      });
      
      const response = await this.model!.invoke(formattedMessages, {
        callbacks: [tokenCallback]
      });
      
      // Parse the response
      // const outputInstructions = outputParser.getFormatInstructions(); // Not used currently
      const rawTicketData = response.content;
      
      // logger.info('TicketGeneratorAgent: Received raw response from LLM:', rawTicketData.toString()); // DEBUG LOG
      logger.debug('[DEBUG] TicketGeneratorAgent.generateTicket - LLM raw response received:', { rawTicketData: rawTicketData.toString() }); // DEBUG LOG
      
      // Extract the JSON data from the response
      let parsedTicketData;
      try {
        // Try to parse the entire response as JSON
        logger.debug('[DEBUG] TicketGeneratorAgent.generateTicket - Attempting direct JSON parse...'); // DEBUG LOG
        parsedTicketData = JSON.parse(rawTicketData.toString());
      } catch (e) {
        // logger.info('TicketGeneratorAgent: Failed to parse entire response as JSON, trying to extract JSON from text'); // DEBUG LOG
        logger.warn('[DEBUG] TicketGeneratorAgent.generateTicket - Direct JSON parse failed, attempting regex extraction...', { error: e }); // DEBUG LOG
        // If that fails, try to extract JSON from the text
        const jsonMatch = rawTicketData.toString().match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
             logger.debug('[DEBUG] TicketGeneratorAgent.generateTicket - Found potential JSON via regex, parsing...', { jsonMatch: jsonMatch[0] }); // DEBUG LOG
            parsedTicketData = JSON.parse(jsonMatch[0]);
          } catch (parseError) {
            // logger.error('TicketGeneratorAgent: Failed to parse extracted JSON:', jsonMatch[0], 'Error:', parseError); // DEBUG LOG
             logger.error('[DEBUG] TicketGeneratorAgent.generateTicket - ERROR: Failed to parse extracted JSON', { jsonString: jsonMatch[0], parseError }); // DEBUG LOG
            throw new Error("Failed to parse extracted JSON from model output");
          }
        } else {
          // logger.error('TicketGeneratorAgent: Failed to extract JSON from response:', rawTicketData.toString()); // DEBUG LOG
           logger.error('[DEBUG] TicketGeneratorAgent.generateTicket - ERROR: Failed to extract JSON block from response', { rawResponse: rawTicketData.toString() }); // DEBUG LOG
          throw new Error("Failed to parse model output as JSON");
        }
      }
      
      // logger.info('TicketGeneratorAgent: Successfully parsed JSON from LLM response:', JSON.stringify(parsedTicketData, null, 2));
      logger.debug('[DEBUG] TicketGeneratorAgent.generateTicket - Successfully parsed ticket data from LLM', { parsedTicketData }); // DEBUG LOG
      
      // Find the dedicated AI user to create the ticket as
      logger.debug('[DEBUG] TicketGeneratorAgent.generateTicket - Finding AI user...'); // DEBUG LOG
      let adminUser = await prisma.user.findFirst({
        where: { 
          email: 'admin@example.com' // Use the dedicated EseduTiketti AI user
        },
      });
      
      if (!adminUser) {
        // Fallback to any admin user if the AI user doesn't exist
        logger.warn('[DEBUG] TicketGeneratorAgent.generateTicket - AI user not found, falling back to any admin user'); // DEBUG LOG
        adminUser = await prisma.user.findFirst({
          where: { 
            role: 'ADMIN' 
          },
        });
        
        if (!adminUser) {
          logger.error('[DEBUG] TicketGeneratorAgent.generateTicket - ERROR: No admin user found in DB'); // DEBUG LOG
          throw new Error("No admin user found to create the training ticket");
        }
      }
      logger.debug('[DEBUG] TicketGeneratorAgent.generateTicket - Found admin user', { adminUserId: adminUser.id }); // DEBUG LOG
      
      // If priority not set or invalid, use default priority based on complexity
      if (!parsedTicketData.priority || 
          !['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].includes(parsedTicketData.priority)) {
        
        logger.warn('[DEBUG] TicketGeneratorAgent.generateTicket - Priority missing or invalid in LLM response, using default based on complexity.', { parsedPriority: parsedTicketData.priority, complexity }); // DEBUG LOG
        // Type-safe complexity check for defaultPriorities
        if (complexity === 'simple' || complexity === 'moderate' || complexity === 'complex') {
          parsedTicketData.priority = AI_CONFIG.trainingTickets.defaultPriorities[complexity];
          // logger.info(`TicketGeneratorAgent: Using default priority for ${complexity} complexity: ${parsedTicketData.priority}`); // DEBUG LOG
        } else {
          // Fallback to MEDIUM if complexity is not in defaultPriorities
          parsedTicketData.priority = 'MEDIUM';
          logger.warn(`[DEBUG] TicketGeneratorAgent.generateTicket - Unknown complexity level '${complexity}', falling back to MEDIUM priority.`); // DEBUG LOG
        }
      }
      
      // If user provided a responseFormat parameter, use it instead of the AI-generated one
      if (userProvidedResponseFormat) {
        // logger.info(`TicketGeneratorAgent: Overriding AI-generated response format with user-provided format: ${userProvidedResponseFormat}`); // DEBUG LOG
        logger.debug('[DEBUG] TicketGeneratorAgent.generateTicket - Overriding response format with user input.', { aiFormat: parsedTicketData.responseFormat, userFormat: userProvidedResponseFormat }); // DEBUG LOG
        parsedTicketData.responseFormat = userProvidedResponseFormat;
      } 
      // Otherwise ensure response format from AI is valid
      else if (!parsedTicketData.responseFormat || 
          !AI_CONFIG.trainingTickets.responseFormats.includes(parsedTicketData.responseFormat)) {
        // Default to TEKSTI if invalid
        logger.warn('[DEBUG] TicketGeneratorAgent.generateTicket - Response format missing or invalid in LLM response, using default TEKSTI.', { parsedFormat: parsedTicketData.responseFormat }); // DEBUG LOG
        parsedTicketData.responseFormat = 'TEKSTI';
        // logger.info(`TicketGeneratorAgent: Using default response format: ${parsedTicketData.responseFormat}`); // DEBUG LOG
      }
      
      // Trim description if it exceeds maxDescriptionLength
      if (parsedTicketData.description && 
          parsedTicketData.description.length > AI_CONFIG.trainingTickets.maxDescriptionLength) {
        // logger.info(`TicketGeneratorAgent: Trimmed description to maximum length: ${AI_CONFIG.trainingTickets.maxDescriptionLength} chars`); // DEBUG LOG
        logger.warn('[DEBUG] TicketGeneratorAgent.generateTicket - Description exceeds max length, trimming.', { originalLength: parsedTicketData.description.length, maxLength: AI_CONFIG.trainingTickets.maxDescriptionLength }); // DEBUG LOG
        parsedTicketData.description = parsedTicketData.description.substring(
          0, AI_CONFIG.trainingTickets.maxDescriptionLength
        );
      }
      
      // Ensure all fields are properly set
      const finalTicketData = { // DEBUG LOG
        title: parsedTicketData.title,
        description: parsedTicketData.description,
        device: parsedTicketData.device || '', // Ensure device is not null
        additionalInfo: parsedTicketData.additionalInfo || '', // Ensure additionalInfo is not null
        priority: parsedTicketData.priority as Priority,
        responseFormat: parsedTicketData.responseFormat as ResponseFormat,
        userProfile: userProfile,
        categoryId: categoryRecord.id,
        createdById: adminUser.id,
        assignedToId: params.assignToId || null,
      };
      // logger.info('TicketGeneratorAgent: Returning final ticket data:', JSON.stringify(finalTicketData, null, 2)); // DEBUG LOG
      logger.debug('[DEBUG] TicketGeneratorAgent.generateTicket - Returning final generated ticket data:', { finalTicketData }); // DEBUG LOG
      return finalTicketData;

    } catch (error) {
      // logger.error('Error generating ticket:', error); // DEBUG LOG
      logger.error('[DEBUG] TicketGeneratorAgent.generateTicket - ERROR in execution:', { error }); // DEBUG LOG
      throw new Error(`Failed to generate ticket: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Generates a solution and detailed troubleshooting guide for a ticket
   * This becomes the hidden solution that the AI agent knows but doesn't reveal
   */
  async generateSolution(ticketId: string): Promise<string> {
    logger.debug('[DEBUG] TicketGeneratorAgent.generateSolution - Start', { ticketId }); // DEBUG LOG
    try {
      // Get the ticket data
      logger.debug('[DEBUG] TicketGeneratorAgent.generateSolution - Finding ticket by ID', { ticketId }); // DEBUG LOG
      const ticket = await prisma.ticket.findUnique({
        where: { id: ticketId },
        include: { category: true }
      });
      
      if (!ticket) {
        logger.error('[DEBUG] TicketGeneratorAgent.generateSolution - ERROR: Ticket not found', { ticketId }); // DEBUG LOG
        throw new Error(`Ticket ${ticketId} not found`);
      }
      logger.debug('[DEBUG] TicketGeneratorAgent.generateSolution - Found ticket record', { ticket }); // DEBUG LOG
      
      // Format the solution prompt with ticket data
      const formattedMessages = await SOLUTION_GENERATOR_PROMPT.formatMessages({
        title: ticket.title,
        description: ticket.description,
        device: ticket.device || 'Ei määritelty',
        category: ticket.category.name,
      });
      
      // logger.info('Using formatted prompt for solution generation');
      logger.debug('[DEBUG] TicketGeneratorAgent.generateSolution - Invoking LLM for solution...'); // DEBUG LOG
      logger.debug('[DEBUG] TicketGeneratorAgent.generateSolution - LLM Input:', JSON.stringify(formattedMessages, null, 2)); // DEBUG LOG
      
      // Get solution from LLM
      const solutionCallback = createTokenCallback({
        agentType: 'generator',
        modelUsed: await aiSettingsService.getModelForAgent('generator'),
        ticketId,
        requestType: 'generate_solution'
      });
      
      const response = await this.model!.invoke(formattedMessages, {
        callbacks: [solutionCallback]
      });
      
      return response.content.toString();
    } catch (error) {
      // logger.error('Error generating solution:', error);
      logger.error('[DEBUG] TicketGeneratorAgent.generateSolution - ERROR in execution:', { error }); // DEBUG LOG
      return "Ratkaisun luominen epäonnistui.";
    }
  }
  
  /**
   * Generates a solution based on raw ticket data (used for preview)
   */
  async generateSolutionForPreview(data: {
    title: string;
    description: string;
    device?: string;
    categoryId: string;
    userId?: string; // Optional: User ID for token tracking
  }): Promise<string> {
    // logger.info('TicketGeneratorAgent: generateSolutionForPreview called with data:', data); // DEBUG LOG
    logger.debug('[DEBUG] TicketGeneratorAgent.generateSolutionForPreview - Start', { data }); // DEBUG LOG
    try {

      // Get category name from ID
      logger.debug('[DEBUG] TicketGeneratorAgent.generateSolutionForPreview - Finding category by ID', { categoryId: data.categoryId }); // DEBUG LOG
      const category = await prisma.category.findUnique({
        where: { id: data.categoryId },
      });

      if (!category) {
        // logger.error('TicketGeneratorAgent: Category not found for solution preview:', data.categoryId); // DEBUG LOG
        logger.error('[DEBUG] TicketGeneratorAgent.generateSolutionForPreview - ERROR: Category not found', { categoryId: data.categoryId }); // DEBUG LOG
        throw new Error(`Category with ID ${data.categoryId} not found for solution generation.`);
      }
      logger.debug('[DEBUG] TicketGeneratorAgent.generateSolutionForPreview - Found category record', { category }); // DEBUG LOG

      // Format the solution prompt with provided ticket data
      const formattedMessages = await SOLUTION_GENERATOR_PROMPT.formatMessages({
        title: data.title,
        description: data.description,
        device: data.device || 'Ei määritelty',
        category: category.name, // Use the fetched category name
      });

      // logger.info('TicketGeneratorAgent: Invoking LLM for solution preview generation...'); // DEBUG LOG
      logger.debug('[DEBUG] TicketGeneratorAgent.generateSolutionForPreview - Invoking LLM for solution...'); // DEBUG LOG
      logger.debug('[DEBUG] TicketGeneratorAgent.generateSolutionForPreview - LLM Input:', JSON.stringify(formattedMessages, null, 2)); // DEBUG LOG
      
      // Get solution from LLM
      const solutionCallback = createTokenCallback({
        agentType: 'generator',
        modelUsed: await aiSettingsService.getModelForAgent('generator'),
        requestType: 'generate_solution_preview',
        userId: data.userId // Pass userId if provided
      });
      
      const response = await this.model!.invoke(formattedMessages, {
        callbacks: [solutionCallback]
      });
      const solutionContent = response.content.toString();
      
      // logger.info('TicketGeneratorAgent: Solution preview generated successfully.'); // DEBUG LOG
      logger.debug('[DEBUG] TicketGeneratorAgent.generateSolutionForPreview - Solution generated successfully.', { solutionLength: solutionContent.length }); // DEBUG LOG
      return solutionContent;

    } catch (error) {
      // logger.error('TicketGeneratorAgent: Error generating solution for preview:', error); // DEBUG LOG
      logger.error('[DEBUG] TicketGeneratorAgent.generateSolutionForPreview - ERROR in execution:', { error }); // DEBUG LOG
      // Return a generic error message, but don't throw, 
      // so the preview can still potentially show the ticket data
      return "Ratkaisun esikatselun luominen epäonnistui."; 
    }
  }
}

// Create a singleton instance
export const ticketGenerator = new TicketGeneratorAgent(); 