/**
 * Logger Utility Tests
 * 
 * Tests the logging utility functions.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('Logger', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('standard logging methods', () => {
    it('should have standard logging methods', async () => {
      const logger = await import('../../src/utils/logger');
      
      expect(typeof logger.default.info).toBe('function');
      expect(typeof logger.default.error).toBe('function');
      expect(typeof logger.default.warn).toBe('function');
      expect(typeof logger.default.debug).toBe('function');
    });

    it('should not throw when logging', async () => {
      const logger = await import('../../src/utils/logger');
      
      expect(() => {
        logger.default.info('Test info message');
        logger.default.warn('Test warning message');
        logger.default.error('Test error message');
        logger.default.debug('Test debug message');
      }).not.toThrow();
    });

    it('should support http and verbose levels', async () => {
      const logger = await import('../../src/utils/logger');
      
      expect(typeof logger.default.http).toBe('function');
      expect(typeof logger.default.verbose).toBe('function');
      
      expect(() => {
        logger.default.http('HTTP request received');
        logger.default.verbose('Verbose details');
      }).not.toThrow();
    });

    it('should support metadata parameter', async () => {
      const logger = await import('../../src/utils/logger');
      
      expect(() => {
        logger.default.info('Message with metadata', { key: 'value', count: 42 });
        logger.default.error('Error with context', { error: 'test error', stack: 'trace' });
        logger.default.warn('Warning with data', { userId: 'user-123' });
      }).not.toThrow();
    });
  });

  describe('semantic icon methods', () => {
    it('should have success and fail methods', async () => {
      const logger = await import('../../src/utils/logger');
      
      expect(typeof logger.default.success).toBe('function');
      expect(typeof logger.default.fail).toBe('function');
      
      expect(() => {
        logger.default.success('Operation succeeded');
        logger.default.fail('Operation failed', { error: 'test' });
      }).not.toThrow();
    });

    it('should have start and stop methods', async () => {
      const logger = await import('../../src/utils/logger');
      
      expect(typeof logger.default.start).toBe('function');
      expect(typeof logger.default.stop).toBe('function');
      
      expect(() => {
        logger.default.start('Starting process');
        logger.default.stop('Stopping process');
      }).not.toThrow();
    });

    it('should have processing and complete methods', async () => {
      const logger = await import('../../src/utils/logger');
      
      expect(typeof logger.default.processing).toBe('function');
      expect(typeof logger.default.complete).toBe('function');
      
      expect(() => {
        logger.default.processing('Working on task');
        logger.default.complete('Task finished');
      }).not.toThrow();
    });

    it('should have skip and retry methods', async () => {
      const logger = await import('../../src/utils/logger');
      
      expect(typeof logger.default.skip).toBe('function');
      expect(typeof logger.default.retry).toBe('function');
      
      expect(() => {
        logger.default.skip('Skipping step');
        logger.default.retry('Retrying operation', { attempt: 2 });
      }).not.toThrow();
    });

    it('should have found and search methods', async () => {
      const logger = await import('../../src/utils/logger');
      
      expect(typeof logger.default.found).toBe('function');
      expect(typeof logger.default.search).toBe('function');
      
      expect(() => {
        logger.default.found('Found 5 items', { count: 5 });
        logger.default.search('Searching for jobs', { query: 'developer' });
      }).not.toThrow();
    });

    it('should have connect and disconnect methods', async () => {
      const logger = await import('../../src/utils/logger');
      
      expect(typeof logger.default.connect).toBe('function');
      expect(typeof logger.default.disconnect).toBe('function');
      
      expect(() => {
        logger.default.connect('Connected to database');
        logger.default.disconnect('Disconnected from Redis');
      }).not.toThrow();
    });

    it('should have init method', async () => {
      const logger = await import('../../src/utils/logger');
      
      expect(typeof logger.default.init).toBe('function');
      
      expect(() => {
        logger.default.init('Service initialized');
      }).not.toThrow();
    });
  });

  describe('service-specific methods', () => {
    it('should have db method', async () => {
      const logger = await import('../../src/utils/logger');
      
      expect(typeof logger.default.db).toBe('function');
      
      expect(() => {
        logger.default.db('Database query executed', { table: 'users' });
      }).not.toThrow();
    });

    it('should have cache method', async () => {
      const logger = await import('../../src/utils/logger');
      
      expect(typeof logger.default.cache).toBe('function');
      
      expect(() => {
        logger.default.cache('Cache hit', { key: 'user:123' });
      }).not.toThrow();
    });

    it('should have api method', async () => {
      const logger = await import('../../src/utils/logger');
      
      expect(typeof logger.default.api).toBe('function');
      
      expect(() => {
        logger.default.api('External API call', { url: 'https://api.example.com' });
      }).not.toThrow();
    });

    it('should have auth method', async () => {
      const logger = await import('../../src/utils/logger');
      
      expect(typeof logger.default.auth).toBe('function');
      
      expect(() => {
        logger.default.auth('User authenticated', { userId: 'user-123' });
      }).not.toThrow();
    });

    it('should have email method', async () => {
      const logger = await import('../../src/utils/logger');
      
      expect(typeof logger.default.email).toBe('function');
      
      expect(() => {
        logger.default.email('Email sent', { to: 'user@example.com' });
      }).not.toThrow();
    });

    it('should have agent method', async () => {
      const logger = await import('../../src/utils/logger');
      
      expect(typeof logger.default.agent).toBe('function');
      
      expect(() => {
        logger.default.agent('Agent processing', { agentId: 'jobs' });
      }).not.toThrow();
    });
  });

  describe('withIcon method', () => {
    it('should support known icon keys', async () => {
      const logger = await import('../../src/utils/logger');
      
      expect(typeof logger.default.withIcon).toBe('function');
      
      expect(() => {
        logger.default.withIcon('success', 'Custom success message');
        logger.default.withIcon('error', 'Custom error message', 'error');
        logger.default.withIcon('calendar', 'Calendar event created');
      }).not.toThrow();
    });

    it('should support custom emoji icons', async () => {
      const logger = await import('../../src/utils/logger');
      
      expect(() => {
        logger.default.withIcon('🎉', 'Celebration!');
        logger.default.withIcon('🔥', 'Hot feature', 'info');
        logger.default.withIcon('💡', 'Insight', 'debug', { data: 'test' });
      }).not.toThrow();
    });

    it('should support different log levels', async () => {
      const logger = await import('../../src/utils/logger');
      
      expect(() => {
        logger.default.withIcon('info', 'Info message', 'info');
        logger.default.withIcon('warning', 'Warning message', 'warn');
        logger.default.withIcon('error', 'Error message', 'error');
        logger.default.withIcon('debug', 'Debug message', 'debug');
      }).not.toThrow();
    });
  });

  describe('timed method', () => {
    it('should log duration from start time', async () => {
      const logger = await import('../../src/utils/logger');
      
      expect(typeof logger.default.timed).toBe('function');
      
      const startTime = Date.now() - 100; // Simulate 100ms ago
      
      expect(() => {
        logger.default.timed('Operation', startTime);
      }).not.toThrow();
    });

    it('should include additional metadata', async () => {
      const logger = await import('../../src/utils/logger');
      
      const startTime = Date.now() - 250;
      
      expect(() => {
        logger.default.timed('Database query', startTime, { 
          table: 'users', 
          rowCount: 100 
        });
      }).not.toThrow();
    });
  });

  describe('child logger', () => {
    it('should create a child logger with default metadata', async () => {
      const logger = await import('../../src/utils/logger');
      
      expect(typeof logger.default.child).toBe('function');
      
      const childLogger = logger.default.child({ service: 'jobs', requestId: 'req-123' });
      
      expect(typeof childLogger.info).toBe('function');
      expect(typeof childLogger.error).toBe('function');
      expect(typeof childLogger.warn).toBe('function');
      expect(typeof childLogger.debug).toBe('function');
      expect(typeof childLogger.success).toBe('function');
      expect(typeof childLogger.fail).toBe('function');
    });

    it('should log with child logger methods', async () => {
      const logger = await import('../../src/utils/logger');
      
      const childLogger = logger.default.child({ component: 'EmailAgent' });
      
      expect(() => {
        childLogger.info('Processing email');
        childLogger.warn('Rate limit warning');
        childLogger.error('Failed to process');
        childLogger.debug('Debug info');
        childLogger.success('Email processed');
        childLogger.fail('Email failed');
      }).not.toThrow();
    });
  });

  describe('icons object', () => {
    it('should expose icons constant', async () => {
      const logger = await import('../../src/utils/logger');
      
      expect(logger.default.icons).toBeDefined();
      expect(logger.default.icons.success).toBe('✅');
      expect(logger.default.icons.error).toBe('❌');
      expect(logger.default.icons.warning).toBe('⚠️');
      expect(logger.default.icons.start).toBe('🚀');
      expect(logger.default.icons.search).toBe('🔍');
      expect(logger.default.icons.database).toBe('🗄️');
      expect(logger.default.icons.agent).toBe('🤖');
    });
  });

  describe('getInstance method', () => {
    it('should return the winston logger instance', async () => {
      const logger = await import('../../src/utils/logger');
      
      expect(typeof logger.default.getInstance).toBe('function');
      
      const instance = logger.default.getInstance();
      expect(instance).toBeDefined();
      expect(typeof instance.info).toBe('function');
      expect(typeof instance.error).toBe('function');
    });

    it('should return the same instance on multiple calls', async () => {
      const logger = await import('../../src/utils/logger');
      
      const instance1 = logger.default.getInstance();
      const instance2 = logger.default.getInstance();
      
      expect(instance1).toBe(instance2);
    });
  });

  describe('environment configuration', () => {
    it('should create logger with default configuration', async () => {
      const logger = await import('../../src/utils/logger');
      
      // Should not throw with default config
      expect(() => {
        logger.default.info('Test message');
      }).not.toThrow();
    });

    it('should respect LOG_LEVEL environment variable', async () => {
      const originalEnv = process.env.LOG_LEVEL;
      process.env.LOG_LEVEL = 'debug';
      
      vi.resetModules();
      const logger = await import('../../src/utils/logger');
      
      expect(() => {
        logger.default.debug('Debug message should work');
      }).not.toThrow();
      
      process.env.LOG_LEVEL = originalEnv;
    });
  });
});








