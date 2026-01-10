/**
 * Notification Services Tests
 * 
 * Tests the Telegram and Discord notification services.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('Notification Services', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('TelegramNotificationService', () => {
    it('should have required methods', async () => {
      const telegramService = await import('../../src/services/notifications/telegramNotificationService');
      
      expect(typeof telegramService.default.isConfigured).toBe('function');
      expect(typeof telegramService.default.sendMessage).toBe('function');
      expect(typeof telegramService.default.getStatus).toBe('function');
      expect(typeof telegramService.default.testConnection).toBe('function');
    });

    it('should report configuration status', async () => {
      const telegramService = await import('../../src/services/notifications/telegramNotificationService');
      
      const isConfigured = telegramService.default.isConfigured();
      expect(typeof isConfigured).toBe('boolean');
    });

    it('should return status object', async () => {
      const telegramService = await import('../../src/services/notifications/telegramNotificationService');
      
      const status = await telegramService.default.getStatus();
      expect(status).toHaveProperty('configured');
      expect(typeof status.configured).toBe('boolean');
    });
  });

  describe('DiscordNotificationService', () => {
    it('should have required methods', async () => {
      const discordService = await import('../../src/services/notifications/discordNotificationService');
      
      expect(typeof discordService.default.isConfigured).toBe('function');
      expect(typeof discordService.default.getStatus).toBe('function');
      expect(typeof discordService.default.testConnection).toBe('function');
      expect(typeof discordService.default.sendJobOfferAlert).toBe('function');
    });

    it('should report configuration status', async () => {
      const discordService = await import('../../src/services/notifications/discordNotificationService');
      
      const isConfigured = discordService.default.isConfigured();
      expect(typeof isConfigured).toBe('boolean');
    });

    it('should return status object', async () => {
      const discordService = await import('../../src/services/notifications/discordNotificationService');
      
      const status = await discordService.default.getStatus();
      expect(status).toHaveProperty('configured');
      expect(typeof status.configured).toBe('boolean');
    });
  });
});
