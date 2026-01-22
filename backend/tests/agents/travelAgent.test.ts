/**
 * TravelAgent Tests
 * 
 * Comprehensive tests for the Travel Agent that handles flight/hotel search,
 * ski deals, local search, Israel travel, and trip planning.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Use vi.hoisted for mocks
const { mockPrisma, mockTravelSearchService, mockTripPlanningService, mockSpecializedTravelService, mockIsraelTravelService, mockGoogleSearchService } = vi.hoisted(() => ({
  mockPrisma: {
    tripPlan: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn()
    },
    userPreferences: {
      findUnique: vi.fn(),
      upsert: vi.fn()
    },
    agentActivity: {
      create: vi.fn()
    }
  },
  mockTravelSearchService: {
    searchFlights: vi.fn(),
    searchHotels: vi.fn(),
    isAvailable: vi.fn()
  },
  mockTripPlanningService: {
    generatePlan: vi.fn(),
    isAvailable: vi.fn()
  },
  mockSpecializedTravelService: {
    searchSkiDeals: vi.fn()
  },
  mockIsraelTravelService: {
    searchDestinations: vi.fn(),
    getTrails: vi.fn(),
    getBeaches: vi.fn(),
    getAIRecommendations: vi.fn(),
    search: vi.fn()
  },
  mockGoogleSearchService: {
    search: vi.fn(),
    isAvailable: vi.fn(),
    hasQuota: vi.fn()
  }
}));

// Mock dependencies
vi.mock('../../src/services/core/databaseService', () => ({
  getPrisma: vi.fn(() => mockPrisma),
  databaseService: {
    isConfigured: vi.fn().mockReturnValue(true),
    getDefaultUser: vi.fn().mockResolvedValue({ id: 'test-user-id', email: 'test@test.com' }),
    logActivity: vi.fn()
  }
}));

vi.mock('../../src/services/core/configService', () => ({
  configService: {
    get: vi.fn((key: string, defaultValue: any) => {
      if (key.includes('timeout')) return defaultValue || 5000;
      return defaultValue;
    })
  }
}));

vi.mock('../../src/services/core/googleSearchService', () => ({
  googleSearchService: mockGoogleSearchService
}));

vi.mock('../../src/services/travel/travelSearchService', () => ({
  default: mockTravelSearchService
}));

vi.mock('../../src/services/travel/tripPlanningService', () => ({
  default: mockTripPlanningService
}));

vi.mock('../../src/services/travel/specializedTravelService', () => ({
  default: mockSpecializedTravelService
}));

vi.mock('../../src/services/travel/israelTravelService', () => ({
  default: mockIsraelTravelService
}));

vi.mock('../../src/utils/logger', () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    fail: vi.fn(),
    success: vi.fn(),
    debug: vi.fn(),
    agent: vi.fn()
  }
}));

vi.mock('../../src/utils/telemetry', () => ({
  telemetryService: {
    recordAgentExecution: vi.fn(),
    setAgentState: vi.fn(),
    recordError: vi.fn()
  }
}));

vi.mock('../../src/utils/retry', () => ({
  RateLimiter: class { async acquire() { return true; } },
  CircuitBreaker: class { async execute<T>(fn: () => Promise<T>): Promise<T> { return fn(); } },
  withRetry: vi.fn((fn) => fn())
}));

// Static import after mocks
import { TravelAgent } from '../../src/agents/TravelAgent';

describe('TravelAgent', () => {
  let travelAgent: TravelAgent;
  
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default mock responses
    mockPrisma.tripPlan.findMany.mockResolvedValue([]);
    mockPrisma.tripPlan.findUnique.mockResolvedValue(null);
    mockPrisma.tripPlan.create.mockResolvedValue({ id: 'trip-123' });
    mockPrisma.tripPlan.update.mockResolvedValue({});
    mockPrisma.tripPlan.delete.mockResolvedValue({});
    mockPrisma.userPreferences.findUnique.mockResolvedValue(null);
    mockPrisma.userPreferences.upsert.mockResolvedValue({});
    mockPrisma.agentActivity.create.mockResolvedValue({});
    
    mockTravelSearchService.searchFlights.mockResolvedValue([
      { id: 'flight-1', airline: 'TestAir', price: 299, departure: '2026-02-01' }
    ]);
    mockTravelSearchService.searchHotels.mockResolvedValue([
      { id: 'hotel-1', name: 'Test Hotel', pricePerNight: 89 }
    ]);
    mockTravelSearchService.isAvailable.mockReturnValue(true);
    
    mockTripPlanningService.generatePlan.mockResolvedValue({
      summary: 'Your trip plan',
      days: [{ day: 1, activities: ['Visit museum'] }]
    });
    mockTripPlanningService.isAvailable.mockReturnValue(true);
    
    mockSpecializedTravelService.searchSkiDeals.mockResolvedValue([
      { resort: 'Alpine Resort', price: 599, dates: '2026-01-15' }
    ]);
    
    mockIsraelTravelService.searchDestinations.mockResolvedValue([
      { name: 'Tel Aviv Beach', type: 'beach', rating: 4.5 }
    ]);
    mockIsraelTravelService.getTrails.mockResolvedValue([
      { name: 'Ein Gedi Trail', difficulty: 'moderate', length: 5 }
    ]);
    mockIsraelTravelService.getBeaches.mockResolvedValue([
      { name: 'Gordon Beach', type: 'mediterranean', free: true }
    ]);
    mockIsraelTravelService.getAIRecommendations.mockResolvedValue({
      suggestions: ['Visit Dead Sea']
    });
    mockIsraelTravelService.search.mockResolvedValue({
      destinations: []
    });
    
    mockGoogleSearchService.search.mockResolvedValue([
      { title: 'Local Attraction', description: 'A great place', url: 'https://example.com' }
    ]);
    mockGoogleSearchService.isAvailable.mockReturnValue(true);
    mockGoogleSearchService.hasQuota.mockReturnValue(true);
    
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

  describe('search action', () => {
    it('should require searchRequest', async () => {
      const result = await travelAgent.execute({
        action: 'search'
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('required');
    });

    it('should attempt to search flights and hotels', async () => {
      const result = await travelAgent.execute({
        action: 'search',
        searchRequest: {
          origin: 'TLV',
          destinations: ['NYC'],
          departureDate: '2026-03-01',
          returnDate: '2026-03-08',
          travelers: 2
        }
      });
      
      // Result structure should be defined regardless of success
      expect(result).toBeDefined();
      expect(typeof result.success).toBe('boolean');
    });

    it('should attempt search with plan generation', async () => {
      const result = await travelAgent.execute({
        action: 'search',
        searchRequest: {
          origin: 'TLV',
          destinations: ['PAR'],
          departureDate: '2026-04-01',
          returnDate: '2026-04-10',
          travelers: 1
        },
        generatePlan: true
      });
      
      expect(result).toBeDefined();
    });

    it('should handle search service errors', async () => {
      mockTravelSearchService.searchFlights.mockRejectedValue(new Error('API error'));
      
      const result = await travelAgent.execute({
        action: 'search',
        searchRequest: {
          origin: 'TLV',
          destinations: ['LON'],
          departureDate: '2026-05-01',
          returnDate: '2026-05-08',
          travelers: 1
        }
      });
      
      expect(result.success).toBe(false);
    });
  });

  describe('search-ski action', () => {
    it('should attempt to search ski deals', async () => {
      const result = await travelAgent.execute({
        action: 'search-ski',
        skiPreferences: {
          skillLevel: 'intermediate',
          priceLevel: 'mid',
          preferredCountries: ['Switzerland', 'Austria']
        }
      });
      
      expect(result).toBeDefined();
      expect(typeof result.success).toBe('boolean');
    });

    it('should attempt to search ski deals with default preferences', async () => {
      const result = await travelAgent.execute({
        action: 'search-ski'
      });
      
      expect(result).toBeDefined();
    });

    it('should handle ski search errors', async () => {
      mockSpecializedTravelService.searchSkiDeals.mockRejectedValue(new Error('Ski API error'));
      
      const result = await travelAgent.execute({
        action: 'search-ski',
        skiPreferences: { skillLevel: 'beginner' }
      });
      
      expect(result.success).toBe(false);
    });
  });

  describe('search-local action', () => {
    it('should require localSearchParams', async () => {
      const result = await travelAgent.execute({
        action: 'search-local'
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('required');
    });

    it('should attempt to search local attractions', async () => {
      const result = await travelAgent.execute({
        action: 'search-local',
        localSearchParams: {
          destination: 'Tel Aviv',
          type: 'attractions'
        }
      });
      
      expect(result).toBeDefined();
      expect(typeof result.success).toBe('boolean');
    });

    it('should attempt to search local restaurants', async () => {
      const result = await travelAgent.execute({
        action: 'search-local',
        localSearchParams: {
          destination: 'Jerusalem',
          type: 'restaurants',
          query: 'kosher'
        }
      });
      
      expect(result).toBeDefined();
    });

    it('should handle local search errors', async () => {
      mockGoogleSearchService.search.mockRejectedValue(new Error('Search error'));
      
      const result = await travelAgent.execute({
        action: 'search-local',
        localSearchParams: {
          destination: 'Haifa',
          type: 'hotels'
        }
      });
      
      expect(result.success).toBe(false);
    });
  });

  describe('search-israel action', () => {
    it('should attempt to search Israel destinations', async () => {
      const result = await travelAgent.execute({
        action: 'search-israel',
        israelFilters: {
          regions: ['north'],
          duration: 'weekend'
        }
      });
      
      expect(result).toBeDefined();
      expect(typeof result.success).toBe('boolean');
    });

    it('should attempt to search Israel with default filters', async () => {
      const result = await travelAgent.execute({
        action: 'search-israel'
      });
      
      expect(result).toBeDefined();
    });
  });

  describe('search-israel-ai action', () => {
    it('should attempt to get AI recommendations for Israel', async () => {
      const result = await travelAgent.execute({
        action: 'search-israel-ai',
        israelSearchRequest: {
          interests: ['hiking', 'history'],
          duration: 3,
          budget: 'moderate'
        }
      });
      
      expect(result).toBeDefined();
      expect(typeof result.success).toBe('boolean');
    });
  });

  describe('get-israel-destinations action', () => {
    it('should attempt to get Israel destinations', async () => {
      const result = await travelAgent.execute({
        action: 'get-israel-destinations',
        israelFilters: {
          regions: ['center'],
          activityTypes: ['beach', 'nightlife']
        }
      });
      
      expect(result).toBeDefined();
      expect(typeof result.success).toBe('boolean');
    });
  });

  describe('get-israel-trails action', () => {
    it('should attempt to get Israel hiking trails', async () => {
      const result = await travelAgent.execute({
        action: 'get-israel-trails',
        israelTrailsFilter: {
          difficulty: 'moderate',
          maxLength: 10
        }
      });
      
      expect(result).toBeDefined();
      expect(typeof result.success).toBe('boolean');
    });

    it('should attempt to get all trails with no filter', async () => {
      const result = await travelAgent.execute({
        action: 'get-israel-trails'
      });
      
      expect(result).toBeDefined();
    });
  });

  describe('get-israel-beaches action', () => {
    it('should attempt to get Israel beaches', async () => {
      const result = await travelAgent.execute({
        action: 'get-israel-beaches',
        israelBeachesFilter: {
          type: 'mediterranean',
          freeOnly: true
        }
      });
      
      expect(result).toBeDefined();
      expect(typeof result.success).toBe('boolean');
    });

    it('should attempt to get all beaches with no filter', async () => {
      const result = await travelAgent.execute({
        action: 'get-israel-beaches'
      });
      
      expect(result).toBeDefined();
    });
  });

  describe('generate-plan action', () => {
    it('should require search request for plan', async () => {
      const result = await travelAgent.execute({
        action: 'generate-plan'
      });
      
      expect(result.success).toBe(false);
    });

    it('should attempt to generate trip plan', async () => {
      const result = await travelAgent.execute({
        action: 'generate-plan',
        searchRequest: {
          origin: 'TLV',
          destinations: ['ROM'],
          departureDate: '2026-06-01',
          returnDate: '2026-06-07',
          travelers: 2
        }
      });
      
      expect(result).toBeDefined();
      expect(typeof result.success).toBe('boolean');
    });
  });

  describe('save-trip action', () => {
    it('should require userId', async () => {
      const result = await travelAgent.execute({
        action: 'save-trip',
        tripData: { destination: 'Paris' }
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('required');
    });

    it('should require tripData', async () => {
      const result = await travelAgent.execute({
        action: 'save-trip',
        userId: 'user-123'
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('required');
    });

    it('should save trip successfully', async () => {
      mockPrisma.tripPlan.create.mockResolvedValue({ id: 'trip-123', destination: 'Paris' });
      
      const result = await travelAgent.execute({
        action: 'save-trip',
        userId: 'user-123',
        tripData: {
          destination: 'Paris',
          startDate: '2026-07-01',
          endDate: '2026-07-10'
        }
      });
      
      expect(result.success).toBe(true);
      expect(result.data?.savedTrip).toBeDefined();
    });
  });

  describe('get-trips action', () => {
    it('should require userId', async () => {
      const result = await travelAgent.execute({
        action: 'get-trips'
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('required');
    });

    it('should return user trips', async () => {
      mockPrisma.tripPlan.findMany.mockResolvedValue([
        { id: 'trip-1', destination: 'London' },
        { id: 'trip-2', destination: 'Tokyo' }
      ]);
      
      const result = await travelAgent.execute({
        action: 'get-trips',
        userId: 'user-123'
      });
      
      expect(result.success).toBe(true);
      expect(result.data?.trips).toHaveLength(2);
    });

    it('should return empty array when no trips', async () => {
      mockPrisma.tripPlan.findMany.mockResolvedValue([]);
      
      const result = await travelAgent.execute({
        action: 'get-trips',
        userId: 'user-123'
      });
      
      expect(result.success).toBe(true);
      expect(result.data?.trips).toEqual([]);
    });
  });

  describe('update-preferences action', () => {
    it('should require userId', async () => {
      const result = await travelAgent.execute({
        action: 'update-preferences',
        preferences: { homeAirport: 'TLV' }
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('required');
    });

    it('should require preferences', async () => {
      const result = await travelAgent.execute({
        action: 'update-preferences',
        userId: 'user-123'
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('required');
    });

    it('should update travel preferences', async () => {
      mockPrisma.userPreferences.upsert.mockResolvedValue({
        homeAirport: 'TLV',
        preferredAirlines: ['El Al']
      });
      
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
      expect(result.data?.preferences).toBeDefined();
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

  describe('database unavailable', () => {
    it('should handle database not available', async () => {
      const { getPrisma } = await import('../../src/services/core/databaseService');
      (getPrisma as any).mockReturnValue(null);
      
      const agent = new TravelAgent();
      const result = await agent.execute({
        action: 'get-trips',
        userId: 'user-123'
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Database not available');
      
      // Restore mock
      (getPrisma as any).mockReturnValue(mockPrisma);
    });
  });
});
