/**
 * Travel Controller Tests
 * 
 * Tests for the Travel controller HTTP handlers.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Request, Response } from 'express';

// Mock dependencies
vi.mock('../../src/services/travel/travelSearchService', () => ({
  default: {
    searchTravel: vi.fn().mockResolvedValue({ flights: [], hotels: [] })
  }
}));

vi.mock('../../src/services/travel/tripPlanningService', () => ({
  default: {
    generateTripPlan: vi.fn().mockResolvedValue({ itinerary: [] }),
    getDestinationRecommendations: vi.fn().mockResolvedValue([])
  }
}));

vi.mock('../../src/services/travel/specializedTravelService', () => ({
  default: {
    searchSkiDeals: vi.fn().mockResolvedValue([]),
    searchBeachDeals: vi.fn().mockResolvedValue([]),
    getSkiResorts: vi.fn().mockReturnValue([])
  }
}));

vi.mock('../../src/services/travel/israelTravelService', () => ({
  default: {
    searchDestinations: vi.fn().mockResolvedValue({ suggestions: [] }),
    getAISuggestions: vi.fn().mockResolvedValue({ suggestions: [], aiSummary: '' }),
    getAllDestinations: vi.fn().mockReturnValue([]),
    getDestinationsByRegion: vi.fn().mockReturnValue([]),
    getDestinationsByActivity: vi.fn().mockReturnValue([]),
    getDayTripSuggestions: vi.fn().mockReturnValue([]),
    getWeekendGetaways: vi.fn().mockReturnValue([]),
    getHikingTrails: vi.fn().mockReturnValue([]),
    getBeaches: vi.fn().mockReturnValue([])
  }
}));

vi.mock('../../src/services/core/processControlService', () => ({
  default: {
    startProcess: vi.fn(),
    completeProcess: vi.fn(),
    shouldStop: vi.fn().mockReturnValue(false)
  }
}));

vi.mock('../../src/services/core/databaseService', () => ({
  databaseService: {
    getDefaultUser: vi.fn().mockResolvedValue({ id: 'user-123' }),
    logActivity: vi.fn().mockResolvedValue({})
  }
}));

vi.mock('../../src/utils/logger', () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    fail: vi.fn()
  }
}));

describe('Travel Controller', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockJson: ReturnType<typeof vi.fn>;
  let mockStatus: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();
    
    mockJson = vi.fn();
    mockStatus = vi.fn().mockReturnValue({ json: mockJson });
    mockRes = {
      json: mockJson,
      status: mockStatus
    };
    mockReq = {
      body: {},
      params: {},
      query: {},
      headers: {},
      app: {
        get: vi.fn().mockReturnValue(null)
      } as any
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('searchTravel', () => {
    it('should search travel successfully', async () => {
      const travelSearchService = (await import('../../src/services/travel/travelSearchService')).default;
      (travelSearchService.searchTravel as any).mockResolvedValue({
        flights: [{ id: 'fl-1' }],
        hotels: [{ id: 'ht-1' }]
      });

      const { searchTravel } = await import('../../src/controllers/travelController');
      
      mockReq.body = { 
        origin: 'TLV',
        destinations: ['CDG'],
        departureDate: '2026-03-01',
        passengers: { adults: 2 }
      };

      await searchTravel(mockReq as Request, mockRes as Response);

      expect(mockJson).toHaveBeenCalled();
    });

    it('should return 400 when origin missing', async () => {
      const { searchTravel } = await import('../../src/controllers/travelController');
      
      mockReq.body = { 
        destinations: ['CDG'],
        departureDate: '2026-03-01',
        passengers: { adults: 2 }
      };

      await searchTravel(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
    });

    it('should return 400 when destinations empty', async () => {
      const { searchTravel } = await import('../../src/controllers/travelController');
      
      mockReq.body = { 
        origin: 'TLV',
        destinations: [],
        departureDate: '2026-03-01',
        passengers: { adults: 2 }
      };

      await searchTravel(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
    });

    it('should return 400 when departure date missing', async () => {
      const { searchTravel } = await import('../../src/controllers/travelController');
      
      mockReq.body = { 
        origin: 'TLV',
        destinations: ['CDG'],
        passengers: { adults: 2 }
      };

      await searchTravel(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
    });

    it('should return 400 when passengers missing', async () => {
      const { searchTravel } = await import('../../src/controllers/travelController');
      
      mockReq.body = { 
        origin: 'TLV',
        destinations: ['CDG'],
        departureDate: '2026-03-01'
      };

      await searchTravel(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
    });
  });

  describe('getDestinationRecommendations', () => {
    it('should return recommendations', async () => {
      const tripPlanningService = (await import('../../src/services/travel/tripPlanningService')).default;
      (tripPlanningService.getDestinationRecommendations as any).mockResolvedValue([
        { destination: 'Paris', score: 95 }
      ]);

      const { getDestinationRecommendations } = await import('../../src/controllers/travelController');
      
      mockReq.query = { budget: '2000', interests: 'culture,food' };

      await getDestinationRecommendations(mockReq as Request, mockRes as Response);

      expect(mockJson).toHaveBeenCalledWith(expect.objectContaining({
        recommendations: expect.any(Array)
      }));
    });
  });

  describe('generateTripPlan', () => {
    it('should generate trip plan', async () => {
      const tripPlanningService = (await import('../../src/services/travel/tripPlanningService')).default;
      (tripPlanningService.generateTripPlan as any).mockResolvedValue({
        itinerary: [{ day: 1, activities: [] }]
      });

      const { generateTripPlan } = await import('../../src/controllers/travelController');
      
      mockReq.body = { 
        origin: 'TLV',
        destinations: ['CDG'],
        departureDate: '2026-03-01',
        flightPrice: 500,
        hotelPrice: 200
      };

      await generateTripPlan(mockReq as Request, mockRes as Response);

      expect(mockJson).toHaveBeenCalledWith(expect.objectContaining({
        tripPlan: expect.any(Object)
      }));
    });
  });

  describe('searchSkiDeals', () => {
    it('should search ski deals', async () => {
      const specializedTravelService = (await import('../../src/services/travel/specializedTravelService')).default;
      (specializedTravelService.searchSkiDeals as any).mockResolvedValue([
        { resort: 'Alps', price: 1000 }
      ]);

      const { searchSkiDeals } = await import('../../src/controllers/travelController');
      
      mockReq.body = { 
        origin: 'TLV',
        departureDate: '2026-12-20',
        returnDate: '2026-12-27'
      };

      await searchSkiDeals(mockReq as Request, mockRes as Response);

      expect(mockJson).toHaveBeenCalledWith(expect.objectContaining({
        success: true
      }));
    });

    it('should return 400 when origin or date missing', async () => {
      const { searchSkiDeals } = await import('../../src/controllers/travelController');
      
      mockReq.body = { returnDate: '2026-12-27' };

      await searchSkiDeals(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
    });
  });

  describe('getSkiResorts', () => {
    it('should return ski resorts', async () => {
      const specializedTravelService = (await import('../../src/services/travel/specializedTravelService')).default;
      (specializedTravelService.getSkiResorts as any).mockReturnValue([
        { name: 'Chamonix', country: 'France' }
      ]);

      const { getSkiResorts } = await import('../../src/controllers/travelController');

      await getSkiResorts(mockReq as Request, mockRes as Response);

      expect(mockJson).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        resorts: expect.any(Array)
      }));
    });
  });

  describe('searchBeachDeals', () => {
    it('should search beach deals', async () => {
      const specializedTravelService = (await import('../../src/services/travel/specializedTravelService')).default;
      (specializedTravelService.searchBeachDeals as any).mockResolvedValue([
        { destination: 'Maldives', price: 2000 }
      ]);

      const { searchBeachDeals } = await import('../../src/controllers/travelController');
      
      mockReq.body = { 
        origin: 'TLV',
        departureDate: '2026-06-01'
      };

      await searchBeachDeals(mockReq as Request, mockRes as Response);

      expect(mockJson).toHaveBeenCalledWith(expect.objectContaining({
        success: true
      }));
    });

    it('should return 400 when origin or date missing', async () => {
      const { searchBeachDeals } = await import('../../src/controllers/travelController');
      
      mockReq.body = {};

      await searchBeachDeals(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
    });
  });

  describe('searchIsrael', () => {
    it('should search Israel destinations', async () => {
      const israelTravelService = (await import('../../src/services/travel/israelTravelService')).default;
      (israelTravelService.searchDestinations as any).mockResolvedValue({
        suggestions: [{ name: 'Tel Aviv' }]
      });

      const { searchIsrael } = await import('../../src/controllers/travelController');
      
      mockReq.body = { regions: ['tel_aviv'], activityTypes: ['beach'] };

      await searchIsrael(mockReq as Request, mockRes as Response);

      expect(mockJson).toHaveBeenCalledWith(expect.objectContaining({
        success: true
      }));
    });
  });

  describe('searchIsraelAI', () => {
    it('should return AI suggestions', async () => {
      const israelTravelService = (await import('../../src/services/travel/israelTravelService')).default;
      (israelTravelService.getAISuggestions as any).mockResolvedValue({
        suggestions: [{ name: 'Dead Sea' }],
        aiSummary: 'Recommended destinations'
      });

      const { searchIsraelAI } = await import('../../src/controllers/travelController');
      
      mockReq.body = { prompt: 'I want a relaxing beach vacation' };

      await searchIsraelAI(mockReq as Request, mockRes as Response);

      expect(mockJson).toHaveBeenCalledWith(expect.objectContaining({
        success: true
      }));
    });

    it('should return 400 when prompt missing', async () => {
      const { searchIsraelAI } = await import('../../src/controllers/travelController');
      
      mockReq.body = {};

      await searchIsraelAI(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
    });
  });

  describe('getIsraelDestinations', () => {
    it('should return all destinations', async () => {
      const israelTravelService = (await import('../../src/services/travel/israelTravelService')).default;
      (israelTravelService.getAllDestinations as any).mockReturnValue([
        { name: 'Tel Aviv' }
      ]);

      const { getIsraelDestinations } = await import('../../src/controllers/travelController');

      await getIsraelDestinations(mockReq as Request, mockRes as Response);

      expect(mockJson).toHaveBeenCalledWith(expect.objectContaining({
        success: true
      }));
    });

    it('should filter by region', async () => {
      const israelTravelService = (await import('../../src/services/travel/israelTravelService')).default;

      const { getIsraelDestinations } = await import('../../src/controllers/travelController');
      
      mockReq.query = { region: 'north' };

      await getIsraelDestinations(mockReq as Request, mockRes as Response);

      expect(israelTravelService.getDestinationsByRegion).toHaveBeenCalledWith('north');
    });
  });

  describe('getIsraelTrails', () => {
    it('should return hiking trails', async () => {
      const israelTravelService = (await import('../../src/services/travel/israelTravelService')).default;
      (israelTravelService.getHikingTrails as any).mockReturnValue([
        { name: 'Israel National Trail' }
      ]);

      const { getIsraelTrails } = await import('../../src/controllers/travelController');

      await getIsraelTrails(mockReq as Request, mockRes as Response);

      expect(mockJson).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        trails: expect.any(Array)
      }));
    });
  });

  describe('getIsraelBeaches', () => {
    it('should return beaches', async () => {
      const israelTravelService = (await import('../../src/services/travel/israelTravelService')).default;
      (israelTravelService.getBeaches as any).mockReturnValue([
        { name: 'Gordon Beach' }
      ]);

      const { getIsraelBeaches } = await import('../../src/controllers/travelController');

      await getIsraelBeaches(mockReq as Request, mockRes as Response);

      expect(mockJson).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        beaches: expect.any(Array)
      }));
    });
  });
});

