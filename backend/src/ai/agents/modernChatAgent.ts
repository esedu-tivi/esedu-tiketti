import { ChatOpenAI } from "@langchain/openai";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import logger from '../../utils/logger.js';
import { AI_CONFIG } from "../config.js";

// Structured output schema - single source of truth
const ChatResponseSchema = z.object({
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
  shouldRevealHint: z.boolean().describe(
    "Whether to subtly hint at the right direction"
  )
});

type ChatResponse = z.infer<typeof ChatResponseSchema>;

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
}

interface ConversationTurn {
  role: "support" | "user";
  content: string;
  timestamp: Date;
}

/**
 * Modern Chat Agent using structured outputs and single LLM call
 * Simulates realistic user behavior in IT support training scenarios
 * 
 * IMPORTANT: No caching of prompts or responses - each ticket is unique
 */
export class ModernChatAgent {
  protected model: ChatOpenAI;
  
  constructor() {
    // Initialize model with ONLY OpenAI's built-in deduplication
    this.model = new ChatOpenAI({
      openAIApiKey: AI_CONFIG.openai.apiKey,
      modelName: "gpt-4.1",
      cache: true, // OpenAI's deduplication for exact duplicate requests only
    });
    
    logger.info('🚀 [ModernChatAgent] Initialized:', {
      model: 'gpt-4.1',
      caching: 'DISABLED - Each ticket gets unique prompt and response',
      note: 'Only OpenAI deduplication for exact duplicates'
    });
  }

  /**
   * Generate a complete response with evaluation in a single LLM call
   */
  async respond(
    ticketContext: TicketContext,
    conversationHistory: ConversationTurn[],
    latestSupportMessage: string,
    forceHint: boolean = false
  ): Promise<ChatResponse> {
    logger.info('🤖 [ModernChatAgent] Starting response generation');
    logger.info('📋 [ModernChatAgent] Ticket context:', JSON.stringify({
      title: ticketContext.title,
      category: ticketContext.category,
      userProfile: ticketContext.userProfile,
      conversationLength: conversationHistory.length,
      solutionProvided: !!ticketContext.solution
    }, null, 2));
    
    // Build fresh system prompt for each ticket (contains unique ticket data)
    const systemPrompt = this.buildSystemPrompt(ticketContext);
    const conversationContext = this.formatConversation(conversationHistory);
    
    logger.info(`💬 [ModernChatAgent] Latest support message: "${latestSupportMessage}"`);
    logger.info(`📝 [ModernChatAgent] System prompt length: ${systemPrompt.length} characters`);
    logger.info('🔄 [ModernChatAgent] Conversation history:', JSON.stringify({
      turns: conversationHistory.length,
      lastTurn: conversationHistory[conversationHistory.length - 1]?.content?.substring(0, 100) + '...'
    }, null, 2));
    
    try {
      logger.info('🚀 [ModernChatAgent] Invoking LLM for FRESH response (no response caching)...');
      const startTime = Date.now();
      
      // ALWAYS get fresh response - NEVER cache the actual response
      const response = await this.model.invoke(
        [
          { role: "system", content: systemPrompt },
          { role: "user", content: `
Previous conversation:
${conversationContext}

Latest support message: "${latestSupportMessage}"

Based on the ticket context and solution, evaluate the progress and respond as the user would.
Remember: You are ${ticketContext.userProfile.name}, a ${ticketContext.userProfile.role} with ${ticketContext.userProfile.technicalLevel} technical skills.
${forceHint ? '\nIMPORTANT: The support has been stuck for multiple turns. Include subtle hints about the solution in your response to guide them in the right direction.' : ''}
          `}
        ],
        {
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "chat_response",
              schema: zodToJsonSchema(ChatResponseSchema),
              strict: true
            }
          }
        }
      );

      const responseTime = Date.now() - startTime;
      logger.info(`⏱️ [ModernChatAgent] LLM response received in ${responseTime}ms`);
      
