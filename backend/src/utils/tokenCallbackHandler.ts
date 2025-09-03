import { BaseCallbackHandler } from "@langchain/core/callbacks/base";
import { LLMResult } from "@langchain/core/outputs";
import { tokenTrackingService } from "../services/tokenTrackingService.js";
import logger from "./logger.js";

interface TokenCallbackOptions {
  agentType: 'chat' | 'support' | 'generator' | 'summarizer';
  modelUsed: string;
  ticketId?: string;
  userId?: string;
  requestType?: string;
}

export class TokenTrackingCallbackHandler extends BaseCallbackHandler {
  name = "TokenTrackingCallbackHandler";
  private options: TokenCallbackOptions;
  private startTime: number;
  private promptTokens: number = 0;
  private completionTokens: number = 0;
  private totalTokens: number = 0;
  private success: boolean = true;
  private errorMessage?: string;

  constructor(options: TokenCallbackOptions) {
    super();
    this.options = options;
    this.startTime = Date.now();
  }

  async handleLLMStart() {
    this.startTime = Date.now();
    logger.debug(`🚀 [TokenCallback] LLM started for ${this.options.agentType}`);
  }

  async handleLLMEnd(output: LLMResult) {
    const responseTime = (Date.now() - this.startTime) / 1000;
    
    // Extract token usage from different possible locations
    let tokenUsage: any = null;

    // Check for usage_metadata (newer format)
    if (output.generations?.[0]?.[0]?.generationInfo?.usage_metadata) {
      tokenUsage = output.generations[0][0].generationInfo.usage_metadata;
      this.promptTokens = tokenUsage.input_tokens || tokenUsage.prompt_tokens || 0;
      this.completionTokens = tokenUsage.output_tokens || tokenUsage.completion_tokens || 0;
      this.totalTokens = tokenUsage.total_tokens || (this.promptTokens + this.completionTokens);
    }
    // Check for response_metadata.tokenUsage (OpenAI format)
    else if (output.generations?.[0]?.[0]?.generationInfo?.response_metadata?.tokenUsage) {
      tokenUsage = output.generations[0][0].generationInfo.response_metadata.tokenUsage;
      this.promptTokens = tokenUsage.promptTokens || 0;
      this.completionTokens = tokenUsage.completionTokens || 0;
      this.totalTokens = tokenUsage.totalTokens || (this.promptTokens + this.completionTokens);
    }
    // Check for llmOutput (legacy format)
    else if (output.llmOutput?.tokenUsage) {
      tokenUsage = output.llmOutput.tokenUsage;
      this.promptTokens = tokenUsage.promptTokens || 0;
      this.completionTokens = tokenUsage.completionTokens || 0;
      this.totalTokens = tokenUsage.totalTokens || (this.promptTokens + this.completionTokens);
    }
    // Check for direct usage in llmOutput
    else if (output.llmOutput?.usage) {
      tokenUsage = output.llmOutput.usage;
      this.promptTokens = tokenUsage.prompt_tokens || 0;
      this.completionTokens = tokenUsage.completion_tokens || 0;
      this.totalTokens = tokenUsage.total_tokens || (this.promptTokens + this.completionTokens);
    }

    // If we found token usage, track it
    if (tokenUsage && this.totalTokens > 0) {
      await tokenTrackingService.trackTokenUsage({
        agentType: this.options.agentType,
        modelUsed: this.options.modelUsed,
        promptTokens: this.promptTokens,
        completionTokens: this.completionTokens,
        totalTokens: this.totalTokens,
        ticketId: this.options.ticketId,
        userId: this.options.userId,
        requestType: this.options.requestType,
        success: this.success,
        errorMessage: this.errorMessage,
        responseTime
      });

      logger.info(`📊 [TokenCallback] Token usage tracked:`, {
        agent: this.options.agentType,
        model: this.options.modelUsed,
        tokens: {
          prompt: this.promptTokens,
          completion: this.completionTokens,
          total: this.totalTokens
        },
        responseTime: `${responseTime.toFixed(2)}s`
      });
    } else {
      logger.warn(`⚠️ [TokenCallback] No token usage data found for ${this.options.agentType}`);
    }
  }

  async handleLLMError(err: Error) {
    this.success = false;
    this.errorMessage = err.message;
    const responseTime = (Date.now() - this.startTime) / 1000;
    
    // Track the failed request
    await tokenTrackingService.trackTokenUsage({
      agentType: this.options.agentType,
      modelUsed: this.options.modelUsed,
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
      ticketId: this.options.ticketId,
      userId: this.options.userId,
      requestType: this.options.requestType,
      success: false,
      errorMessage: err.message,
      responseTime
    });

    logger.error(`❌ [TokenCallback] LLM error for ${this.options.agentType}:`, err);
  }
}

/**
 * Helper function to create a token tracking callback
 */
export function createTokenCallback(options: TokenCallbackOptions): TokenTrackingCallbackHandler {
  return new TokenTrackingCallbackHandler(options);
}