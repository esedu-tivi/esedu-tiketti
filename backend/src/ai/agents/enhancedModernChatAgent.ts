import { ChatOpenAI } from "@langchain/openai";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import logger from '../../utils/logger.js';
import { AI_CONFIG } from "../config.js";
import { aiSettingsService } from '../../services/aiSettingsService.js';
import { createTokenCallback } from '../../utils/tokenCallbackHandler.js';

// Writing styles from ModernTicketGeneratorAgent
type WritingStyle = 'panic' | 'confused' | 'frustrated' | 'polite' | 'brief';
type TechnicalLevel = 'beginner' | 'intermediate' | 'advanced';

// Technical configuration matching ModernTicketGeneratorAgent
const TECHNICAL_CONFIGS = {
  beginner: {
    maxTerms: 1,
    maxLength: 150,
    triedSteps: [0, 1],
    vagueness: 'high',
    structure: 'chaotic',
    vocabulary: ['netti', 'kone', 'ohjelma', 'salasana', 'tiedosto'],
    avoidTerms: ['IP', 'DNS', 'DHCP', 'port', 'protokolla', 'cache', 'registry']
  },
  intermediate: {
    maxTerms: 3,
    maxLength: 250,
    triedSteps: [1, 3],
    vagueness: 'medium',
    structure: 'semi-organized',
    vocabulary: ['WiFi', 'verkko', 'yhteys', 'asetukset', 'päivitys', 'virhe'],
    avoidTerms: ['TCP/IP', 'subnet', 'gateway', 'packet loss']
  },
  advanced: {
    maxTerms: 10,
    maxLength: 400,
    triedSteps: [3, 5],
    vagueness: 'low',
    structure: 'organized',
    vocabulary: ['DNS', 'DHCP', 'IP-osoite', 'portti', 'palomuuri', 'protokolla', 'välimuisti'],
    avoidTerms: [] // Can use any technical terms
  }
};

// Structured output schema with writing style
const EnhancedChatResponseSchema = z.object({
  evaluation: z.enum(["EARLY", "PROGRESSING", "CLOSE", "SOLVED"]).describe(
    "How close the support agent is to solving the problem"
  ),
  reasoning: z.string().describe(
    "Internal reasoning about the current situation (not shown to user)"
  ),
  response: z.string().describe(
    "The user's response to the support agent"
  ),
  emotionalState: z.enum(["frustrated", "hopeful", "excited", "satisfied", "confused"]).describe(
    "User's current emotional state based on progress"
  ),
  hintGiven: z.boolean().describe(
    "Whether a hint was included in the response (set to true when instructed to give hint)"
  ),
  writingStyle: z.enum(["panic", "confused", "frustrated", "polite", "brief"]).describe(
    "The writing style used in the response"
  )
});

type EnhancedChatResponse = z.infer<typeof EnhancedChatResponseSchema>;

interface TicketContext {
  title: string;
  description: string;
  device?: string;
  category: string;
  additionalInfo?: string;
  solution: string;
  userProfile: {
    name: string;
    role: "student" | "teacher" | "staff";
    technicalLevel: "beginner" | "intermediate" | "advanced";
  };
  // New field for style persistence
  initialWritingStyle?: WritingStyle;
}

interface ConversationTurn {
  role: "support" | "user";
  content: string;
  timestamp: Date;
}

interface HintInstruction {
  giveHint: boolean;
  hintType?: 'EARLY' | 'PROGRESSING' | 'CLOSE';
  hintNumber?: number;
  stuckDuration?: number;
}

/**
 * Enhanced Modern Chat Agent that syncs with ModernTicketGeneratorAgent
 * Maintains consistent writing style and technical level throughout conversation
 */
export class EnhancedModernChatAgent {
  protected model: ChatOpenAI | null = null;
  private currentModelName: string | null = null;
  
  constructor() {
    logger.info('🚀✨ [EnhancedModernChatAgent] Created - syncs with ModernTicketGenerator');
  }
  
  private async initializeModel(): Promise<void> {
    const modelName = await aiSettingsService.getModelForAgent('chat');
    
    if (this.model && this.currentModelName === modelName) {
      return;
    }
    
    logger.info('🔄✨ [EnhancedModernChatAgent] Initializing model', { 
      modelName,
      feature: 'Writing style and technical level sync'
    });
    
    this.model = new ChatOpenAI({
      openAIApiKey: AI_CONFIG.openai.apiKey,
      model: modelName,
      cache: true,
    });
    this.currentModelName = modelName;
  }
  
