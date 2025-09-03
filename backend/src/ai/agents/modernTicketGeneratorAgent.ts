import { ChatOpenAI } from "@langchain/openai";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import logger from '../../utils/logger.js';
import { AI_CONFIG } from "../config.js";
import { aiSettingsService } from '../../services/aiSettingsService.js';
import { createTokenCallback } from '../../utils/tokenCallbackHandler.js';
import { prisma } from '../../lib/prisma.js';
import { Priority, ResponseFormat } from '@prisma/client';
import SOLUTION_GENERATOR_PROMPT from "../prompts/solutionGeneratorPrompt.js";

// Technical level definitions
type TechnicalLevel = 'beginner' | 'intermediate' | 'advanced';
type TicketStyle = 'panic' | 'confused' | 'frustrated' | 'polite' | 'brief';

// Structured output schema for modern ticket generator
const ModernTicketSchema = z.object({
  title: z.string().max(50).describe("Short problem description in Finnish"),
  description: z.string().describe("User's description of the problem in Finnish"),
  device: z.string().describe("Device information, use empty string if not mentioned"),
  additionalInfo: z.string().describe("Additional context, use empty string if none"),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).describe("Ticket priority"),
  style: z.enum(["panic", "confused", "frustrated", "polite", "brief"]).describe("Writing style used"),
  technicalAccuracy: z.number().min(0).max(1).describe("How technically accurate the description is (0-1)")
});

type ModernTicket = z.infer<typeof ModernTicketSchema>;

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
  // Metadata about generation
  metadata?: {
    writingStyle: string;
    technicalLevel: string;
    technicalAccuracy: number;
    generatorVersion: 'modern' | 'legacy';
  };
}

// Technical level configurations
const TECHNICAL_CONFIGS = {
  beginner: {
    maxTerms: 1,
    maxLength: 150,
    triedSteps: [0, 1],
    vagueness: 'high',
    structure: 'chaotic',
    styles: ['panic', 'confused', 'frustrated', 'brief'] as TicketStyle[]
  },
  intermediate: {
    maxTerms: 3,
    maxLength: 250,
    triedSteps: [1, 3],
    vagueness: 'medium',
    structure: 'semi-organized',
    styles: ['confused', 'frustrated', 'polite', 'brief'] as TicketStyle[]
  },
  advanced: {
    maxTerms: 10,
    maxLength: 400,
    triedSteps: [3, 5],
    vagueness: 'low',
    structure: 'organized',
    styles: ['frustrated', 'polite'] as TicketStyle[]
  }
};

/**
 * Modern Ticket Generator Agent with realistic user simulation
 * Creates tickets that match the technical level of the user profile
 */
export class ModernTicketGeneratorAgent {
  private model: ChatOpenAI | null = null;
  private currentModelName: string | null = null;
  
  constructor() {
    logger.info('🎫 [ModernTicketGenerator] Created - model will be initialized on first use');
  }
  
  private async initializeModel(): Promise<void> {
    const modelName = await aiSettingsService.getModelForAgent('generator');
    
    if (this.model && this.currentModelName === modelName) {
      return;
    }
    
    logger.info('🔄 [ModernTicketGenerator] Initializing model', { 
      previousModel: this.currentModelName, 
      newModel: modelName
    });
    
    this.model = new ChatOpenAI({
      openAIApiKey: AI_CONFIG.openai.apiKey,
      model: modelName,
    });
    this.currentModelName = modelName;
    
    logger.info('🚀 [ModernTicketGenerator] Model initialized:', { model: modelName });
  }

  /**
   * Generates a realistic IT support ticket based on parameters
   */
  async generateTicket(params: {
    complexity?: string;
    category?: string;
    userProfile?: string;
    assignToId?: string;
    userId?: string;
    // Optional manual overrides
    manualStyle?: TicketStyle;
    manualTechnicalLevel?: TechnicalLevel;
  }): Promise<GeneratedTicket> {
    await this.initializeModel();
    
    logger.info('🎫 [ModernTicketGenerator] Generating ticket with params:', params);
    
    try {
      // Set defaults
      const complexity = params.complexity || 'moderate';
      const category = params.category || 'Tekniset ongelmat';
      const userProfile = params.userProfile || 'student';
      
      // Validate complexity
      if (!AI_CONFIG.trainingTickets.complexityLevels.includes(complexity)) {
        throw new Error(`Invalid complexity level. Must be one of: ${AI_CONFIG.trainingTickets.complexityLevels.join(', ')}`);
      }
      
      // Find category
      const categoryRecord = await this.findCategory(category);
      if (!categoryRecord) {
        throw new Error(`Category "${category}" not found`);
      }
      
      // Determine technical level - use manual override if provided, otherwise automatic
      const technicalLevel = params.manualTechnicalLevel || this.getTechnicalLevel(userProfile);
      const config = TECHNICAL_CONFIGS[technicalLevel];
      
      // Select style - use manual override if provided, otherwise random
      const style = params.manualStyle || config.styles[Math.floor(Math.random() * config.styles.length)];
      
      logger.info('🎨 [ModernTicketGenerator] Using configuration:', {
        technicalLevel,
        style,
        maxLength: config.maxLength,
        vagueness: config.vagueness
      });
      
      // Build the dynamic prompt
      const systemPrompt = this.buildSystemPrompt(
        technicalLevel,
        style,
        complexity,
        categoryRecord.name,
        userProfile
      );
      
      // Generate ticket with structured output
      const response = await this.model!.invoke(
        [
          { role: "system", content: systemPrompt },
          { role: "user", content: "Generate a realistic support ticket based on the instructions." }
        ],
        {
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "modern_ticket",
              schema: zodToJsonSchema(ModernTicketSchema),
              strict: true
            }
          },
          callbacks: [createTokenCallback({
            agentType: 'generator',
            modelUsed: this.currentModelName!,
            requestType: 'generate_modern_ticket',
            userId: params.userId
          })]
        }
      );
      
