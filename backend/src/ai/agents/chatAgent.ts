import { ChatOpenAI } from "@langchain/openai";
import CHAT_AGENT_PROMPT from "../prompts/chatAgentPrompt.js";
import { AI_CONFIG } from "../config.js";
import { PrismaClient } from '@prisma/client';
import { ChatPromptTemplate } from "@langchain/core/prompts";

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
console.log(PROGRESS_EVALUATION_PROMPT);
/**
 * ChatAgent simulates a user with an IT problem in a conversation with support staff.
 * It provides realistic responses based on the ticket details and solution.
 */
export class ChatAgent {
  private model: ChatOpenAI;
  
  constructor() {
    // Initialize the language model
    this.model = new ChatOpenAI({
      openAIApiKey: AI_CONFIG.openai.apiKey,
      modelName: AI_CONFIG.openai.chatModel,
      temperature: AI_CONFIG.openai.temperature + 0.2, // Slightly higher temperature for more variation
    });
    
    console.log('ChatAgent: Initialized with model:', AI_CONFIG.openai.chatModel);
  }

  /**
   * Generates a response to a support comment in a ticket conversation
   * This simulates how a real user would respond to troubleshooting instructions
   */
  async generateChatResponse(params: ChatResponseParams): Promise<string> {
    try {
      const { 
        ticket, 
        comments, 
        newSupportComment, 
        supportUserId,
        solution
      } = params;
      
      console.log(`ChatAgent: Generating response for ticket: ${ticket.id}, to support comment by user: ${supportUserId}`);
      console.log(`ChatAgent: Full ticket data:`, JSON.stringify({
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
      console.log(`ChatAgent: Solution/Knowledge article provided: ${solution ? 'YES' : 'NO'}`);
      if (solution) {
        console.log(`ChatAgent: Solution length: ${solution.length} characters`);
        console.log(`ChatAgent: Solution preview: ${solution.substring(0, 150)}${solution.length > 150 ? '...' : ''}`);
      } else {
        console.log(`ChatAgent: WARNING - No solution/knowledge article provided for ticket ${ticket.id}`);
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
        console.log(`ChatAgent: AdditionalInfo not provided in params, fetching from database`);
        const fullTicket = await prisma.ticket.findUnique({
          where: { id: ticket.id }
        });
        
        if (fullTicket) {
          ticketAdditionalInfo = fullTicket.additionalInfo || '';
          console.log(`ChatAgent: Found additionalInfo from database: ${ticketAdditionalInfo}`);
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
      console.log(`ChatAgent: Conversation history (${conversationHistory.length} messages):`);
      conversationHistory.forEach((msg, i) => {
        console.log(`  ${i+1}. [${msg.role}] ${msg.name}: ${msg.content.substring(0, 50)}${msg.content.length > 50 ? '...' : ''}`);
      });
      
      // Get userProfile from params or use default
      // Since the Ticket model does not have a userProfile field directly in the database
      let userProfile = ticket.userProfile || 'student';
      console.log(`ChatAgent: Using userProfile from params: ${userProfile}`);
      
      // Determine complexity from priority
      const complexity = 
        ticket.priority === 'LOW' ? 'simple' : 
        ticket.priority === 'MEDIUM' ? 'moderate' : 
        ticket.priority === 'HIGH' || ticket.priority === 'CRITICAL' ? 'complex' : 'moderate';
      
      console.log(`ChatAgent: Ticket complexity determined as: ${complexity} based on priority: ${ticket.priority}`);
      
      // Map technical skill level based on complexity
      const technicalSkillLevel = 
        complexity === 'simple' ? 'vähäinen' : 
        complexity === 'moderate' ? 'keskitasoinen' : 
        'hyvä';
      
      console.log(`ChatAgent: Technical skill level mapped to: ${technicalSkillLevel}`);
      
      // Estimate solution progress using LLM evaluation
      console.log(`ChatAgent: Starting solution progress evaluation with LLM`);
      console.log(`ChatAgent: Solution text length: ${solution?.length || 0} characters`);
      
      const progressToSolution = await this.evaluateSolutionProgressWithLLM(
        ticket.title,
        ticket.description,
        ticket.device || 'Ei määritelty',
        newSupportComment, 
        solution || '', 
        JSON.stringify(conversationHistory),
        ticketAdditionalInfo || ''
      );
      
      console.log(`ChatAgent: Solution progress evaluated by LLM: ${progressToSolution}`);
      
      // Format the prompt for conversation
      console.log(`ChatAgent: Preparing prompt for chat response`);
      const formattedMessages = await CHAT_AGENT_PROMPT.formatMessages({
        ticketTitle: ticket.title,
        ticketDescription: ticket.description,
        deviceInfo: ticket.device || 'Ei määritelty',
        additionalInfo: ticketAdditionalInfo || '',
        category: category.name,
        userName: ticketCreator.name,
        userProfile: userProfile,
        technicalSkillLevel: technicalSkillLevel,
        solution: solution || 'Ei määritelty',
        conversationHistory: JSON.stringify(conversationHistory),
        supportComment: newSupportComment,
        progressToSolution: progressToSolution
      });
      
      // Log formatted prompt for debugging
      console.log(`ChatAgent: All prompt parameters provided to CHAT_AGENT_PROMPT:`);
      console.log(` - ticketTitle: ${ticket.title}`);
      console.log(` - ticketDescription: ${ticket.description.substring(0, 50)}${ticket.description.length > 50 ? '...' : ''}`);
      console.log(` - deviceInfo: ${ticket.device || 'Ei määritelty'}`);
      console.log(` - additionalInfo length: ${(ticketAdditionalInfo || '').length} characters`);
      console.log(` - category: ${category.name}`);
      console.log(` - userName: ${ticketCreator.name}`);
      console.log(` - userProfile: ${userProfile}`);
      console.log(` - technicalSkillLevel: ${technicalSkillLevel}`);
      console.log(` - solution provided: ${solution ? 'YES' : 'NO'}, length: ${solution?.length || 0} chars`);
      console.log(` - conversationHistory: ${conversationHistory.length} messages`);
      console.log(` - supportComment length: ${newSupportComment.length} characters`);
      console.log(` - progressToSolution: ${progressToSolution}`);
      
      console.log('ChatAgent: Invoking LLM for chat response generation');
      
      // Get AI response simulating the user
      const response = await this.model.invoke(formattedMessages);
      const userResponse = response.content.toString();
      
      console.log(`ChatAgent: Generated chat response (${userResponse.length} chars)`);
      console.log(`ChatAgent: Response preview: ${userResponse.substring(0, 100)}${userResponse.length > 100 ? '...' : ''}`);
      
      return userResponse;
    } catch (error) {
      console.error('Error generating chat response:', error);
      // Return a generic fallback response if something goes wrong
      return "Anteeksi, mutta en oikein ymmärrä. Voisitko selittää yksinkertaisemmin?";
    }
  }
  
  /**
   * Evaluates solution progress using the LLM to better understand how close
   * the support agent is to solving the problem semantically
   */
  private async evaluateSolutionProgressWithLLM(
    ticketTitle: string,
    ticketDescription: string,
    deviceInfo: string,
    currentComment: string,
    solution: string,
    conversationHistory: string,
    additionalInfo: string
  ): Promise<string> {
    try {
      if (!solution) return "UNKNOWN";
      
      console.log(`ChatAgent: Evaluation - Support comment preview: ${currentComment.substring(0, 50)}${currentComment.length > 50 ? '...' : ''}`);
      
      // Debug logs for progress evaluation inputs
      console.log(`ChatAgent: PROGRESS_EVALUATION inputs:`);
      console.log(` - ticketTitle: ${ticketTitle}`);
      console.log(` - ticketDescription length: ${ticketDescription.length} characters`);
      console.log(` - deviceInfo: ${deviceInfo}`);
      console.log(` - solution length: ${solution.length} characters`);
      console.log(` - solution preview: ${solution.substring(0, 100)}${solution.length > 100 ? '...' : ''}`);
      console.log(` - conversationHistory: ${typeof conversationHistory === 'string' ? JSON.parse(conversationHistory).length : 'N/A'} messages`);
      console.log(` - currentComment length: ${currentComment.length} characters`);
      console.log(` - additionalInfo length: ${additionalInfo.length} characters`);
      
      // Create an evaluation prompt to determine progress
      const formattedMessages = await PROGRESS_EVALUATION_PROMPT.formatMessages({
        ticketTitle: ticketTitle,
        ticketDescription: ticketDescription,
        deviceInfo: deviceInfo,
        additionalInfo: additionalInfo,
        solution: solution,
        conversationHistory: conversationHistory,
        supportComment: currentComment
      });
      
      // Use the LLM to evaluate progress
      console.log('ChatAgent: Invoking LLM for progress evaluation');
      const evaluationResponse = await this.model.invoke(formattedMessages);
      let progress = evaluationResponse.content.toString().trim().toUpperCase();
      
      console.log(`ChatAgent: Raw progress evaluation result: "${progress}"`);
      
      // Validate progress is one of the expected values
      if (!['EARLY', 'PROGRESSING', 'CLOSE', 'SOLVED'].includes(progress)) {
        console.warn(`ChatAgent: Invalid progress evaluation result: "${progress}", defaulting to EARLY`);
        progress = 'EARLY';
      }
      
      console.log(`ChatAgent: Final progress evaluation: ${progress}`);
      return progress;
    } catch (error) {
      console.error('Error evaluating solution progress with LLM:', error);
      // Default to EARLY in case of error
      return "EARLY";
    }
  }
  
  /**
   * Legacy method for keyword-based progress evaluation
   * Kept for fallback purposes but not actively used anymore
   */
  private estimateSolutionProgress(
    currentComment: string,
    solution: string,
    history: any[]
  ): string {
    if (!solution) return "UNKNOWN";
    
    // Extract key solution terms
    const solutionKeywords = this.extractKeyTerms(solution);
    
    // Check current comment and history for matches
    const allComments = history.map(h => h.content).join(" ") + " " + currentComment;
    const matchCount = solutionKeywords.filter(keyword => 
      allComments.toLowerCase().includes(keyword.toLowerCase())
    ).length;
    
    // Calculate approximate progress
    const progressPercent = Math.min(
      100, 
      Math.round((matchCount / Math.max(1, solutionKeywords.length)) * 100)
    );
    
    console.log(`ChatAgent: Legacy solution progress: ${progressPercent}% (matched ${matchCount}/${solutionKeywords.length} keywords)`);
    
    // Return progress category
    if (progressPercent < 25) return "EARLY";
    if (progressPercent < 60) return "PROGRESSING";
    if (progressPercent < 90) return "CLOSE";
    return "SOLVED";
  }
  
  /**
   * Extract important terms from solution text
   * Used only by the legacy method
   */
  private extractKeyTerms(solution: string): string[] {
    // Split solution into words, remove duplicates and common words
    const words = solution.toLowerCase()
      .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, " ")
      .split(/\s+/)
      .filter(w => w.length > 3) // Only words longer than 3 characters
      .filter(w => !this.isCommonWord(w));
    
    // Remove duplicates
    const uniqueWords = [...new Set(words)];
    
    // Extract the most important 15-20 terms
    const keyTerms = uniqueWords.slice(0, 20);
    
    return keyTerms;
  }
  
  /**
   * Check if a word is a common word that should be excluded from key terms
   * Used only by the legacy method
   */
  private isCommonWord(word: string): boolean {
    const commonWords = [
      'ja', 'tai', 'on', 'ei', 'ole', 'että', 'voi', 'olla', 'jos', 'niin',
      'kun', 'joka', 'mikä', 'miten', 'kuin', 'sekä', 'tämä', 'tuo', 'nämä',
      'nuo', 'siis', 'myös', 'vain', 'koko', 'itse', 'jopa', 'sitten', 'kanssa',
      'koska', 'aina', 'sillä', 'aivan', 'kaikki', 'lisäksi', 'kuitenkin',
      'the', 'and', 'for', 'with', 'this', 'that', 'have', 'from', 'not', 'are',
      'there', 'their', 'they', 'will', 'would', 'could', 'should', 'what', 'when',
      'about', 'which'
    ];
    
    return commonWords.includes(word);
  }
}

// Create a singleton instance
export const chatAgent = new ChatAgent(); 