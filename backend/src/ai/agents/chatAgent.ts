import { ChatOpenAI } from "@langchain/openai";
import logger from '../../utils/logger.js';
import CHAT_AGENT_PROMPT from "../prompts/chatAgentPrompt.js";
import { AI_CONFIG } from "../config.js";
import { aiSettingsService } from '../../services/aiSettingsService.js';
import { createTokenCallback } from '../../utils/tokenCallbackHandler.js';
import { prisma } from '../../lib/prisma.js';
import { PrismaClient } from '@prisma/client';
import { ChatPromptTemplate } from "@langchain/core/prompts";

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
}

/**
 * Interface for the parameters used to generate chat responses
 */
interface ChatResponseParams {
  ticket: {
    id: string;
    title: string;
    description: string;
    device: string;
    priority: string;
    categoryId: string;
    userProfile?: string;
    createdById: string;
    additionalInfo?: string;
  };
  comments: CommentData[];
  newSupportComment: string;
  supportUserId: string;
  solution?: string | null;
}

// Create progress evaluation prompt
const PROGRESS_EVALUATION_PROMPT = ChatPromptTemplate.fromTemplate(`
Tehtäväsi on arvioida, kuinka lähellä tukihenkilö on ongelman oikeaa ratkaisua.

ONGELMA JA KUVAUS:
Otsikko: {ticketTitle}
Kuvaus: {ticketDescription}
Laite: {deviceInfo}
Lisätiedot: {additionalInfo}

OIKEA RATKAISU ONGELMAAN:
{solution}

KESKUSTELUHISTORIA:
{conversationHistory}

TUKIHENKILÖN VIIMEISIN KOMMENTTI:
{supportComment}

OHJEET EDISTYMISEN ARVIOINTIIN:

1. EARLY (ei vielä lähellä ratkaisua):
   - Tukihenkilö ehdottaa yleisiä, yksinkertaisia toimenpiteitä
   - Ehdotukset ovat itsestään selviä, jotka käyttäjä on todennäköisesti jo kokeillut
   - Tukihenkilö ei tunnista varsinaista ongelmaa, vaan pyytää lisätietoja ilman konkreettisia ehdotuksia
   - Ehdotukset eivät liity ratkaisun keskeisiin toimenpiteisiin

2. PROGRESSING (edistymässä kohti ratkaisua):
   - Tukihenkilö on tunnistanut ongelman oikean alueen (esim. verkkoasetukset)
   - Ehdottaa toimia jotka liittyvät ratkaisuun, mutta eivät ole vielä täsmällisiä
   - Saattaa mainita joitain keskeisiä käsitteitä
   - Ei anna tarkkoja vaihe vaiheelta ohjeita tai puuttuu tärkeitä yksityiskohtia

3. CLOSE (lähellä ratkaisua):
   - Tukihenkilö on tunnistanut ongelman juurisyyn
   - Ehdottaa toimenpiteitä, jotka liittyvät keskeisesti ongelman ratkaisuun
   - Vastauksesta puuttuu vain joitain yksityiskohtia tai vaiheiden tarkkuutta
   - Tukihenkilö on menossa oikeaan suuntaan, vaikka termit tai yksityiskohdat eroaisivat hieman ratkaisusta

4. SOLVED (ratkaisu löydetty):
   - Tukihenkilö osoittaa KESKEISEN TOIMENPITEEN, joka ratkaisee ongelman
   - Ohjeissa on YDINKÄSITE tai -TOIMENPIDE, joka johtaisi ongelman ratkaisuun
   - Käyttäjä saisi riittävän tiedon ongelman ratkaisemiseksi, vaikka kaikki yksityiskohdat puuttuisivatkin
   - Tärkeintä on ratkaisevan toimenpiteen tunnistaminen, ei tarkkojen vaiheiden kuvaus
   - Jos tukihenkilö on jo aiemmin antanut keskeiset ohjeet ja nyt vain kysyy "toimiiko?" tai "auttoiko tämä?", tilanne on SOLVED

TÄRKEÄÄ: 
1. Ole ERITTÄIN JOUSTAVA arvioinnissasi. Todellinen tukitilanne ei vaadi täsmälleen tiettyjä sanoja tai järjestystä.
2. Keskity RATKAISUN YTIMEEN - onko tukihenkilö tunnistanut oikean ongelman ja ehdottaa järkeviä toimenpiteitä?
3. Moni tekninen ongelma voidaan ratkaista useammalla kuin yhdellä tavalla.
4. Tärkeintä on ratkaisun toimivuus käytännössä, ei se täsmääkö se täydellisesti ratkaisudokumentin kanssa.
5. Valitse SOLVED heti kun tukihenkilö on maininnut keskeisen ratkaisutoimen, vaikka ohje olisi lyhyt tai epätäydellinen.
6. Huomioi koko keskusteluhistoria: jos aiemmissa viesteissä on annettu oikeita ohjeita, ja nyt vain tarkistetaan tulosta, tilanne on SOLVED.
7. Tukihenkilön lyhyet kysymykset kuten "toimiiko?" tai "auttoiko?" viittaavat siihen, että ratkaisua on jo ehdotettu ja nyt seurataan sen onnistumista.

HUOMAA ERITYISESTI KESKUSTELUJEN DYNAMIIKKA:
- Jos tukihenkilö on jo aiemmin antanut oikean ohjeen (esim. "yhdistä tulostin verkkoon"), mutta käyttäjä kysyy lisätietoja, ja tukihenkilö vastaa siihen, pidä edistymisaste SOLVED.
- Lyhyet viestit kuten "toimiiko?", "auttoiko?", "onnistuiko?" tai "kokeile sitä" eivät tarkoita, että tukihenkilö ei tiedä ratkaisua, vaan että hän seuraa aiempien ohjeiden vaikutusta.

Arvioi keskustelun koko konteksti, ei vain viimeisintä kommenttia. Valitse edistymisaste, joka parhaiten kuvaa tukihenkilön tämänhetkistä ymmärrystä ongelmasta.

Vastaa VAIN yhdellä sanalla: EARLY, PROGRESSING, CLOSE tai SOLVED.
`);
logger.info(PROGRESS_EVALUATION_PROMPT);