      const parsed = ModernTicketSchema.parse(JSON.parse(response.content as string));
      
      logger.info('✅ [ModernTicketGenerator] Generated ticket:', {
        title: parsed.title,
        style: parsed.style,
        technicalAccuracy: parsed.technicalAccuracy,
        descriptionLength: parsed.description.length
      });
      
      // Get admin user
      const adminUser = await this.getAdminUser();
      
      // Determine priority based on complexity if not set
      const priority = this.getPriorityForComplexity(complexity);
      
      return {
        title: parsed.title,
        description: parsed.description,
        device: parsed.device || '',
        additionalInfo: parsed.additionalInfo || '',
        priority: parsed.priority || priority,
        responseFormat: 'TEKSTI' as ResponseFormat,
        userProfile: userProfile,
        categoryId: categoryRecord.id,
        createdById: adminUser.id,
        assignedToId: params.assignToId || null,
        metadata: {
          writingStyle: parsed.style,
          technicalLevel: technicalLevel,
          technicalAccuracy: parsed.technicalAccuracy,
          generatorVersion: 'modern'
        }
      };
      
    } catch (error) {
      logger.error('❌ [ModernTicketGenerator] Error generating ticket:', error);
      throw new Error(`Failed to generate ticket: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * Build dynamic system prompt based on parameters
   */
  private buildSystemPrompt(
    technicalLevel: TechnicalLevel,
    style: TicketStyle,
    complexity: string,
    category: string,
    userProfile: string
  ): string {
    const config = TECHNICAL_CONFIGS[technicalLevel];
    
    let styleInstructions = '';
    switch (style) {
      case 'panic':
        styleInstructions = 'Write in a panicked, urgent tone. Use exclamation marks. Show desperation.';
        break;
      case 'confused':
        styleInstructions = 'Write in a confused tone. Be unsure about details. Use questions.';
        break;
      case 'frustrated':
        styleInstructions = 'Write in a frustrated tone. Show annoyance that things are not working.';
        break;
      case 'polite':
        styleInstructions = 'Write politely and formally. Use "Hei" and "Kiitos".';
        break;
      case 'brief':
        styleInstructions = 'Write extremely briefly. Just 1-2 short sentences.';
        break;
    }
    
    let technicalInstructions = '';
    if (technicalLevel === 'beginner') {
      technicalInstructions = `
CRITICAL RULES FOR BEGINNER:
- DO NOT use technical terms like: IP, DNS, DHCP, ping, IPv4, port, protocol, etc.
- DO NOT mention specific error codes or technical details
- DO NOT list multiple troubleshooting steps (max 1 simple thing like restart)
- Be VERY vague: "netti ei toimi", "en pääse mihinkään", "kone on rikki"
- Focus on what they CAN'T DO, not technical symptoms
- Maximum ${config.maxLength} characters for description
- Device info should be simple like "läppäri" or "koulun kone" if mentioned at all`;
    } else if (technicalLevel === 'intermediate') {
      technicalInstructions = `
RULES FOR INTERMEDIATE USER:
- Can use SOME basic technical terms but often incorrectly
- Might mention "WiFi", "salasana", "verkko", "yhteys"
- Can try 1-3 basic troubleshooting steps
- Still somewhat vague but tries to be helpful
- Maximum ${config.maxLength} characters for description`;
    } else {
      technicalInstructions = `
RULES FOR ADVANCED USER:
- Can use technical terms appropriately
- Can describe symptoms accurately
- Lists relevant troubleshooting steps taken
- Provides useful technical context
- Maximum ${config.maxLength} characters for description`;
    }
    
    const complexityInstructions = complexity === 'simple' 
      ? 'Create a very basic, common problem.'
      : complexity === 'complex'
      ? 'Create a more challenging, less common problem.'
      : 'Create a moderate difficulty problem.';
    
    return `You are simulating a ${userProfile} creating an IT support ticket.

CATEGORY: ${category}
COMPLEXITY: ${complexity}
TECHNICAL LEVEL: ${technicalLevel}
WRITING STYLE: ${style}

${technicalInstructions}

${styleInstructions}

${complexityInstructions}

IMPORTANT:
- Write EVERYTHING in Finnish
- Match the technical level EXACTLY - beginners should NOT sound technical
- Title should be SHORT (max 50 chars) and match the user's technical level
- Set technicalAccuracy: 0.1-0.3 for beginners, 0.4-0.7 for intermediate, 0.8-1.0 for advanced
- Make it realistic for a Finnish educational environment
- DO NOT include solutions or fix instructions`;
  }
  
  /**
   * Determine technical level from user profile
   */
  private getTechnicalLevel(userProfile: string): TechnicalLevel {
    switch (userProfile) {
      case 'student':
        // Most students are beginners
        return Math.random() > 0.7 ? 'intermediate' : 'beginner';
      case 'teacher':
        // Teachers are usually intermediate
        return Math.random() > 0.8 ? 'advanced' : 'intermediate';
      case 'staff':
        // Staff varies widely
        const rand = Math.random();
        return rand > 0.6 ? 'intermediate' : rand > 0.3 ? 'beginner' : 'advanced';
      case 'administrator':
        // Admins are usually advanced
        return 'advanced';
      default:
        return 'beginner';
    }
  }
  
  /**
   * Find category by ID or name
   */
  private async findCategory(category: string) {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(category);
    
    if (isUuid) {
      return await prisma.category.findUnique({
        where: { id: category }
      });
    } else {
      return await prisma.category.findFirst({
        where: {
          name: {
            contains: category,
            mode: 'insensitive',
          },
        },
      });
    }
  }
  
  /**
   * Get admin user for ticket creation
   */
  private async getAdminUser() {
    let adminUser = await prisma.user.findFirst({
      where: { email: 'admin@example.com' }
    });
    
    if (!adminUser) {
      adminUser = await prisma.user.findFirst({
        where: { role: 'ADMIN' }
      });
      
      if (!adminUser) {
        throw new Error("No admin user found to create the training ticket");
      }
    }
    
    return adminUser;
  }
  
  /**
   * Get default priority based on complexity
   */
  private getPriorityForComplexity(complexity: string): Priority {
    switch (complexity) {
      case 'simple':
        return 'LOW';
      case 'complex':
        return 'HIGH';
      default:
        return 'MEDIUM';
    }
  }
  
  /**
   * Generate solution (reuse from original agent)
   */
  async generateSolution(ticketId: string): Promise<string> {
    await this.initializeModel();
    
    try {
      const ticket = await prisma.ticket.findUnique({
        where: { id: ticketId },
        include: { category: true }
      });
      
      if (!ticket) {
        throw new Error(`Ticket ${ticketId} not found`);
      }
      
      const formattedMessages = await SOLUTION_GENERATOR_PROMPT.formatMessages({
        title: ticket.title,
        description: ticket.description,
        device: ticket.device || 'Ei määritelty',
        category: ticket.category.name,
      });
      
      const response = await this.model!.invoke(formattedMessages, {
        callbacks: [createTokenCallback({
          agentType: 'generator',
          modelUsed: this.currentModelName!,
          ticketId,
          requestType: 'generate_solution'
        })]
      });
      
      return response.content.toString();
    } catch (error) {
      logger.error('❌ [ModernTicketGenerator] Error generating solution:', error);
      return "Ratkaisun luominen epäonnistui.";
    }
  }
  
  /**
   * Generate solution for preview
   */
  async generateSolutionForPreview(data: {
    title: string;
    description: string;
    device?: string;
    categoryId: string;
    userId?: string;
  }): Promise<string> {
    await this.initializeModel();
    
    try {
      const category = await prisma.category.findUnique({
        where: { id: data.categoryId },
      });

      if (!category) {
        throw new Error(`Category with ID ${data.categoryId} not found`);
      }

      const formattedMessages = await SOLUTION_GENERATOR_PROMPT.formatMessages({
        title: data.title,
        description: data.description,
        device: data.device || 'Ei määritelty',
        category: category.name,
      });
      
      const response = await this.model!.invoke(formattedMessages, {
        callbacks: [createTokenCallback({
          agentType: 'generator',
          modelUsed: this.currentModelName!,
          requestType: 'generate_solution_preview',
          userId: data.userId
        })]
      });
      
      return response.content.toString();
    } catch (error) {
      logger.error('❌ [ModernTicketGenerator] Error generating solution preview:', error);
      return "Ratkaisun esikatselun luominen epäonnistui.";
    }
  }
}

// Create singleton instance
export const modernTicketGenerator = new ModernTicketGeneratorAgent();