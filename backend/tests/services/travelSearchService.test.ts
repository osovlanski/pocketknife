/**
 * Travel Search Service Tests
 * 
 * Tests for the Travel Search service that handles Amadeus API.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import axios from 'axios';

vi.mock('axios');

describe('Travel Search Service', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    process.env = {
      ...originalEnv,
      AMADEUS_API_KEY: 'test-api-key',
      AMADEUS_API_SECRET: 'test-api-secret'
    };
    
    // Mock token response
    (axios.post as any).mockResolvedValue({
      data: {
        access_token: 'test-token',
        expires_in: 1800
      }
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    process.env = originalEnv;
  });

  describe('searchFlights', () => {
    it('should search flights successfully', async () => {
      // Mock complete Amadeus API response structure
      (axios.get as any).mockResolvedValue({
        data: {
          data: [
            {
              id: 'flight-1',
              price: { total: '500.00', currency: 'USD' },
              validatingAirlineCodes: ['AA'],
              itineraries: [
                {
                  duration: 'PT10H30M',
                  segments: [
                    {
                      departure: { iataCode: 'TLV', terminal: '3', at: '2026-03-15T10:00:00' },
                      arrival: { iataCode: 'JFK', terminal: '1', at: '2026-03-15T18:30:00' },
                      carrierCode: 'AA',
                      number: '123',
                      aircraft: { code: '777' },
                      duration: 'PT10H30M'
                    }
                  ]
                }
              ]
            }
          ]
        }
      });

      const { default: travelSearchService } = await import('../../src/services/travel/travelSearchService');

      const flights = await travelSearchService.searchFlights({
        origin: 'TLV',
        destinations: ['JFK'],
        departureDate: '2026-03-15',
        passengers: { adults: 1 },
        travelClass: 'ECONOMY'
      });

      expect(Array.isArray(flights)).toBe(true);
      expect(flights.length).toBe(1);
    });

    it('should handle API errors gracefully', async () => {
      (axios.get as any).mockRejectedValue(new Error('API Error'));

      const { default: travelSearchService } = await import('../../src/services/travel/travelSearchService');

      // The service catches errors and throws a user-friendly message
      await expect(travelSearchService.searchFlights({
        origin: 'TLV',
        destinations: ['JFK'],
        departureDate: '2026-03-15',
        passengers: { adults: 1 },
        travelClass: 'ECONOMY'
      })).rejects.toThrow();
    });

    it('should handle missing credentials', async () => {
      delete process.env.AMADEUS_API_KEY;
      delete process.env.AMADEUS_API_SECRET;

      // Need to re-import to pick up new env
      vi.resetModules();
      const { default: travelSearchService } = await import('../../src/services/travel/travelSearchService');

      // Should throw when trying to get token without credentials
      await expect(travelSearchService.searchFlights({
        origin: 'TLV',
        destinations: ['JFK'],
        departureDate: '2026-03-15',
        passengers: { adults: 1 },
        travelClass: 'ECONOMY'
      })).rejects.toThrow();
    });

    it('should include return date for round trips', async () => {
      (axios.get as any).mockResolvedValue({
        data: { data: [] }
      });

      const { default: travelSearchService } = await import('../../src/services/travel/travelSearchService');

      await travelSearchService.searchFlights({
        origin: 'TLV',
        destinations: ['JFK'],
        departureDate: '2026-03-15',
        returnDate: '2026-03-22',
        passengers: { adults: 1 },
        travelClass: 'ECONOMY'
      });

      expect(axios.get).toHaveBeenCalled();
      const callArgs = (axios.get as any).mock.calls[0];
      expect(callArgs[1].params.returnDate).toBe('2026-03-22');
    });

    it('should handle direct flights only option', async () => {
      (axios.get as any).mockResolvedValue({
        data: { data: [] }
      });

      const { default: travelSearchService } = await import('../../src/services/travel/travelSearchService');

      await travelSearchService.searchFlights({
        origin: 'TLV',
        destinations: ['JFK'],
        departureDate: '2026-03-15',
        passengers: { adults: 1 },
        travelClass: 'ECONOMY',
        directFlightsOnly: true
      });

      expect(axios.get).toHaveBeenCalled();
      const callArgs = (axios.get as any).mock.calls[0];
      expect(callArgs[1].params.nonStop).toBe(true);
    });

    it('should include children and infants in search', async () => {
      (axios.get as any).mockResolvedValue({
        data: { data: [] }
      });

      const { default: travelSearchService } = await import('../../src/services/travel/travelSearchService');

      await travelSearchService.searchFlights({
        origin: 'TLV',
        destinations: ['JFK'],
        departureDate: '2026-03-15',
        passengers: { adults: 2, children: 1, infants: 1 },
        travelClass: 'ECONOMY'
      });

      expect(axios.get).toHaveBeenCalled();
      const callArgs = (axios.get as any).mock.calls[0];
      expect(callArgs[1].params.adults).toBe(2);
      expect(callArgs[1].params.children).toBe(1);
      expect(callArgs[1].params.infants).toBe(1);
    });
  });

  describe('searchHotels', () => {
    it('should search hotels successfully', async () => {
      (axios.get as any).mockResolvedValue({
        data: {
          data: [
            {
              hotel: { hotelId: 'hotel-1', name: 'Test Hotel' },
              offers: []
            }
          ]
        }
      });

      const { default: travelSearchService } = await import('../../src/services/travel/travelSearchService');

      const hotels = await travelSearchService.searchHotels({
        origin: 'TLV',
        destinations: ['NYC'],
        departureDate: '2026-03-15',
        returnDate: '2026-03-18',
        passengers: { adults: 2 },
        travelClass: 'ECONOMY'
      });

      expect(Array.isArray(hotels)).toBe(true);
    });

    it('should handle hotel search errors gracefully', async () => {
      (axios.get as any).mockRejectedValue(new Error('API Error'));

      const { default: travelSearchService } = await import('../../src/services/travel/travelSearchService');

      // Service catches errors and returns empty array for hotels
      const result = await travelSearchService.searchHotels({
        origin: 'TLV',
        destinations: ['NYC'],
        departureDate: '2026-03-15',
        returnDate: '2026-03-18',
        passengers: { adults: 2 },
        travelClass: 'ECONOMY'
      });

      expect(result).toEqual([]);
    });
  });

  describe('token caching', () => {
    it('should request token on first call', async () => {
      (axios.get as any).mockResolvedValue({
        data: { data: [] }
      });

      const { default: travelSearchService } = await import('../../src/services/travel/travelSearchService');

      await travelSearchService.searchFlights({
        origin: 'TLV',
        destinations: ['JFK'],
        departureDate: '2026-03-15',
        passengers: { adults: 1 },
        travelClass: 'ECONOMY'
      });

      // Token should be fetched
      expect(axios.post).toHaveBeenCalled();
    });
  });
});