// Define the return type for generateChatResponse
interface ChatAgentResponse {
  responseText: string;
  evaluation: string; // EARLY, PROGRESSING, CLOSE, SOLVED
}

/**
 * ChatAgent simulates a user with an IT problem in a conversation with support staff.
 * It provides realistic responses based on the ticket details and solution.
 */
export class ChatAgent {
  private model: ChatOpenAI | null = null;
  private currentModelName: string | null = null;
  
  constructor() {
    logger.info('ChatAgent: Created - model will be initialized on first use');
  }
  
  private async initializeModel(): Promise<void> {
    const modelName = await aiSettingsService.getModelForAgent('chat');
    
    // Check if model needs to be reinitialized due to settings change
    if (this.model && this.currentModelName === modelName) {
      return; // Model is already initialized with correct settings
    }
    
    // Initialize or reinitialize the model
    logger.info('ChatAgent: Initializing model', { 
      previousModel: this.currentModelName, 
      newModel: modelName,
      isReinitializing: !!this.model
    });
    
    this.model = new ChatOpenAI({
      openAIApiKey: AI_CONFIG.openai.apiKey,
      model: modelName,  // Use 'model' instead of deprecated 'modelName'
    });
    this.currentModelName = modelName;
    
    logger.info('ChatAgent: Model initialized:', { model: modelName });
  }

