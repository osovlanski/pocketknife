/**
 * Rami Levy Service Tests
 *
 * Tests for the Rami Levy grocery integration service.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock dependencies
vi.mock('../../src/services/core/databaseService', () => ({
  getPrisma: vi.fn(() => null)
}));

vi.mock('../../src/services/core/configService', () => ({
  configService: {
    get: vi.fn((key: string, defaultValue: any) => defaultValue)
  }
}));

vi.mock('../../src/services/core/cacheService', () => ({
  cacheService: {
    get: vi.fn(() => null),
    set: vi.fn(() => Promise.resolve())
  }
}));

vi.mock('../../src/utils/encryption', () => ({
  encrypt: vi.fn((value: string) => `encrypted:${value}`),
  decrypt: vi.fn((value: string) => value.replace('encrypted:', '')),
  isEncrypted: vi.fn((value: string) => value.startsWith('encrypted:'))
}));

vi.mock('../../src/utils/logger', () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    fail: vi.fn(),
    success: vi.fn(),
    search: vi.fn(),
    found: vi.fn(),
    cache: vi.fn(),
    retry: vi.fn(),
    start: vi.fn(),
    complete: vi.fn(),
    processing: vi.fn()
  }
}));

vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => ({
      post: vi.fn(),
      get: vi.fn()
    }))
  }
}));

describe('RamiLevyService', () => {
  let ramiLevyService: any;
  let mockAxiosInstance: any;

  beforeEach(async () => {
    vi.resetModules();

    // Setup mock axios instance
    mockAxiosInstance = {
      post: vi.fn(),
      get: vi.fn()
    };

    const axios = await import('axios');
    (axios.default.create as any).mockReturnValue(mockAxiosInstance);

    // Import service after mocks are set up
    const module = await import('../../src/services/cooking/ramiLevyService');
    ramiLevyService = module.ramiLevyService;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('getCheckoutUrl', () => {
    it('should return the Rami Levy checkout URL', () => {
      const url = ramiLevyService.getCheckoutUrl();
      expect(url).toBe('https://www.rami-levy.co.il/he/dashboard/checkout');
    });
  });

  describe('getAvailableStores', () => {
    it('should return list of available stores', () => {
      const stores = ramiLevyService.getAvailableStores();

      expect(Array.isArray(stores)).toBe(true);
      expect(stores.length).toBeGreaterThan(0);
      expect(stores[0]).toHaveProperty('id');
      expect(stores[0]).toHaveProperty('name');
    });

    it('should include default store', () => {
      const stores = ramiLevyService.getAvailableStores();
      const defaultStore = stores.find((s: any) => s.id === '331');

      expect(defaultStore).toBeDefined();
      expect(defaultStore.name).toContain('Default');
    });
  });

  describe('getCart', () => {
    it('should return null when user has no session', () => {
      const cart = ramiLevyService.getCart('nonexistent-user');
      expect(cart).toBeNull();
    });
  });

  describe('initialize', () => {
    it('should return error when no tokens are stored', async () => {
      const result = await ramiLevyService.initialize('user-123');

      expect(result.isValid).toBe(false);
      expect(result.userId).toBe('user-123');
      expect(result.errorMessage).toContain('No tokens stored');
    });
  });

  describe('storeTokens', () => {
    it('should return false when database is not available', async () => {
      const tokens = {
        apiKey: 'test-api-key',
        cookie: 'test-cookie'
      };

      const result = await ramiLevyService.storeTokens('user-123', tokens);
      expect(result).toBe(false);
    });
  });

  describe('deleteTokens', () => {
    it('should return false when database is not available', async () => {
      const result = await ramiLevyService.deleteTokens('user-123');
      expect(result).toBe(false);
    });
  });

  describe('getTokenStatus', () => {
    it('should return error when database is not available', async () => {
      const result = await ramiLevyService.getTokenStatus('user-123');

      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toBe('Database not available');
    });
  });

  describe('cleanupSessions', () => {
    it('should not throw when called with no sessions', () => {
      expect(() => ramiLevyService.cleanupSessions()).not.toThrow();
    });

    it('should not throw when called with custom max age', () => {
      expect(() => ramiLevyService.cleanupSessions(1000)).not.toThrow();
    });
  });

  describe('searchProducts (with mock session)', () => {
    it('should throw error when not initialized', async () => {
      await expect(
        ramiLevyService.searchProducts('user-123', 'milk')
      ).rejects.toThrow('Rami Levy not initialized');
    });
  });

  describe('addToCart (with mock session)', () => {
    it('should throw error when not initialized', async () => {
      await expect(
        ramiLevyService.addToCart('user-123', [{ productId: 123, quantity: 1 }])
      ).rejects.toThrow('Rami Levy not initialized');
    });
  });

  describe('removeFromCart (with mock session)', () => {
    it('should throw error when not initialized', async () => {
      await expect(
        ramiLevyService.removeFromCart('user-123', [123])
      ).rejects.toThrow('Rami Levy not initialized');
    });
  });

  describe('updateCartQuantity (with mock session)', () => {
    it('should throw error when not initialized', async () => {
      await expect(
        ramiLevyService.updateCartQuantity('user-123', 123, 2)
      ).rejects.toThrow('Rami Levy not initialized');
    });
  });

  describe('clearCart (with mock session)', () => {
    it('should throw error when not initialized', async () => {
      await expect(
        ramiLevyService.clearCart('user-123')
      ).rejects.toThrow('Rami Levy not initialized');
    });
  });

  describe('createOrderFromIngredients (with mock session)', () => {
    it('should throw error when not initialized', async () => {
      await expect(
        ramiLevyService.createOrderFromIngredients('user-123', [{ name: 'milk' }])
      ).rejects.toThrow('Rami Levy not initialized');
    });
  });
});

describe('RamiLevyService with mocked database', () => {
  let ramiLevyService: any;
  let mockPrisma: any;
  let mockAxiosInstance: any;

  beforeEach(async () => {
    vi.resetModules();

    // Setup mock Prisma client
    mockPrisma = {
      ramiLevyToken: {
        findUnique: vi.fn(),
        upsert: vi.fn(),
        update: vi.fn(),
        delete: vi.fn()
      }
    };

    const databaseService = await import('../../src/services/core/databaseService');
    (databaseService.getPrisma as any).mockReturnValue(mockPrisma);

    // Setup mock axios instance
    mockAxiosInstance = {
      post: vi.fn()
    };

    const axios = await import('axios');
    (axios.default.create as any).mockReturnValue(mockAxiosInstance);

    // Import service after mocks are set up
    const module = await import('../../src/services/cooking/ramiLevyService');
    ramiLevyService = module.ramiLevyService;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('storeTokens with database', () => {
    it('should store encrypted tokens successfully', async () => {
      mockPrisma.ramiLevyToken.upsert.mockResolvedValue({ id: 'token-123' });

      const tokens = {
        apiKey: 'test-api-key',
        cookie: 'test-cookie'
      };

      const result = await ramiLevyService.storeTokens('user-123', tokens);
      expect(result).toBe(true);
      expect(mockPrisma.ramiLevyToken.upsert).toHaveBeenCalled();
    });

    it('should return false on database error', async () => {
      mockPrisma.ramiLevyToken.upsert.mockRejectedValue(new Error('DB error'));

      const tokens = {
        apiKey: 'test-api-key',
        cookie: 'test-cookie'
      };

      const result = await ramiLevyService.storeTokens('user-123', tokens);
      expect(result).toBe(false);
    });
  });

  describe('initialize with database', () => {
    it('should initialize successfully with valid tokens', async () => {
      mockPrisma.ramiLevyToken.findUnique.mockResolvedValue({
        apiKey: 'encrypted:test-api-key',
        cookie: 'encrypted:test-cookie'
      });

      // Mock successful API validation
      mockAxiosInstance.post.mockResolvedValue({
        status: 200,
        data: { status: 200 }
      });

      mockPrisma.ramiLevyToken.update.mockResolvedValue({});

      const result = await ramiLevyService.initialize('user-123');

      expect(result.isValid).toBe(true);
      expect(result.userId).toBe('user-123');
    });

    it('should return invalid when API validation fails', async () => {
      mockPrisma.ramiLevyToken.findUnique.mockResolvedValue({
        apiKey: 'encrypted:test-api-key',
        cookie: 'encrypted:test-cookie'
      });

      // Mock failed API validation
      mockAxiosInstance.post.mockRejectedValue(new Error('Unauthorized'));

      const result = await ramiLevyService.initialize('user-123');

      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toContain('expired or invalid');
    });
  });

  describe('deleteTokens with database', () => {
    it('should delete tokens successfully', async () => {
      mockPrisma.ramiLevyToken.delete.mockResolvedValue({});

      const result = await ramiLevyService.deleteTokens('user-123');
      expect(result).toBe(true);
      expect(mockPrisma.ramiLevyToken.delete).toHaveBeenCalledWith({
        where: { userId: 'user-123' }
      });
    });

    it('should return false on delete error', async () => {
      mockPrisma.ramiLevyToken.delete.mockRejectedValue(new Error('Not found'));

      const result = await ramiLevyService.deleteTokens('user-123');
      expect(result).toBe(false);
    });
  });

  describe('getTokenStatus with database', () => {
    it('should return not configured when no token exists', async () => {
      mockPrisma.ramiLevyToken.findUnique.mockResolvedValue(null);

      const result = await ramiLevyService.getTokenStatus('user-123');

      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toBe('No tokens configured');
    });
  });

  describe('searchProducts with initialized session', () => {
    it('should search products and return results', async () => {
      // Initialize first
      mockPrisma.ramiLevyToken.findUnique.mockResolvedValue({
        apiKey: 'encrypted:test-api-key',
        cookie: 'encrypted:test-cookie'
      });

      mockAxiosInstance.post
        .mockResolvedValueOnce({ status: 200, data: { status: 200 } }) // validation
        .mockResolvedValueOnce({
          status: 200,
          data: {
            status: 200,
            data: [
              {
                id: 1,
                barcode: '123456',
                name: 'Milk',
                price: { price: 7.90 },
                images: { small: '/img/milk.jpg' }
              }
            ],
            total: 1
          }
        }); // search

      mockPrisma.ramiLevyToken.update.mockResolvedValue({});

      await ramiLevyService.initialize('user-123');
      const result = await ramiLevyService.searchProducts('user-123', 'milk');

      expect(result.products).toHaveLength(1);
      expect(result.products[0].name).toBe('Milk');
      expect(result.query).toBe('milk');
    });
  });
});

describe('RamiLevyService Types', () => {
  it('should export correct types', async () => {
    const module = await import('../../src/services/cooking/ramiLevyService');

    // Verify exports exist
    expect(module.ramiLevyService).toBeDefined();
    expect(typeof module.ramiLevyService.initialize).toBe('function');
    expect(typeof module.ramiLevyService.storeTokens).toBe('function');
    expect(typeof module.ramiLevyService.searchProducts).toBe('function');
    expect(typeof module.ramiLevyService.addToCart).toBe('function');
    expect(typeof module.ramiLevyService.removeFromCart).toBe('function');
    expect(typeof module.ramiLevyService.updateCartQuantity).toBe('function');
    expect(typeof module.ramiLevyService.clearCart).toBe('function');
    expect(typeof module.ramiLevyService.getCart).toBe('function');
    expect(typeof module.ramiLevyService.getCheckoutUrl).toBe('function');
    expect(typeof module.ramiLevyService.createOrderFromIngredients).toBe('function');
    expect(typeof module.ramiLevyService.deleteTokens).toBe('function');
    expect(typeof module.ramiLevyService.getTokenStatus).toBe('function');
    expect(typeof module.ramiLevyService.getAvailableStores).toBe('function');
    expect(typeof module.ramiLevyService.cleanupSessions).toBe('function');
  });
});
