/**
 * DeliveryService Tests
 * 
 * Tests for the DeliveryService that manages delivery providers
 * and order creation for grocery/food delivery.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Use vi.hoisted for mocks
const { mockConfigService, mockCacheService } = vi.hoisted(() => ({
  mockConfigService: {
    get: vi.fn((key: string, defaultValue: any) => {
      const configs: Record<string, any> = {
        'delivery.mock.enabled': true,
        'delivery.mock.baseUrl': 'https://wolt.com',
        'delivery.defaultProvider': 'mock-wolt',
        'delivery.wolt.enabled': false,
        'delivery.orderPreview.ttlSeconds': 3600,
        'delivery.mock.deliveryFee': 15.90,
        'delivery.mock.serviceFee': 3.50,
        'delivery.mock.minOrderAmount': 30
      };
      return configs[key] ?? defaultValue;
    })
  },
  mockCacheService: {
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue(undefined),
    del: vi.fn().mockResolvedValue(undefined)
  }
}));

// Mock dependencies
vi.mock('../../src/services/core/configService', () => ({
  configService: mockConfigService
}));

vi.mock('../../src/services/core/cacheService', () => ({
  cacheService: mockCacheService
}));

vi.mock('../../src/utils/logger', () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    success: vi.fn(),
    fail: vi.fn(),
    init: vi.fn(),
    search: vi.fn(),
    found: vi.fn()
  }
}));

vi.mock('uuid', () => ({
  v4: vi.fn(() => 'test-uuid-1234')
}));

// Static import after mocks
import { deliveryService } from '../../src/services/delivery/deliveryService';

describe('DeliveryService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCacheService.get.mockResolvedValue(null);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getProviders', () => {
    it('should return list of registered providers', () => {
      const providers = deliveryService.getProviders();
      expect(Array.isArray(providers)).toBe(true);
      expect(providers.length).toBeGreaterThan(0);
    });

    it('should include mock provider', () => {
      const providers = deliveryService.getProviders();
      const mockProvider = providers.find(p => p.id === 'mock-wolt');
      expect(mockProvider).toBeDefined();
      expect(mockProvider?.displayName).toContain('Wolt');
    });
  });

  describe('getProvider', () => {
    it('should return provider by ID', () => {
      const provider = deliveryService.getProvider('mock-wolt');
      expect(provider).toBeDefined();
      expect(provider?.info.id).toBe('mock-wolt');
    });

    it('should return undefined for unknown provider', () => {
      const provider = deliveryService.getProvider('unknown-provider');
      expect(provider).toBeUndefined();
    });
  });

  describe('getDefaultProvider', () => {
    it('should return the default provider', () => {
      const provider = deliveryService.getDefaultProvider();
      expect(provider).toBeDefined();
    });
  });

  describe('searchProducts', () => {
    it('should search products and return results by provider', async () => {
      const results = await deliveryService.searchProducts(['eggs']);
      expect(results).toBeDefined();
      expect(typeof results).toBe('object');
    });

    it('should handle empty ingredients list', async () => {
      const results = await deliveryService.searchProducts([]);
      expect(results).toBeDefined();
    });
  });

  describe('createOrderPreview', () => {
    it('should create order preview with items', async () => {
      const items = [
        { productId: 'egg-1', quantity: 1, providerId: 'mock-wolt' }
      ];
      
      const preview = await deliveryService.createOrderPreview(items, 'mock-wolt');
      expect(preview).toBeDefined();
      if (preview) {
        expect(preview.providerId).toBe('mock-wolt');
      }
    });

    it('should return null for unknown provider', async () => {
      const preview = await deliveryService.createOrderPreview([], 'unknown-provider');
      expect(preview).toBeNull();
    });
  });

  describe('generateOrderLink', () => {
    it('should return null for unknown preview ID', async () => {
      mockCacheService.get.mockResolvedValue(null);
      const link = await deliveryService.generateOrderLink('unknown-preview');
      expect(link).toBeNull();
    });

    it('should generate link from cached preview', async () => {
      const cachedPreview = {
        id: 'preview-123',
        providerId: 'mock-wolt',
        providerName: 'Wolt (Demo)',
        items: [{ productId: 'egg-1', quantity: 1, name: 'Eggs', price: 18.90 }],
        subtotal: 18.90,
        deliveryFee: 15.90,
        serviceFee: 3.50,
        total: 38.30,
        currency: 'ILS',
        estimatedDeliveryMinutes: 30,
        expiresAt: new Date(Date.now() + 3600000)
      };
      mockCacheService.get.mockResolvedValue(cachedPreview);
      
      const link = await deliveryService.generateOrderLink('preview-123');
      expect(link).toBeDefined();
      if (link) {
        expect(link.url).toBeTruthy();
        expect(link.providerId).toBe('mock-wolt');
      }
    });
  });

  describe('Wolt-specific methods', () => {
    it('should return null for createWoltDelivery when provider not available', async () => {
      const result = await deliveryService.createWoltDelivery(
        'order-123',
        { name: 'John', phone: '+972501234567' }
      );
      expect(result).toBeNull();
    });

    it('should return null for getWoltDeliveryStatus when provider not available', async () => {
      const result = await deliveryService.getWoltDeliveryStatus('delivery-123');
      expect(result).toBeNull();
    });

    it('should return false for cancelWoltDelivery when provider not available', async () => {
      const result = await deliveryService.cancelWoltDelivery('delivery-123');
      expect(result).toBe(false);
    });
  });

  describe('registerProvider', () => {
    it('should register a custom provider', () => {
      const customProvider = {
        info: {
          id: 'custom-test-provider',
          name: 'custom',
          displayName: 'Custom Test Provider',
          baseUrl: 'https://custom.com',
          supportedCountries: ['US'],
          supportedCities: ['New York'],
          features: ['grocery'],
          isAvailable: true,
          averageDeliveryMinutes: 45,
          minimumOrderAmount: 25,
          currency: 'USD'
        },
        isAvailable: vi.fn().mockResolvedValue(true),
        searchProducts: vi.fn().mockResolvedValue([]),
        createOrderPreview: vi.fn().mockResolvedValue(null),
        generateOrderLink: vi.fn().mockResolvedValue(null)
      };
      
      deliveryService.registerProvider(customProvider);
      
      const provider = deliveryService.getProvider('custom-test-provider');
      expect(provider).toBeDefined();
      expect(provider?.info.id).toBe('custom-test-provider');
    });
  });
});
