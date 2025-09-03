import { Router } from 'express';
import { discordSettingsController } from '../controllers/discordSettingsController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { requireRole } from '../middleware/roleMiddleware.js';

const router = Router();

// All Discord settings routes require admin role
router.use(authMiddleware);
router.use(requireRole('ADMIN'));

// Configuration check
router.get('/config-status', discordSettingsController.checkConfiguration);

// Settings management
router.get('/settings', discordSettingsController.getSettings);
router.put('/settings', discordSettingsController.updateSettings);
router.post('/settings/reset', discordSettingsController.resetSettings);

// Discord users management
router.get('/users', discordSettingsController.getDiscordUsers);
router.put('/users/:id/block', discordSettingsController.toggleBlockUser);
router.delete('/users/:id', discordSettingsController.deleteDiscordUser);
router.post('/users/:id/sync', discordSettingsController.syncDiscordUser);

// Statistics
router.get('/statistics', discordSettingsController.getStatistics);

export default router;