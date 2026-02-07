/**
 * Flight Search Service
 * 
 * Aggregates flight searches from multiple providers:
 * - Kiwi.com Tequila API (primary - good free tier)
 * - Amadeus (existing integration)
 * 
 * Kiwi API: https://tequila.kiwi.com/portal/docs/tequila_api
 * Free tier: 3000 calls/month
 */

import axios, { AxiosInstance } from 'axios';
import { cacheService } from '../core/cacheService';
import { configService } from '../core/configService';
import logger from '../../utils/logger';

// =============================================================================
// TYPES
// =============================================================================

export interface FlightSearchParams {
  origin: string;          // IATA code (e.g., 'TLV')
  destination: string;     // IATA code (e.g., 'JFK')
  departureDate: string;   // YYYY-MM-DD
  returnDate?: string;     // YYYY-MM-DD (for round trips)
  adults?: number;
  children?: number;
  cabinClass?: 'economy' | 'premium_economy' | 'business' | 'first';
  directFlightsOnly?: boolean;
  maxPrice?: number;
  currency?: string;
}

export interface FlightResult {
  id: string;
  price: number;
  currency: string;
  airlines: string[];
  airlineLogos: string[];
  departureTime: Date;
  arrivalTime: Date;
  duration: number;        // minutes
  stops: number;
  route: FlightLeg[];
  bookingUrl: string;
  source: string;
  deepLink?: string;
}

export interface FlightLeg {
  departure: {
    airport: string;
    city: string;
    time: Date;
  };
  arrival: {
    airport: string;
    city: string;
    time: Date;
  };
  airline: string;
  flightNumber: string;
  duration: number;
  aircraft?: string;
}

export interface AirportSearchResult {
  id: string;
  code: string;
  name: string;
  city: string;
  country: string;
  timezone: string;
}

// =============================================================================
// KIWI (TEQUILA) SERVICE
// =============================================================================

class FlightSearchService {
  private kiwiClient: AxiosInstance | null = null;
  private readonly kiwiBaseUrl = 'https://api.tequila.kiwi.com';

  constructor() {
    this.initializeClients();
  }

  private initializeClients(): void {
    const kiwiApiKey = process.env.KIWI_API_KEY || process.env.TEQUILA_API_KEY;
    if (kiwiApiKey) {
      this.kiwiClient = axios.create({
        baseURL: this.kiwiBaseUrl,
        headers: { 'apikey': kiwiApiKey },
        timeout: (configService.get('travel.api.timeoutMs') as number) || 15000
      });
      logger.init('Kiwi (Tequila) flight API client initialized');
    }
  }

  /**
   * Check if flight search is available
   */
  isAvailable(): boolean {
    return !!this.kiwiClient;
  }

  /**
   * Search for flights
   */
  async searchFlights(params: FlightSearchParams): Promise<FlightResult[]> {
    if (!this.kiwiClient) {
      logger.warn('Flight search not available - KIWI_API_KEY not configured');
      return [];
    }

    const cacheKey = `flights:search:${JSON.stringify(params)}`;
    const cached = await cacheService.get<FlightResult[]>(cacheKey);
    if (cached) {
      logger.cache('Flight search cache hit');
      return cached;
    }

    try {
      logger.search('Searching flights', { 
        route: `${params.origin} → ${params.destination}`,
        date: params.departureDate 
      });

      const response = await this.kiwiClient.get('/v2/search', {
        params: {
          fly_from: params.origin,
          fly_to: params.destination,
          date_from: this.formatDate(params.departureDate),
          date_to: this.formatDate(params.departureDate),
          return_from: params.returnDate ? this.formatDate(params.returnDate) : undefined,
          return_to: params.returnDate ? this.formatDate(params.returnDate) : undefined,
          adults: params.adults || 1,
          children: params.children || 0,
          selected_cabins: this.mapCabinClass(params.cabinClass),
          max_stopovers: params.directFlightsOnly ? 0 : undefined,
          price_to: params.maxPrice,
          curr: params.currency || 'USD',
          limit: configService.get('limits.travel.flights.search.limit', 20) as number,
          sort: 'price'
        }
      });

      const flights = (response.data.data || []).map((item: any) => 
        this.mapKiwiResult(item, params.currency || 'USD')
      );

      // Cache for 15 minutes (flight prices change frequently)
      await cacheService.set(cacheKey, flights, { ttl: configService.get('cache.flights.searchTtlSeconds', 900) as number });

      logger.success('Flight search completed', { count: flights.length });
      return flights;
    } catch (error: any) {
      if (error.response?.status === 429) {
        logger.warn('Kiwi API rate limit exceeded');
      } else {
        logger.fail('Flight search failed', { error: error.message });
      }
      return [];
    }
  }