  /**
   * Generates a response to a support comment in a ticket conversation
   * This simulates how a real user would respond to troubleshooting instructions
   * Returns both the response text and the evaluation of support progress.
   */
  async generateChatResponse(params: ChatResponseParams): Promise<ChatAgentResponse> {
    // Ensure model is initialized
    await this.initializeModel();
    
    try {
      const { 
        ticket, 
        comments, 
        newSupportComment, 
        supportUserId,
        solution
      } = params;
      
      logger.info(`ChatAgent: Generating response for ticket: ${ticket.id}, to support comment by user: ${supportUserId}`);
      logger.info(`ChatAgent: Full ticket data:`, JSON.stringify({
        id: ticket.id,
        title: ticket.title,
        description: ticket.description,
        device: ticket.device,
        priority: ticket.priority,
        categoryId: ticket.categoryId, 
        userProfile: ticket.userProfile,
        additionalInfo: ticket.additionalInfo,
        commentCount: comments.length
      }, null, 2));
      
      // Add debug log for solution/knowledge article
      logger.info(`ChatAgent: Solution/Knowledge article provided: ${solution ? 'YES' : 'NO'}`);
      if (solution) {
        logger.info(`ChatAgent: Solution length: ${solution.length} characters`);
        logger.info(`ChatAgent: Solution preview: ${solution.substring(0, 150)}${solution.length > 150 ? '...' : ''}`);
      } else {
        logger.info(`ChatAgent: WARNING - No solution/knowledge article provided for ticket ${ticket.id}`);
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
        logger.info(`ChatAgent: AdditionalInfo not provided in params, fetching from database`);
        const fullTicket = await prisma.ticket.findUnique({
          where: { id: ticket.id }
        });
        
        if (fullTicket) {
          ticketAdditionalInfo = fullTicket.additionalInfo || '';
          logger.info(`ChatAgent: Found additionalInfo from database: ${ticketAdditionalInfo}`);
        }
      }
      
      // Get user name who created the ticket
      const ticketCreator = await prisma.user.findUnique({
        where: { id: ticket.createdById }
      });
      
      if (!ticketCreator) {
        throw new Error(`Creator not found for ticket ${ticket.id}`);
      }
      
      // Format conversation history for the prompt
      const conversationHistory = comments.map(comment => {
        const isSupport = comment.userId !== ticket.createdById;
        return {
          role: isSupport ? "support" : "user",
          name: isSupport ? "Support" : ticketCreator.name,
          content: comment.text,
          timestamp: comment.createdAt.toISOString()
        };
      });
      
      // Debug conversation history
      logger.info(`ChatAgent: Conversation history (${conversationHistory.length} messages):`);
      conversationHistory.forEach((msg, i) => {
        logger.info(`  ${i+1}. [${msg.role}] ${msg.name}: ${msg.content.substring(0, 50)}${msg.content.length > 50 ? '...' : ''}`);
      });
      
      // Get userProfile from params or use default
      // Since the Ticket model does not have a userProfile field directly in the database
      let userProfile = ticket.userProfile || 'student';
      logger.info(`ChatAgent: Using userProfile from params: ${userProfile}`);
      
      // Determine complexity from priority
      const complexity = 
        ticket.priority === 'LOW' ? 'simple' : 
        ticket.priority === 'MEDIUM' ? 'moderate' : 
        ticket.priority === 'HIGH' || ticket.priority === 'CRITICAL' ? 'complex' : 'moderate';
      
      logger.info(`ChatAgent: Ticket complexity determined as: ${complexity} based on priority: ${ticket.priority}`);
      
      // Map technical skill level based on complexity
      const technicalSkillLevel = 
        complexity === 'simple' ? 'vähäinen' : 
        complexity === 'moderate' ? 'keskitasoinen' : 
        'hyvä';
      
      logger.info(`ChatAgent: Technical skill level mapped to: ${technicalSkillLevel}`);
      
      // Estimate solution progress using LLM evaluation
      logger.info(`ChatAgent: Starting solution progress evaluation with LLM`);
      const progressToSolution = await this.evaluateSolutionProgressWithLLM(
        ticket.title,
        ticket.description,
        ticket.device || 'Ei määritelty',
        newSupportComment, 
        solution || '',
        JSON.stringify(conversationHistory),
        ticket.additionalInfo || '',
        ticket.id,
        (params as any).userId
      );
      
      logger.info(`ChatAgent: Solution progress evaluated by LLM: ${progressToSolution}`);
      
      // Format the prompt for conversation
      logger.info(`ChatAgent: Preparing prompt for chat response`);
      const formattedMessages = await CHAT_AGENT_PROMPT.formatMessages({
        ticketTitle: ticket.title,
        ticketDescription: ticket.description,
        category: category.name,
        deviceInfo: ticket.device || 'Ei määritelty',
        additionalInfo: ticket.additionalInfo || '',
        progressToSolution: progressToSolution,
        conversationHistory: JSON.stringify(conversationHistory),
        supportComment: newSupportComment,
        userName: ticketCreator.name,
        userProfile: userProfile,
        technicalSkillLevel: technicalSkillLevel,
        solution: solution || 'Ei tietoa'
      });
      
      // Log the final formatted prompt messages being sent to the LLM
      logger.info('ChatAgent: Final formatted messages for LLM:', JSON.stringify(formattedMessages, null, 2));

      // Generate the chat response using the LLM
      logger.info('ChatAgent: Invoking LLM for chat response...');
      const startTime = performance.now();
      
      // Create token tracking callback for chat response
      const modelName = await aiSettingsService.getModelForAgent('chat');
      const chatCallback = createTokenCallback({
        agentType: 'chat',
        modelUsed: modelName,
        ticketId: ticket.id,
        userId: (params as any).userId,
        requestType: 'chat_response'
      });
      
      const aiResponse = await this.model!.invoke(formattedMessages, {
        callbacks: [chatCallback]
      });
      const endTime = performance.now();
      const responseTime = ((endTime - startTime) / 1000).toFixed(2);
      
      logger.info(`ChatAgent: LLM response received (${responseTime}s). Content length: ${aiResponse?.content?.toString().length}`);
      // logger.info('ChatAgent: Raw AI response content:', aiResponse?.content);

      const responseText = aiResponse?.content?.toString() || "Pahoittelut, en osaa vastata tähän tällä hetkellä.";

      // Return the response text and the evaluation result
      return {
        responseText: responseText,
        evaluation: progressToSolution, 
      };

    } catch (error: any) {
      logger.error('ChatAgent Error in generateChatResponse:', error);
      // Return a default response and an 'error' evaluation state in case of failure
      return {
        responseText: "Valitettavasti kohtasin odottamattoman ongelman enkä voi vastata juuri nyt.",
        evaluation: "ERROR",
      };
    }
  }
  
