import { httpServer } from './app.js';
import { validateEnv, env } from './config/env.js';
import logger from './utils/logger.js';

// Validate environment variables on startup
if (!validateEnv()) {
  logger.error('Environment validation failed. Please check your .env file.');
  if (env.NODE_ENV === 'production') {
    process.exit(1);
  }
}

const port = env.PORT || 3000;

httpServer.listen(port, () => {
  logger.info(`🚀 Server is running on port ${port}`);
  logger.info(`📝 Environment: ${env.NODE_ENV}`);
  logger.info(`🔒 JWT authentication: enabled`);
  logger.info(`🛡️  Security headers: enabled`);
  logger.info(`⚡ Rate limiting: enabled`);
}); 