  /**
   * Search for cheapest flights in a date range
   */
  async searchCheapestFlights(
    origin: string,
    destination: string,
    dateFrom: string,
    dateTo: string,
    currency: string = 'USD'
  ): Promise<FlightResult[]> {
    if (!this.kiwiClient) return [];

    const cacheKey = `flights:cheapest:${origin}:${destination}:${dateFrom}:${dateTo}`;
    const cached = await cacheService.get<FlightResult[]>(cacheKey);
    if (cached) return cached;

    try {
      const response = await this.kiwiClient.get('/v2/search', {
        params: {
          fly_from: origin,
          fly_to: destination,
          date_from: this.formatDate(dateFrom),
          date_to: this.formatDate(dateTo),
          curr: currency,
          limit: configService.get('limits.travel.flights.search.maxLimit', 30) as number,
          sort: 'price',
          one_for_city: 0,
          one_per_date: 1  // Best price per departure date
        }
      });

      const flights = (response.data.data || []).map((item: any) => 
        this.mapKiwiResult(item, currency)
      );

      await cacheService.set(cacheKey, flights, { ttl: configService.get('cache.flights.cheapestTtlSeconds', 1800) as number });
      return flights;
    } catch (error: any) {
      logger.fail('Cheapest flight search failed', { error: error.message });
      return [];
    }
  }

  /**
   * Search multi-city flights
   */
  async searchMultiCity(
    legs: Array<{ from: string; to: string; date: string }>,
    currency: string = 'USD'
  ): Promise<FlightResult[]> {
    if (!this.kiwiClient || legs.length < 2) return [];

    try {
      // Kiwi uses a special format for multi-city
      const requests = legs.map((leg, index) => ({
        fly_from: leg.from,
        fly_to: leg.to,
        date_from: this.formatDate(leg.date),
        date_to: this.formatDate(leg.date)
      }));

      // For now, search each leg separately
      // A more advanced implementation would use Kiwi's multi-city endpoint
      const allFlights: FlightResult[] = [];

      for (const request of requests) {
        const flights = await this.searchFlights({
          origin: request.fly_from,
          destination: request.fly_to,
          departureDate: legs[0].date,
          currency
        });
        allFlights.push(...flights.slice(0, configService.get('limits.travel.flights.search.batch.maxResults', 5) as number));
      }

      return allFlights;
    } catch (error: any) {
      logger.fail('Multi-city search failed', { error: error.message });
      return [];
    }
  }

  /**
   * Search for airports/locations
   */
  async searchLocations(query: string, type: 'airport' | 'city' | 'country' = 'airport'): Promise<AirportSearchResult[]> {
    if (!this.kiwiClient) return [];

    const cacheKey = `flights:locations:${query}:${type}`;
    const cached = await cacheService.get<AirportSearchResult[]>(cacheKey);
    if (cached) return cached;

    try {
      const response = await this.kiwiClient.get('/locations/query', {
        params: {
          term: query,
          location_types: type,
          limit: configService.get('limits.travel.flights.locations.limit', 10) as number
        }
      });

      const locations: AirportSearchResult[] = (response.data.locations || []).map((loc: any) => ({
        id: loc.id,
        code: loc.code,
        name: loc.name,
        city: loc.city?.name || loc.name,
        country: loc.country?.name || '',
        timezone: loc.timezone
      }));

      await cacheService.set(cacheKey, locations, { ttl: configService.get('cache.locations.ttlSeconds', 86400) as number });
      return locations;
    } catch (error: any) {
      logger.fail('Location search failed', { error: error.message });
      return [];
    }
  }