  /**
   * Detect writing style from ticket description
   */
  private detectWritingStyle(description: string): WritingStyle {
    const lower = description.toLowerCase();
    
    // Panic indicators
    if (lower.includes('!!!') || lower.includes('apua') || lower.includes('heti') || 
        lower.includes('kiire') || /[A-Z]{5,}/.test(description)) {
      return 'panic';
    }
    
    // Confused indicators
    if (lower.includes('?') && (lower.includes('en tiedä') || lower.includes('en ymmärrä') || 
        lower.includes('mikä'))) {
      return 'confused';
    }
    
    // Frustrated indicators
    if (lower.includes('taas') || lower.includes('edelleen') || lower.includes('sama ongelma') ||
        lower.includes('ei toimi')) {
      return 'frustrated';
    }
    
    // Polite indicators
    if (lower.includes('hei') || lower.includes('kiitos') || lower.includes('voisitte') ||
        lower.includes('ystävällisesti')) {
      return 'polite';
    }
    
    // Brief - if very short
    if (description.length < 100) {
      return 'brief';
    }
    
    // Default based on length
    return description.length < 150 ? 'brief' : 'confused';
  }
  
  /**
   * Get dynamic technical level based on user profile (matching ModernTicketGenerator logic)
   */
  private getDynamicTechnicalLevel(userProfile: string): TechnicalLevel {
    switch (userProfile) {
      case 'student':
        return Math.random() > 0.7 ? 'intermediate' : 'beginner';
      case 'teacher':
        return Math.random() > 0.8 ? 'advanced' : 'intermediate';
      case 'staff':
        const rand = Math.random();
        return rand > 0.6 ? 'intermediate' : rand > 0.3 ? 'beginner' : 'advanced';
      case 'administrator':
        return 'advanced';
      default:
        return 'intermediate';
    }
  }
  
  /**
   * Build style-specific instructions
   */
  private getStyleInstructions(style: WritingStyle): string {
    switch (style) {
      case 'panic':
        return `
WRITING STYLE - PANIC:
- Express urgency but stay somewhat coherent
- Use 1-2 exclamation marks maximum per message
- Occasional emphasis with caps (one word, not whole sentences)
- Show stress but still try to answer questions
- Examples: "Apua! Netti ei toimi enkä tiedä mitä teen!", "Tää pitää saada HETI toimimaan!"`;

      case 'confused':
        return `
WRITING STYLE - CONFUSED:
- Use question marks but not excessively (1 per question)
- Express genuine confusion and uncertainty
- Include phrases like "en tiedä", "en ymmärrä", "ehkä"
- Ask for clarification when given instructions
- Examples: "En ymmärrä mikä tässä on vialla. Mitä tarkoitat reitittimellä?", "Kokeilin mutta en ole varma teinko oikein"`;

      case 'frustrated':
        return `
WRITING STYLE - FRUSTRATED:
- Express annoyance but remain civil
- Mention if problem is recurring
- Use words like "taas", "edelleen", "jatkuvasti"
- Show impatience but still cooperative
- Examples: "Tämä sama ongelma on ollut jo kolme päivää", "Kokeilin tuon mutta ei edelleenkään toimi"`;

      case 'polite':
        return `
WRITING STYLE - POLITE:
- Use formal greetings and thanks
- Include "kiitos", "hei", "voisitteko"
- Respectful and courteous tone
- Complete sentences with proper grammar
- Examples: "Hei! Voisitteko ystävällisesti auttaa?", "Kiitos avustanne"`;

      case 'brief':
        return `
WRITING STYLE - BRIEF:
- Maximum 1-2 sentences
- No elaboration or details
- Direct and to the point
- Minimal words
- Examples: "Ei toimi.", "Mitä teen?", "Ok."`;
    }
  }
  
  /**
   * Build technical level instructions
   */
  private getTechnicalInstructions(level: TechnicalLevel): string {
    const config = TECHNICAL_CONFIGS[level];
    
    return `
TECHNICAL LEVEL - ${level.toUpperCase()}:
- Maximum technical terms: ${config.maxTerms}
- Response length: max ${config.maxLength} characters
- Vagueness: ${config.vagueness}
- Structure: ${config.structure}
- Can use terms: ${config.vocabulary.join(', ')}
- MUST AVOID: ${config.avoidTerms.join(', ') || 'none'}
${level === 'beginner' ? '- Be VERY vague: "netti ei toimi", "kone on rikki"\n- Focus on what you CANNOT DO, not technical details' : ''}
${level === 'intermediate' ? '- Can use basic terms but sometimes incorrectly\n- Mix correct and incorrect understanding' : ''}
${level === 'advanced' ? '- Use technical terms appropriately\n- Can describe detailed symptoms\n- Reference specific error codes or logs' : ''}`;
  }
  