      logger.info('📦 [ModernChatAgent] Raw LLM response:', JSON.stringify({
        contentLength: (response.content as string).length,
        preview: (response.content as string).substring(0, 200) + '...'
      }, null, 2));

      const parsed = ChatResponseSchema.parse(JSON.parse(response.content as string));
      
      logger.info('✅ [ModernChatAgent] Parsed response successfully:', JSON.stringify({
        evaluation: parsed.evaluation,
        emotionalState: parsed.emotionalState,
        shouldRevealHint: parsed.shouldRevealHint,
        reasoningLength: parsed.reasoning.length,
        responseLength: parsed.response.length
      }, null, 2));
      
      logger.info(`🎯 [ModernChatAgent] Evaluation result: ${parsed.evaluation}`);
      logger.info(`😊 [ModernChatAgent] Emotional state: ${parsed.emotionalState}`);
      logger.info(`💡 [ModernChatAgent] Reasoning: ${parsed.reasoning}`);
      logger.info(`💬 [ModernChatAgent] User response: ${parsed.response}`);

      return parsed;
    } catch (error) {
      logger.error('❌ [ModernChatAgent] Error during response generation:', error);
      logger.error('🔍 [ModernChatAgent] Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      
      // Fallback response
      const fallback = {
        evaluation: "EARLY" as const,
        reasoning: "Error occurred, providing fallback response",
        response: "Anteeksi, en saanut selvää viestistäsi. Voisitko selittää uudelleen?",
        emotionalState: "confused" as const,
        shouldRevealHint: false
      };
      
      logger.info('🔄 [ModernChatAgent] Using fallback response:', fallback);
      return fallback;
    }
  }

  /**
   * Build a clean, focused system prompt
   */
  private buildSystemPrompt(context: TicketContext): string {
    return `You are simulating a user named ${context.userProfile.name} who has submitted an IT support ticket.

TICKET DETAILS:
- Title: ${context.title}
- Description: ${context.description}
- Device: ${context.device || "Not specified"}
- Category: ${context.category}
- Additional Info: ${context.additionalInfo || "None"}

YOUR PERSONA:
- Name: ${context.userProfile.name}
- Role: ${context.userProfile.role}
- Technical Level: ${context.userProfile.technicalLevel}

THE ACTUAL SOLUTION (DO NOT REVEAL DIRECTLY):
${context.solution}

YOUR TASK:
1. EVALUATE how close the support agent is to solving the problem:
   - EARLY: Far from solution, generic suggestions
   - PROGRESSING: Right area identified, but lacks specifics
   - CLOSE: Almost there, missing minor details
   - SOLVED: Has provided the key solution

2. RESPOND as the user would based on:
   - Your technical level (${context.userProfile.technicalLevel})
   - The progress evaluation
   - Natural frustration/excitement progression
   - Finnish language, casual tone

3. REASONING should explain your evaluation logic (this is internal, not shown to user)

4. EMOTIONAL STATE should reflect realistic user emotions:
   - frustrated: Problem persists, no progress
   - confused: Unclear instructions
   - hopeful: Some progress made
   - excited: Close to solution
   - satisfied: Problem solved

5. HINT REVEALING: Set to true only if:
   - Support is stuck in EARLY for 3+ turns
   - User would naturally provide more specific details

WHEN shouldRevealHint IS TRUE:
   - Include subtle hints about the actual problem in your response
   - Mention specific symptoms or details from the solution
   - Guide toward the right area without giving away the answer
   - Example: "Hmm, ongelma tuntuu liittyvän [specific area from solution]..."
   - Example: "Olen huomannut että [specific symptom from solution]..."

RESPONSE GUIDELINES BY EVALUATION:

EARLY:
- Be confused and frustrated
- Ask for more specific help
- Mention that the problem persists
- Response: 2-4 sentences

PROGRESSING:
- Show cautious optimism
- Report that you tried but issue continues
- Ask for clarification or next steps
- Response: 2-4 sentences

CLOSE:
- Be excited and interested
- Ask about specific missing details
- Express that it seems promising
- Response: 3-5 sentences

SOLVED:
- Express relief and gratitude
- Confirm the solution worked
- Briefly describe how it helped
- Thank concretely
- Response: 4-6 sentences
- Example: "Jes, nyt toimii! Tein juuri antamiesi ohjeiden mukaan ja [ongelma] ratkesi. Kiitos todella paljon avusta!"

Remember: You're a real person with a real problem, not an AI. Be natural, show appropriate emotions, and guide the conversation realistically. Always respond in Finnish.`;
  }

  /**
   * Format conversation history concisely
   */
  protected formatConversation(history: ConversationTurn[]): string {
    return history
      .map(turn => `[${turn.role}]: ${turn.content}`)
      .join('\n');
  }
}


