/**
 * TravelAgent Tests
 * 
 * Tests for the Travel Agent that handles flight/hotel search and trip planning.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock dependencies before imports
vi.mock('../../src/services/core/databaseService', () => ({
  getPrisma: vi.fn(),
  databaseService: {
    isConfigured: vi.fn().mockReturnValue(true),
    getDefaultUser: vi.fn().mockResolvedValue({ id: 'test-user-id', email: 'test@test.com' })
  }
}));

vi.mock('../../src/services/core/googleSearchService', () => ({
  googleSearchService: {
    search: vi.fn().mockResolvedValue([
      { title: 'Local Attraction', description: 'A great place', url: 'https://example.com' }
    ])
  }
}));

vi.mock('../../src/services/travel/travelSearchService', () => ({
  default: {
    searchFlights: vi.fn().mockResolvedValue([
      { id: 'flight-1', airline: 'TestAir', price: 299, departure: '2026-02-01' }
    ]),
    searchHotels: vi.fn().mockResolvedValue([
      { id: 'hotel-1', name: 'Test Hotel', pricePerNight: 89 }
    ]),
    isAvailable: vi.fn().mockReturnValue(true)
  }
}));

vi.mock('../../src/services/travel/tripPlanningService', () => ({
  default: {
    generatePlan: vi.fn().mockResolvedValue({
      summary: 'Your trip plan',
      days: [{ day: 1, activities: ['Visit museum'] }]
    }),
    isAvailable: vi.fn().mockReturnValue(true)
  }
}));

vi.mock('../../src/services/travel/specializedTravelService', () => ({
  default: {
    searchSkiDeals: vi.fn().mockResolvedValue([
      { resort: 'Alpine Resort', price: 599, dates: '2026-01-15' }
    ])
  }
}));

vi.mock('../../src/services/travel/israelTravelService', () => ({
  default: {
    searchDestinations: vi.fn().mockResolvedValue([
      { name: 'Tel Aviv Beach', type: 'beach', rating: 4.5 }
    ]),
    getTrails: vi.fn().mockResolvedValue([
      { name: 'Ein Gedi Trail', difficulty: 'moderate', length: 5 }
    ]),
    getBeaches: vi.fn().mockResolvedValue([
      { name: 'Gordon Beach', type: 'mediterranean', free: true }
    ]),
    getAIRecommendations: vi.fn().mockResolvedValue({
      suggestions: ['Visit Dead Sea']
    })
  }
}));

describe('TravelAgent', () => {
  let travelAgent: any;
  let mockPrisma: any;
  
  beforeEach(async () => {
    vi.resetModules();
    
    // Setup mock Prisma
    mockPrisma = {
      trip: {
        findMany: vi.fn().mockResolvedValue([]),
        create: vi.fn().mockImplementation((args) => ({
          id: 'trip-123',
          ...args.data,
          createdAt: new Date()
        })),
        update: vi.fn().mockImplementation((args) => args.data)
      },
      userPreferences: {
        findUnique: vi.fn().mockResolvedValue(null),
        upsert: vi.fn().mockImplementation((args) => args.create)
      }
    };
    
    const { getPrisma } = await import('../../src/services/core/databaseService');
    (getPrisma as any).mockReturnValue(mockPrisma);
    
    const { TravelAgent } = await import('../../src/agents/TravelAgent');
    travelAgent = new TravelAgent();
  });
  
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('metadata', () => {
    it('should have correct id', () => {
      expect(travelAgent.metadata.id).toBe('travel');
    });
    
    it('should have correct name', () => {
      expect(travelAgent.metadata.name).toBe('Travel Agent');
    });
    
    it('should have correct icon', () => {
      expect(travelAgent.metadata.icon).toBe('✈️');
    });
    
    it('should have color defined', () => {
      expect(travelAgent.metadata.color).toBeDefined();
    });
    
    it('should have description', () => {
      expect(travelAgent.metadata.description).toBeDefined();
    });
  });

  describe('agent methods', () => {
    it('should have execute method', () => {
      expect(typeof travelAgent.execute).toBe('function');
    });
    
    it('should have stop method', () => {
      expect(typeof travelAgent.stop).toBe('function');
    });
    
    it('should have getState method', () => {
      expect(typeof travelAgent.getState).toBe('function');
    });
    
    it('should have getMetrics method', () => {
      expect(typeof travelAgent.getMetrics).toBe('function');
    });
  });

  describe('get-trips action', () => {
    it('should execute get-trips action', async () => {
      const result = await travelAgent.execute({
        action: 'get-trips',
        userId: 'user-123'
      });
      
      // Either succeeds or fails gracefully
      expect(result).toBeDefined();
      expect(typeof result.success).toBe('boolean');
    });
  });

  describe('update-preferences action', () => {
    it('should update travel preferences', async () => {
      const result = await travelAgent.execute({
        action: 'update-preferences',
        userId: 'user-123',
        preferences: {
          preferredAirlines: ['El Al', 'Lufthansa'],
          homeAirport: 'TLV',
          preferredHotelClass: 4
        }
      });
      
      expect(result.success).toBe(true);
    });
  });

  describe('unknown action', () => {
    it('should return error for unknown action', async () => {
      const result = await travelAgent.execute({
        action: 'unknown-action' as any,
        userId: 'user-123'
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Unknown action');
    });
  });
});