  /**
   * Get popular routes from an origin
   */
  async getPopularRoutes(origin: string, limit: number = 10): Promise<{ destination: string; averagePrice: number }[]> {
    if (!this.kiwiClient) return [];

    const cacheKey = `flights:popular:${origin}`;
    const cached = await cacheService.get<{ destination: string; averagePrice: number }[]>(cacheKey);
    if (cached) return cached;

    try {
      // Search for flights to "anywhere" in the next 3 months
      const today = new Date();
      const threeMonths = new Date(today);
      threeMonths.setMonth(threeMonths.getMonth() + 3);

      const response = await this.kiwiClient.get('/v2/search', {
        params: {
          fly_from: origin,
          fly_to: 'anywhere',
          date_from: this.formatDate(today.toISOString().split('T')[0]),
          date_to: this.formatDate(threeMonths.toISOString().split('T')[0]),
          limit: limit * 3,
          sort: 'price',
          one_for_city: 1
        }
      });

      const destinations = new Map<string, number[]>();
      
      for (const flight of response.data.data || []) {
        const dest = flight.cityTo;
        if (!destinations.has(dest)) {
          destinations.set(dest, []);
        }
        destinations.get(dest)!.push(flight.price);
      }

      const routes = Array.from(destinations.entries())
        .map(([destination, prices]) => ({
          destination,
          averagePrice: Math.round(prices.reduce((a, b) => a + b, 0) / prices.length)
        }))
        .sort((a, b) => a.averagePrice - b.averagePrice)
        .slice(0, limit);

      await cacheService.set(cacheKey, routes, { ttl: configService.get('cache.flights.popularRoutesTtlSeconds', 3600) as number });
      return routes;
    } catch (error: any) {
      logger.fail('Popular routes search failed', { error: error.message });
      return [];
    }
  }

  /**
   * Map Kiwi API result to FlightResult
   */
  private mapKiwiResult(item: any, currency: string): FlightResult {
    const route: FlightLeg[] = (item.route || []).map((leg: any) => ({
      departure: {
        airport: leg.flyFrom,
        city: leg.cityFrom,
        time: new Date(leg.local_departure)
      },
      arrival: {
        airport: leg.flyTo,
        city: leg.cityTo,
        time: new Date(leg.local_arrival)
      },
      airline: leg.airline,
      flightNumber: `${leg.airline}${leg.flight_no}`,
      duration: Math.round((new Date(leg.local_arrival).getTime() - new Date(leg.local_departure).getTime()) / 60000),
      aircraft: leg.aircraft
    }));

    // Get unique airlines
    const airlines = [...new Set(route.map(r => r.airline))];

    return {
      id: item.id,
      price: item.price,
      currency,
      airlines,
      airlineLogos: airlines.map(a => `https://images.kiwi.com/airlines/64/${a}.png`),
      departureTime: new Date(item.local_departure),
      arrivalTime: new Date(item.local_arrival),
      duration: Math.round(item.duration?.total / 60) || 0,
      stops: route.length - 1,
      route,
      bookingUrl: item.deep_link,
      deepLink: item.deep_link,
      source: 'kiwi'
    };
  }

  /**
   * Format date for Kiwi API (DD/MM/YYYY)
   */
  private formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }

  /**
   * Map cabin class to Kiwi format
   */
  private mapCabinClass(cabinClass?: string): string {
    const mapping: Record<string, string> = {
      'economy': 'M',
      'premium_economy': 'W',
      'business': 'C',
      'first': 'F'
    };
    return mapping[cabinClass || 'economy'] || 'M';
  }
}

// Export singleton
export const flightSearchService = new FlightSearchService();
export default flightSearchService;