// State Machine for conversation flow
export class ConversationStateMachine {
  private state: "initial" | "diagnosing" | "attempting" | "verifying" | "resolved" = "initial";
  private turnCount: number = 0;
  private stuckCounter: number = 0;
  private progressCounter: number = 0;
  private closeCounter: number = 0;
  private hintsGiven: number = 0;
  private lastHintTurn: number = 0;
  
  transition(evaluation: ChatResponse["evaluation"]): void {
    const previousState = this.state;
    this.turnCount++;
    
    logger.info('🔄 [StateMachine] Transition called:', JSON.stringify({
      previousState,
      evaluation,
      turnCount: this.turnCount,
      stuckCounter: this.stuckCounter,
      progressCounter: this.progressCounter,
      closeCounter: this.closeCounter,
      hintsGiven: this.hintsGiven
    }, null, 2));
    
    // Handle counters based on evaluation
    if (evaluation === "EARLY") {
      this.stuckCounter++;
      this.progressCounter = 0; // Reset other counters
      this.closeCounter = 0;
      logger.info(`📈 [StateMachine] EARLY counter increased to ${this.stuckCounter}`);
    } else if (evaluation === "PROGRESSING") {
      this.progressCounter++;
      this.stuckCounter = 0; // Reset other counters
      this.closeCounter = 0;
      logger.info(`📊 [StateMachine] PROGRESSING counter increased to ${this.progressCounter}`);
    } else if (evaluation === "CLOSE") {
      this.closeCounter++;
      this.stuckCounter = 0; // Reset other counters
      this.progressCounter = 0;
      logger.info(`🎯 [StateMachine] CLOSE counter increased to ${this.closeCounter}`);
    } else {
      // SOLVED - reset all counters
      if (this.stuckCounter > 0 || this.progressCounter > 0 || this.closeCounter > 0) {
        logger.info(`✅ [StateMachine] SOLVED - resetting all counters`);
      }
      this.stuckCounter = 0;
      this.progressCounter = 0;
      this.closeCounter = 0;
    }
    
    // State transitions based on evaluation
    switch (this.state) {
      case "initial":
        if (evaluation === "PROGRESSING" || evaluation === "CLOSE") {
          this.state = "diagnosing";
          logger.info('➡️ [StateMachine] Moved from initial to diagnosing');
        } else if (evaluation === "SOLVED") {
          this.state = "verifying";
          logger.info('🚀 [StateMachine] Jumped from initial to verifying (quick solution!)');
        }
        break;
        
      case "diagnosing":
        if (evaluation === "CLOSE") {
          this.state = "attempting";
          logger.info('➡️ [StateMachine] Moved from diagnosing to attempting');
        } else if (evaluation === "SOLVED") {
          this.state = "verifying";
          logger.info('➡️ [StateMachine] Moved from diagnosing to verifying');
        } else if (evaluation === "EARLY" && this.turnCount > 5) {
          // Regression - going backwards
          this.state = "initial";
          logger.info('⬅️ [StateMachine] Regressed from diagnosing back to initial');
        }
        break;
        
      case "attempting":
        if (evaluation === "SOLVED") {
          this.state = "verifying";
          logger.info('➡️ [StateMachine] Moved from attempting to verifying');
        } else if (evaluation === "EARLY") {
          this.state = "diagnosing";
          logger.info('⬅️ [StateMachine] Regressed from attempting back to diagnosing');
        }
        break;
        
      case "verifying":
        if (evaluation === "SOLVED") {
          this.state = "resolved";
          logger.info('✅ [StateMachine] Moved to resolved state - conversation complete!');
        } else {
          this.state = "attempting";
          logger.info('⬅️ [StateMachine] Solution not confirmed, back to attempting');
        }
        break;
        
      case "resolved":
        logger.info('🎉 [StateMachine] Already resolved, no state change needed');
        break;
    }
    
    if (this.state !== previousState) {
      logger.info('📊 [StateMachine] State changed:', {
        from: previousState,
        to: this.state,
        turnCount: this.turnCount
      });
    }
  }
  
