import dotenv from 'dotenv';

// Ensure environment variables are loaded
dotenv.config();

export const AI_CONFIG = {
  // OpenAI configuration
  openai: {
    apiKey: process.env.OPENAI_API_KEY || '',
    chatModel: process.env.OPENAI_COMPLETION_MODEL || 'gpt-4.1',
    embeddingModel: process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small',
  },
  
  // Training ticket generator settings
  trainingTickets: {
    complexityLevels: ['simple', 'moderate', 'complex'],
    defaultPriorities: {
      simple: 'LOW',
      moderate: 'MEDIUM',
      complex: 'HIGH',
    },
    responseFormats: ['TEKSTI', 'KUVA', 'VIDEO'],
    // Maximum number of attachments to generate for a ticket
    maxAttachments: 2,
    // Maximum characters for ticket description
    maxDescriptionLength: 500,
  }
}; 