  /**
   * Evaluates the progress towards the solution based on the support agent's comment.
   * Uses a separate LLM call with a specific prompt.
   */
  private async evaluateSolutionProgressWithLLM(
    ticketTitle: string,
    ticketDescription: string,
    deviceInfo: string,
    currentComment: string,
    solution: string,
    conversationHistory: string,
    additionalInfo: string,
    ticketId: string,
    userId?: string
  ): Promise<string> {
    try {
      // Ensure solution is not empty for the prompt
      const effectiveSolution = solution || "Ratkaisua ei löytynyt.";
      
      const formattedPrompt = await PROGRESS_EVALUATION_PROMPT.formatMessages({
          ticketTitle,
          ticketDescription,
          deviceInfo,
          solution: effectiveSolution, 
          conversationHistory,
          supportComment: currentComment,
          additionalInfo
      });
      
      // Log the prompt being sent for evaluation
      // logger.info('ChatAgent: Evaluation prompt messages:', JSON.stringify(formattedPrompt, null, 2));

      logger.info('ChatAgent: Invoking LLM for progress evaluation...');
      const evalStartTime = performance.now();
      
      // Create token tracking callback for evaluation
      const evalModelName = await aiSettingsService.getModelForAgent('chat');
      const evalCallback = createTokenCallback({
        agentType: 'chat',
        modelUsed: evalModelName,
        ticketId: ticketId,
        userId: userId,
        requestType: 'chat_evaluation'
      });
      
      const evaluationResponse = await this.model!.invoke(formattedPrompt, {
        callbacks: [evalCallback]
      });
      const endTime = performance.now();
      const responseTime = ((endTime - evalStartTime) / 1000).toFixed(2);
      
      logger.info(`ChatAgent: Evaluation response received (${responseTime}s).`);

      let evaluation = evaluationResponse?.content?.toString().trim().toUpperCase() || 'ERROR';
      
      // Validate the response is one of the expected values
      const validEvaluations = ['EARLY', 'PROGRESSING', 'CLOSE', 'SOLVED'];
      if (!validEvaluations.includes(evaluation)) {
          logger.warn(`ChatAgent: LLM evaluation returned unexpected value: '${evaluation}'. Defaulting to PROGRESSING.`);
          evaluation = 'PROGRESSING'; // Default to PROGRESSING if invalid response
      }
      
      return evaluation;

    } catch (error: any) {
        logger.error('ChatAgent Error during LLM progress evaluation:', error);
        return 'ERROR'; // Return an error state if evaluation fails
    }
  }
}

// Create a singleton instance
export const chatAgent = new ChatAgent(); 