  /**
   * Build hint instructions matching the technical level
   */
  private getHintInstructions(
    hintInstruction: HintInstruction | undefined,
    technicalLevel: TechnicalLevel
  ): string {
    if (!hintInstruction?.giveHint) {
      return '\n\nDO NOT provide any hints or guidance about the solution.';
    }
    
    const hintNumber = hintInstruction.hintNumber || 1;
    const stuckDuration = hintInstruction.stuckDuration || 0;
    
    let hintGranularity: string;
    
    switch (hintInstruction.hintType) {
      case 'EARLY':
        if (hintNumber === 1) {
          hintGranularity = technicalLevel === 'beginner' 
            ? 'Mention you might have tried something but not sure what'
            : 'Vaguely mention trying "something with settings"';
        } else if (hintNumber === 2) {
          hintGranularity = technicalLevel === 'beginner'
            ? 'Say you clicked on something that looked important'
            : 'Mention you found some menu but got confused';
        } else {
          hintGranularity = technicalLevel === 'beginner'
            ? 'Express that you saw something about the problem area'
            : 'Indicate you noticed something relevant to the issue';
        }
        break;
        
      case 'PROGRESSING':
        if (hintNumber === 1) {
          hintGranularity = technicalLevel === 'beginner'
            ? 'Say it seems to be working a bit better'
            : 'Mention partial improvement';
        } else {
          hintGranularity = 'Indicate you understand better now';
        }
        break;
        
      case 'CLOSE':
        hintGranularity = 'Show excitement that it might be fixed';
        break;
        
      default:
        hintGranularity = 'Provide minimal acknowledgment';
    }
    
    return `
HINT INSTRUCTION:
You MUST subtly reveal that you discovered something.
Stuck for ${stuckDuration} evaluations at ${hintInstruction.hintType} stage.
This is hint #${hintNumber}.
Granularity: ${hintGranularity}
IMPORTANT: Set hintGiven to true in your response.`;
  }
  
  public async respond(
    ticket: TicketContext,
    conversation: ConversationTurn[],
    supportMessage: string,
    hintInstruction?: HintInstruction,
    supportUserId?: string,
    ticketId?: string
  ): Promise<EnhancedChatResponse> {
    await this.initializeModel();
    
    if (!this.model) {
      throw new Error('Model not initialized');
    }
    
    // Detect or use provided writing style
    const writingStyle = ticket.initialWritingStyle || this.detectWritingStyle(ticket.description);
    
    // Use the actual technical level from ticket or determine dynamically
    const technicalLevel = ticket.userProfile.technicalLevel;
    
    logger.info('🎨✨ [EnhancedModernChatAgent] Style and level detection:', {
      writingStyle,
      technicalLevel,
      ticketId,
      hasInitialStyle: !!ticket.initialWritingStyle
    });
    
    // Build the prompt with style and technical instructions
    const systemPrompt = `You are simulating a ${ticket.userProfile.role} named ${ticket.userProfile.name} who has submitted an IT support ticket.

TICKET CONTEXT:
- Title: ${ticket.title}
- Description: ${ticket.description}
- Device: ${ticket.device || 'Not specified'}
- Category: ${ticket.category}
- Additional Info: ${ticket.additionalInfo || 'None'}

${this.getStyleInstructions(writingStyle)}

${this.getTechnicalInstructions(technicalLevel)}

CONVERSATION RULES:
1. Stay in character as the ticket creator throughout
2. Maintain consistent writing style (${writingStyle}) but keep responses readable
3. Maintain consistent technical level (${technicalLevel})
4. React realistically to support suggestions - try to follow instructions
5. Your goal is to get your problem solved, so cooperate with support
6. Show appropriate emotional responses but don't overdo it
7. Keep responses conversational and human-like, not theatrical

EVALUATION STAGES:
- EARLY: Still far from solution, confused about the problem
- PROGRESSING: Starting to understand, making some progress
- CLOSE: Almost there, just minor issues remaining
- SOLVED: Problem is completely resolved

${this.getHintInstructions(hintInstruction, technicalLevel)}

IMPORTANT: 
- Response must be in Finnish
- Stay within character limits (${TECHNICAL_CONFIGS[technicalLevel].maxLength} chars)
- Match the writing style consistently
- Set writingStyle to "${writingStyle}" in your response`;

    const conversationHistory = conversation.map(turn => 
      `${turn.role === 'support' ? 'Support' : 'You'}: ${turn.content}`
    ).join('\n');
    
    const userPrompt = `Conversation so far:
${conversationHistory}

Support agent just said: "${supportMessage}"

Respond as the ${ticket.userProfile.role} maintaining your ${writingStyle} style and ${technicalLevel} technical level.`;

    try {
      // Create token callback
      const tokenCallback = createTokenCallback({
        agentType: 'chat',
        modelUsed: this.currentModelName || 'unknown',
        ticketId: ticketId || undefined,
        userId: supportUserId || undefined,
        requestType: 'enhanced_chat_response'
      });
      
      // Call with structured output
      const structuredModel = this.model.withStructuredOutput(
        zodToJsonSchema(EnhancedChatResponseSchema),
        { 
          name: "enhanced_chat_response",
          strict: true
        }
      );
      
      const result = await structuredModel.invoke(
        [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        {
          callbacks: tokenCallback ? [tokenCallback] : undefined
        }
      );
      
      const response = result as EnhancedChatResponse;
      
      logger.info('✨ [EnhancedModernChatAgent] Response generated:', {
        evaluation: response.evaluation,
        emotionalState: response.emotionalState,
        writingStyle: response.writingStyle,
        responseLength: response.response.length,
        hintGiven: response.hintGiven,
        ticketId
      });
      
      return response;
      
    } catch (error) {
      logger.error('❌✨ [EnhancedModernChatAgent] Generation failed:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const enhancedModernChatAgent = new EnhancedModernChatAgent();