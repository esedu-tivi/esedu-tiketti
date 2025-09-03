import { httpServer } from './app.js';
import { validateEnv, env } from './config/env.js';
import logger from './utils/logger.js';
import { discordBot } from './discord/bot.js';

// Validate environment variables on startup
if (!validateEnv()) {
  logger.error('Environment validation failed. Please check your .env file.');
  if (env.NODE_ENV === 'production') {
    process.exit(1);
  }
}

const port = env.PORT || 3000;

httpServer.listen(port, async () => {
  logger.info(`🚀 Server is running on port ${port}`);
  logger.info(`📝 Environment: ${env.NODE_ENV}`);
  logger.info(`🔒 JWT authentication: enabled`);
  logger.info(`🛡️  Security headers: enabled`);
  logger.info(`⚡ Rate limiting: enabled`);
  
  // Start Discord bot if configured
  if (process.env.DISCORD_BOT_TOKEN && process.env.DISCORD_CLIENT_ID) {
    // Make bot globally accessible for settings updates
    (global as any).discordBot = discordBot;
    
    // Check settings to see if integration should be enabled
    const { discordSettingsService } = await import('./services/discordSettingsService.js');
    const isEnabled = await discordSettingsService.isEnabled();
    
    if (isEnabled) {
      await discordBot.start();
      logger.info(`🤖 Discord bot: enabled and globally accessible`);
    } else {
      logger.info(`🤖 Discord bot: available but integration is disabled in settings`);
    }
  } else {
    const missingConfigs = [];
    if (!process.env.DISCORD_BOT_TOKEN) missingConfigs.push('DISCORD_BOT_TOKEN');
    if (!process.env.DISCORD_CLIENT_ID) missingConfigs.push('DISCORD_CLIENT_ID');
    logger.info(`🤖 Discord bot: disabled (missing: ${missingConfigs.join(', ')})`);
  }
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  httpServer.close(() => {
    logger.info('HTTP server closed');
  });
  await discordBot.stop();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT signal received: closing HTTP server');
  httpServer.close(() => {
    logger.info('HTTP server closed');
  });
  await discordBot.stop();
  process.exit(0);
}); 