  shouldProvideHint(settings?: {
    enabled: boolean;
    earlyThreshold: number;
    progressThreshold: number | null;
    closeThreshold: number | null;
    cooldownTurns: number;
    maxHints: number;
  }): boolean {
    // Default settings if not provided
    const config = settings || {
      enabled: true,
      earlyThreshold: 3,
      progressThreshold: null,
      closeThreshold: null,
      cooldownTurns: 0,
      maxHints: 999
    };

    // Check if hint system is disabled
    if (!config.enabled) {
      return false;
    }

    // Check if we've exceeded max hints
    if (this.hintsGiven >= config.maxHints) {
      logger.info(`🚫 [StateMachine] Max hints reached (${this.hintsGiven}/${config.maxHints})`);
      return false;
    }

    // Check cooldown period
    if (this.lastHintTurn > 0 && (this.turnCount - this.lastHintTurn) < config.cooldownTurns) {
      logger.info(`⏳ [StateMachine] Hint on cooldown (${this.turnCount - this.lastHintTurn}/${config.cooldownTurns} turns)`);
      return false;
    }

    // Check thresholds based on current counters
    let shouldHint = false;
    
    if (this.stuckCounter >= config.earlyThreshold) {
      logger.info(`💡 [StateMachine] Hint triggered by EARLY threshold (${this.stuckCounter}/${config.earlyThreshold})`);
      shouldHint = true;
    } else if (config.progressThreshold && this.progressCounter >= config.progressThreshold) {
      logger.info(`💡 [StateMachine] Hint triggered by PROGRESSING threshold (${this.progressCounter}/${config.progressThreshold})`);
      shouldHint = true;
    } else if (config.closeThreshold && this.closeCounter >= config.closeThreshold) {
      logger.info(`💡 [StateMachine] Hint triggered by CLOSE threshold (${this.closeCounter}/${config.closeThreshold})`);
      shouldHint = true;
    }

    if (shouldHint) {
      this.hintsGiven++;
      this.lastHintTurn = this.turnCount;
      logger.info(`✅ [StateMachine] Hint #${this.hintsGiven} will be provided`);
    }
    
    return shouldHint;
  }
  
  // Getters for state info
  getState(): string {
    return this.state;
  }
  
  getStuckCounter(): number {
    return this.stuckCounter;
  }
  
  getTurnCount(): number {
    return this.turnCount;
  }
  
  getResponseGuidance(): {
    minLength: number;
    maxLength: number;
    shouldAskClarification: boolean;
    emotionalIntensity: "low" | "medium" | "high";
  } {
    return {
      minLength: this.state === "resolved" ? 4 : 2,
      maxLength: this.state === "resolved" ? 6 : 4,
      shouldAskClarification: this.state === "diagnosing",
      emotionalIntensity: this.stuckCounter > 2 ? "high" : "medium"
    };
  }
}


// Export singleton instance
export const modernChatAgent = new ModernChatAgent();