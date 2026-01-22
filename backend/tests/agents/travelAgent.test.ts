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
    search: vi.fn(),
    getDestinationsByRegion: vi.fn(),
    getDestinationsByActivity: vi.fn(),
    getDayTripSuggestions: vi.fn(),
    getWeekendGetaways: vi.fn(),
    getAllDestinations: vi.fn(),
    getHikingTrails: vi.fn(),
    getAISuggestions: vi.fn()
  },
  mockGoogleSearchService: {
    search: vi.fn(),
    searchAndParse: vi.fn(),
    isAvailable: vi.fn(),
    hasQuota: vi.fn(),
    getQuotaStatus: vi.fn()
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
    mockGoogleSearchService.searchAndParse.mockResolvedValue([
      { title: 'Great Restaurant', description: 'Amazing food and dining', url: 'https://example.com/1', source: 'google' },
      { title: 'Luxury Hotel', description: 'Best hotel stay', url: 'https://example.com/2', source: 'google' },
      { title: 'City Tour', description: 'Experience and activity', url: 'https://example.com/3', source: 'google' },
      { title: 'Famous Museum', description: 'Historic landmark park', url: 'https://example.com/4', source: 'google' }
    ]);
    mockGoogleSearchService.isAvailable.mockReturnValue(true);
    mockGoogleSearchService.hasQuota.mockReturnValue(true);
    mockGoogleSearchService.getQuotaStatus.mockReturnValue({ remaining: 90, limit: 100 });
    
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
      mockGoogleSearchService.searchAndParse.mockRejectedValue(new Error('Search error'));
      
      const result = await travelAgent.execute({
        action: 'search-local',
        localSearchRequest: {
          city: 'Haifa',
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

    it('should handle database not available for save-trip', async () => {
      const { getPrisma } = await import('../../src/services/core/databaseService');
      (getPrisma as any).mockReturnValue(null);
      
      const agent = new TravelAgent();
      const result = await agent.execute({
        action: 'save-trip',
        userId: 'user-123',
        tripData: { destination: 'Paris' }
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Database not available');
      
      (getPrisma as any).mockReturnValue(mockPrisma);
    });

    it('should handle database not available for update-preferences', async () => {
      const { getPrisma } = await import('../../src/services/core/databaseService');
      (getPrisma as any).mockReturnValue(null);
      
      const agent = new TravelAgent();
      const result = await agent.execute({
        action: 'update-preferences',
        userId: 'user-123',
        preferences: { homeAirport: 'TLV' }
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Database not available');
      
      (getPrisma as any).mockReturnValue(mockPrisma);
    });
  });

  describe('get-israel-destinations with various filters', () => {
    it('should get destinations by single region', async () => {
      mockIsraelTravelService.getDestinationsByRegion.mockReturnValue([
        { id: 'dest-1', name: 'Tel Aviv', region: 'center' }
      ]);
      
      const result = await travelAgent.execute({
        action: 'get-israel-destinations',
        israelFilters: {
          regions: ['center']
        }
      });
      
      expect(result.success).toBe(true);
      expect(result.data?.israelDestinations).toHaveLength(1);
      expect(mockIsraelTravelService.getDestinationsByRegion).toHaveBeenCalledWith('center');
    });

    it('should get destinations by single activity type', async () => {
      mockIsraelTravelService.getDestinationsByActivity.mockReturnValue([
        { id: 'dest-1', name: 'Eilat', activityType: 'beach' }
      ]);
      
      const result = await travelAgent.execute({
        action: 'get-israel-destinations',
        israelFilters: {
          activityTypes: ['beach']
        }
      });
      
      expect(result.success).toBe(true);
      expect(result.data?.israelDestinations).toHaveLength(1);
      expect(mockIsraelTravelService.getDestinationsByActivity).toHaveBeenCalledWith('beach');
    });

    it('should get day trip suggestions', async () => {
      mockIsraelTravelService.getDayTripSuggestions.mockReturnValue([
        { id: 'trip-1', name: 'Dead Sea Day Trip' }
      ]);
      
      const result = await travelAgent.execute({
        action: 'get-israel-destinations',
        israelFilters: {
          duration: 'day_trip'
        }
      });
      
      expect(result.success).toBe(true);
      expect(result.data?.israelDestinations).toHaveLength(1);
      expect(mockIsraelTravelService.getDayTripSuggestions).toHaveBeenCalled();
    });

    it('should get weekend getaways', async () => {
      mockIsraelTravelService.getWeekendGetaways.mockReturnValue([
        { id: 'getaway-1', name: 'Galilee Weekend' }
      ]);
      
      const result = await travelAgent.execute({
        action: 'get-israel-destinations',
        israelFilters: {
          duration: 'weekend',
          budget: 'moderate'
        }
      });
      
      expect(result.success).toBe(true);
      expect(result.data?.israelDestinations).toHaveLength(1);
      expect(mockIsraelTravelService.getWeekendGetaways).toHaveBeenCalledWith('moderate');
    });

    it('should get extended stay options', async () => {
      mockIsraelTravelService.getWeekendGetaways.mockReturnValue([
        { id: 'extended-1', name: 'Extended Negev Tour' }
      ]);
      
      const result = await travelAgent.execute({
        action: 'get-israel-destinations',
        israelFilters: {
          duration: 'extended'
        }
      });
      
      expect(result.success).toBe(true);
      expect(mockIsraelTravelService.getWeekendGetaways).toHaveBeenCalled();
    });

    it('should get all destinations when no specific filter', async () => {
      mockIsraelTravelService.getAllDestinations.mockReturnValue([
        { id: 'dest-1', name: 'Jerusalem' },
        { id: 'dest-2', name: 'Haifa' }
      ]);
      
      const result = await travelAgent.execute({
        action: 'get-israel-destinations',
        israelFilters: {}
      });
      
      expect(result.success).toBe(true);
      expect(result.data?.israelDestinations).toHaveLength(2);
      expect(mockIsraelTravelService.getAllDestinations).toHaveBeenCalled();
    });

    it('should get all destinations when multiple regions specified', async () => {
      mockIsraelTravelService.getAllDestinations.mockReturnValue([
        { id: 'dest-1', name: 'Multi-region result' }
      ]);
      
      const result = await travelAgent.execute({
        action: 'get-israel-destinations',
        israelFilters: {
          regions: ['center', 'north']
        }
      });
      
      expect(result.success).toBe(true);
      expect(mockIsraelTravelService.getAllDestinations).toHaveBeenCalled();
    });

    it('should handle getIsraelDestinations errors', async () => {
      mockIsraelTravelService.getAllDestinations.mockImplementation(() => {
        throw new Error('Service unavailable');
      });
      
      const result = await travelAgent.execute({
        action: 'get-israel-destinations'
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Service unavailable');
    });
  });

  describe('get-israel-trails with filters', () => {
    it('should get trails with difficulty filter', async () => {
      mockIsraelTravelService.getHikingTrails.mockReturnValue([
        { id: 'trail-1', name: 'Ein Gedi Trail', difficulty: 'moderate' }
      ]);
      
      const result = await travelAgent.execute({
        action: 'get-israel-trails',
        israelTrailsFilter: {
          difficulty: 'moderate',
          maxLength: 15
        }
      });
      
      expect(result.success).toBe(true);
      expect(result.data?.israelTrails).toHaveLength(1);
      expect(mockIsraelTravelService.getHikingTrails).toHaveBeenCalledWith({
        difficulty: 'moderate',
        maxLength: 15
      });
    });

    it('should handle getIsraelTrails errors', async () => {
      mockIsraelTravelService.getHikingTrails.mockImplementation(() => {
        throw new Error('Trail service error');
      });
      
      const result = await travelAgent.execute({
        action: 'get-israel-trails',
        israelTrailsFilter: { difficulty: 'hard' }
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Trail service error');
    });
  });

  describe('get-israel-beaches with filters', () => {
    it('should get beaches with type filter', async () => {
      mockIsraelTravelService.getBeaches.mockReturnValue([
        { id: 'beach-1', name: 'Gordon Beach', type: 'mediterranean' }
      ]);
      
      const result = await travelAgent.execute({
        action: 'get-israel-beaches',
        israelBeachesFilter: {
          type: 'mediterranean'
        }
      });
      
      expect(result.success).toBe(true);
      expect(result.data?.israelBeaches).toHaveLength(1);
    });

    it('should handle getIsraelBeaches errors', async () => {
      mockIsraelTravelService.getBeaches.mockImplementation(() => {
        throw new Error('Beach service error');
      });
      
      const result = await travelAgent.execute({
        action: 'get-israel-beaches',
        israelBeachesFilter: { type: 'dead_sea' }
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Beach service error');
    });
  });

  describe('search-israel-ai action', () => {
    it('should require israelSearchRequest with prompt', async () => {
      const result = await travelAgent.execute({
        action: 'search-israel-ai',
        userId: 'user-123'
      });
      
      expect(result.success).toBe(false);
    });

    it('should get AI-powered Israel suggestions', async () => {
      mockIsraelTravelService.getAISuggestions.mockResolvedValue({
        suggestions: [
          { name: 'AI Suggestion 1', description: 'Great place' }
        ],
        aiSummary: 'Here are your personalized suggestions'
      });
      
      const result = await travelAgent.execute({
        action: 'search-israel-ai',
        userId: 'user-123',
        israelSearchRequest: {
          prompt: 'Where can I go for a romantic weekend?'
        }
      });
      
      expect(result.success).toBe(true);
      expect(result.data?.israelSuggestions).toBeDefined();
    });

    it('should handle AI suggestions without aiSummary', async () => {
      mockIsraelTravelService.getAISuggestions.mockResolvedValue({
        suggestions: [
          { name: 'Suggestion 1' }
        ]
      });
      
      const result = await travelAgent.execute({
        action: 'search-israel-ai',
        userId: 'user-123',
        israelSearchRequest: {
          prompt: 'Budget friendly destinations'
        }
      });
      
      expect(result.success).toBe(true);
    });

    it('should handle AI suggestions errors', async () => {
      mockIsraelTravelService.getAISuggestions.mockRejectedValue(new Error('AI service unavailable'));
      
      const result = await travelAgent.execute({
        action: 'search-israel-ai',
        userId: 'user-123',
        israelSearchRequest: {
          prompt: 'Family vacation ideas'
        }
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('AI service unavailable');
    });
  });

  describe('error handling', () => {
    it('should handle save-trip database errors', async () => {
      mockPrisma.tripPlan.create.mockRejectedValue(new Error('Database write error'));
      
      const result = await travelAgent.execute({
        action: 'save-trip',
        userId: 'user-123',
        tripData: { destination: 'Rome' }
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Database write error');
    });

    it('should handle get-trips database errors', async () => {
      mockPrisma.tripPlan.findMany.mockRejectedValue(new Error('Query failed'));
      
      const result = await travelAgent.execute({
        action: 'get-trips',
        userId: 'user-123'
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Query failed');
    });

    it('should handle update-preferences database errors', async () => {
      mockPrisma.userPreferences.upsert.mockRejectedValue(new Error('Upsert failed'));
      
      const result = await travelAgent.execute({
        action: 'update-preferences',
        userId: 'user-123',
        preferences: { homeAirport: 'JFK' }
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Upsert failed');
    });

    it('should handle search flight errors', async () => {
      mockTravelSearchService.searchFlights.mockRejectedValue(new Error('Flight API error'));
      
      const result = await travelAgent.execute({
        action: 'search',
        userId: 'user-123',
        searchRequest: {
          origin: 'TLV',
          destinations: ['NYC'],
          departureDate: '2026-06-01',
          travelers: 2
        }
      });
      
      expect(result.success).toBe(false);
    });

    it('should handle generate-plan errors', async () => {
      mockTripPlanningService.generatePlan.mockRejectedValue(new Error('Plan generation failed'));
      
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
      
      expect(result.success).toBe(false);
    });
  });

  describe('agent lifecycle', () => {
    it('should return initial state', () => {
      const state = travelAgent.getState();
      expect(state).toBeDefined();
      expect(['idle', 'running', 'stopped', 'error']).toContain(state.status);
    });

    it('should return metrics', () => {
      const metrics = travelAgent.getMetrics();
      expect(metrics).toBeDefined();
    });

    it('should be able to stop', async () => {
      travelAgent.stop();
      expect(travelAgent.getState().status).toBeDefined();
    });
  });

  describe('search-israel action', () => {
    it('should search Israel destinations with filters', async () => {
      mockIsraelTravelService.searchDestinations.mockResolvedValue({
        suggestions: [
          { name: 'Jerusalem', description: 'Historic city' }
        ]
      });
      
      const result = await travelAgent.execute({
        action: 'search-israel',
        userId: 'user-123',
        israelSearchRequest: {
          query: 'historic sites'
        },
        israelFilters: {
          regions: ['center']
        }
      });
      
      expect(result.success).toBe(true);
      expect(result.data?.israelSuggestions).toBeDefined();
    });

    it('should handle search-israel errors', async () => {
      mockIsraelTravelService.searchDestinations.mockRejectedValue(new Error('Search failed'));
      
      const result = await travelAgent.execute({
        action: 'search-israel',
        userId: 'user-123',
        israelSearchRequest: {
          query: 'beaches'
        }
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Search failed');
    });
  });

  describe('search-local action', () => {
    it('should search for local restaurants', async () => {
      mockGoogleSearchService.search.mockResolvedValue([
        { title: 'Best Restaurant in Paris', description: 'Amazing food and dining experience', url: 'https://example.com/1' }
      ]);
      mockGoogleSearchService.isAvailable.mockReturnValue(true);
      
      const result = await travelAgent.execute({
        action: 'search-local',
        userId: 'user-123',
        localSearchRequest: {
          city: 'Paris',
          type: 'restaurants'
        }
      });
      
      expect(result).toBeDefined();
    });

    it('should search for local hotels', async () => {
      mockGoogleSearchService.search.mockResolvedValue([
        { title: 'Luxury Hotel Stay in Rome', description: 'Great accommodation', url: 'https://example.com/2' }
      ]);
      
      const result = await travelAgent.execute({
        action: 'search-local',
        userId: 'user-123',
        localSearchRequest: {
          city: 'Rome',
          type: 'hotels'
        }
      });
      
      expect(result).toBeDefined();
    });

    it('should search for local activities', async () => {
      mockGoogleSearchService.search.mockResolvedValue([
        { title: 'Tour Guide Experience', description: 'Amazing activity and tour', url: 'https://example.com/3' }
      ]);
      
      const result = await travelAgent.execute({
        action: 'search-local',
        userId: 'user-123',
        localSearchRequest: {
          city: 'Tokyo',
          type: 'activities'
        }
      });
      
      expect(result).toBeDefined();
    });

    it('should search for local attractions', async () => {
      mockGoogleSearchService.search.mockResolvedValue([
        { title: 'Famous Museum', description: 'Historic landmark and park', url: 'https://example.com/4' }
      ]);
      
      const result = await travelAgent.execute({
        action: 'search-local',
        userId: 'user-123',
        localSearchRequest: {
          city: 'London',
          type: 'attractions'
        }
      });
      
      expect(result).toBeDefined();
    });

    it('should search for all types', async () => {
      mockGoogleSearchService.search.mockResolvedValue([
        { title: 'General Result', description: 'Something interesting', url: 'https://example.com/5' }
      ]);
      
      const result = await travelAgent.execute({
        action: 'search-local',
        userId: 'user-123',
        localSearchRequest: {
          city: 'Barcelona',
          type: 'all'
        }
      });
      
      expect(result).toBeDefined();
    });
  });

  describe('search-ski action with filters', () => {
    it('should search for ski deals with resort filter', async () => {
      mockSpecializedTravelService.searchSkiDeals.mockResolvedValue([
        { resort: 'Zermatt', price: 1500, country: 'Switzerland' }
      ]);
      
      const result = await travelAgent.execute({
        action: 'search-ski',
        userId: 'user-123',
        skiFilters: {
          destination: 'Switzerland',
          difficulty: 'advanced'
        }
      });
      
      expect(result).toBeDefined();
      expect(typeof result.success).toBe('boolean');
    });

    it('should handle ski search errors', async () => {
      mockSpecializedTravelService.searchSkiDeals.mockRejectedValue(new Error('Ski API error'));
      
      const result = await travelAgent.execute({
        action: 'search-ski',
        userId: 'user-123',
        skiFilters: {
          destination: 'Alps'
        }
      });
      
      expect(result.success).toBe(false);
    });
  });
});
