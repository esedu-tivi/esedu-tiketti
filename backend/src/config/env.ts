import dotenv from 'dotenv';
import logger from '../utils/logger.js';
import { z } from 'zod';

// Load environment variables
dotenv.config();

// Define the schema for environment variables
const envSchema = z.object({
  // Required variables
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  OPENAI_API_KEY: z.string().startsWith('sk-', 'Invalid OpenAI API key format'),
  
  // Optional but recommended for production
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.string().regex(/^\d+$/, 'PORT must be a number').default('3001'),
  FRONTEND_URL: z.string().url().default('http://localhost:3000'),
  
  // Azure AD configuration (optional)
  AZURE_TENANT_ID: z.string().optional(),
  AZURE_CLIENT_ID: z.string().optional(),
  
  // OpenAI configuration
  OPENAI_EMBEDDING_MODEL: z.string().default('text-embedding-3-small'),
  OPENAI_COMPLETION_MODEL: z.string().default('gpt-4o-mini'),
  
  // Postgres configuration
  POSTGRES_USER: z.string().optional(),
  POSTGRES_PASSWORD: z.string().optional(),
  POSTGRES_DB: z.string().optional(),
});

// Validate environment variables
const parseResult = envSchema.safeParse(process.env);

if (!parseResult.success) {
  logger.error('❌ Invalid environment variables:');
  parseResult.error.errors.forEach((error) => {
    logger.error(`  - ${error.path.join('.')}: ${error.message}`);
  });
  
  // Don't crash in development, but warn
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  } else {
    logger.warn('⚠️  Running in development mode with invalid environment variables');
  }
}

// Export validated environment variables
export const env = parseResult.success ? parseResult.data : process.env as any;

// Export a function to check if all required env vars are set
export function validateEnv(): boolean {
  return parseResult.success;
}