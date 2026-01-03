/**
 * Travel Agent
 * 
 * Searches for flights, hotels, and ski deals using Amadeus API.
 * Generates AI-powered trip plans and persists trip history to database.
 */

import { AbstractAgent } from './AbstractAgent';
import { AgentMetadata, AgentResult, AgentParams } from './types';
import travelSearchService from '../services/travel/travelSearchService';
import tripPlanningService from '../services/travel/tripPlanningService';
import specializedTravelService from '../services/travel/specializedTravelService';
import { getPrisma } from '../services/core/databaseService';
import { TripSearchRequest } from '../types/travel';

interface TravelParams extends AgentParams {
  action: 'search' | 'search-ski' | 'generate-plan' | 'save-trip' | 'get-trips' | 'update-preferences';
  searchRequest?: TripSearchRequest;
  generatePlan?: boolean;
  skiPreferences?: {
    skillLevel?: 'beginner' | 'intermediate' | 'advanced';
    priceLevel?: 'budget' | 'mid' | 'premium';
    preferredCountries?: string[];
  };
  tripData?: any;
  preferences?: {
    preferredAirlines?: string[];
    homeAirport?: string;
    preferredHotelClass?: number;
  };
}

interface TravelResult {
  flights?: any[];
  hotels?: any[];
  tripPlan?: any;
  skiDeals?: any[];
  savedTrip?: any;
  trips?: any[];
  preferences?: any;
}

export class TravelAgent extends AbstractAgent {
  readonly metadata: AgentMetadata = {
    id: 'travel',
    name: 'Travel Agent',
    description: 'Find flights, hotels, ski deals, and generate AI-powered trip plans',
    icon: '✈️',
    color: '#3B82F6' // Blue
  };

  protected async run(params: TravelParams): Promise<AgentResult<TravelResult>> {
    const { action } = params;

    switch (action) {
      case 'search':
        return this.searchTravel(params);
      case 'search-ski':
        return this.searchSkiDeals(params);
      case 'generate-plan':
        return this.generateTripPlan(params);
      case 'save-trip':
        return this.saveTrip(params);
      case 'get-trips':
        return this.getTrips(params);
      case 'update-preferences':
        return this.updatePreferences(params);
      default:
        return { success: false, error: `Unknown action: ${action}` };
    }
  }

  /**
   * Search for flights and hotels
   */
  private async searchTravel(params: TravelParams): Promise<AgentResult<TravelResult>> {
    const { searchRequest, generatePlan } = params;

    if (!searchRequest) {
      return { success: false, error: 'Search request is required' };
    }

    this.emitLog(`🌍 Starting travel search...`, 'info');
    this.emitLog(`✈️ Searching ${searchRequest.origin} → ${searchRequest.destinations[0]}`, 'info');
    this.emitProgress(10);

    // Check for stop
    if (this.shouldStop()) {
      return { success: true, data: { flights: [], hotels: [] }, stopped: true };
    }

    // Create wrapper for service logs
    const ioWrapper = {
      emit: (event: string, data: any) => {
        if (event === 'travel-log' || event === 'log') {
          this.emitLog(data.message, data.type);
        }
      }
    };

    try {
      const results = await travelSearchService.searchTravel(searchRequest, ioWrapper);
      
      this.emitProgress(60);

      if (this.shouldStop()) {
        return { success: true, data: results, stopped: true };
      }

      this.emitLog(`✅ Found ${results.flights.length} flights and ${results.hotels.length} hotels`, 'success');

      // Generate trip plan if requested
      let tripPlan;
      if (generatePlan && results.flights.length > 0) {
        this.emitLog('🤖 Generating AI-powered trip plan...', 'info');
        this.emitProgress(70);

        try {
          tripPlan = await tripPlanningService.generateTripPlan(
            searchRequest,
            results.flights[0]?.price.total,
            results.hotels[0]?.price.total
          );
          this.emitLog('✅ Trip plan generated successfully!', 'success');
        } catch (planError: any) {
          this.emitLog(`⚠️ Trip plan generation failed: ${planError.message}`, 'warning');
        }
      }

      this.emitProgress(100);

      // Log activity (will use default user if userId not provided)
      await this.saveUserActivity(params.userId, 'search', {
        origin: searchRequest.origin,
        destination: searchRequest.destinations[0],
        departureDate: searchRequest.departureDate,
        flightsFound: results.flights.length,
        hotelsFound: results.hotels.length
      });

      return {
        success: true,
        data: {
          flights: results.flights,
          hotels: results.hotels,
          tripPlan
        }
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Search for ski deals
   */
  private async searchSkiDeals(params: TravelParams): Promise<AgentResult<TravelResult>> {
    const { searchRequest, skiPreferences } = params;

    if (!searchRequest) {
      return { success: false, error: 'Search request is required' };
    }

    this.emitLog('⛷️ Starting ski deals search...', 'info');
    this.emitProgress(10);

    const ioWrapper = {
      emit: (event: string, data: any) => {
        if (event === 'travel-log' || event === 'log') {
          this.emitLog(data.message, data.type);
        }
      }
    };

    try {
      const skiDeals = await specializedTravelService.searchSkiDeals(
        searchRequest,
        skiPreferences,
        ioWrapper,
        () => this.shouldStop()
      );

      if (this.shouldStop()) {
        return { success: true, data: { skiDeals: [] }, stopped: true };
      }

      this.emitLog(`✅ Found ${skiDeals.length} ski deals`, 'success');
      this.emitProgress(100);

      // Log activity (will use default user if userId not provided)
      await this.saveUserActivity(params.userId, 'search-ski', {
        origin: searchRequest.origin,
        skiDealsFound: skiDeals.length,
        preferences: skiPreferences
      });

      return {
        success: true,
        data: { skiDeals }
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Generate a trip plan
   */
  private async generateTripPlan(params: TravelParams): Promise<AgentResult<TravelResult>> {
    const { searchRequest } = params;

    if (!searchRequest) {
      return { success: false, error: 'Search request is required' };
    }

    this.emitLog('🤖 Generating AI-powered trip plan...', 'info');
    this.emitProgress(20);

    try {
      const tripPlan = await tripPlanningService.generateTripPlan(searchRequest);
      
      this.emitLog('✅ Trip plan generated successfully!', 'success');
      this.emitProgress(100);

      return {
        success: true,
        data: { tripPlan }
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Save a trip plan to database
   */
  private async saveTrip(params: TravelParams): Promise<AgentResult<TravelResult>> {
    const { userId, tripData } = params;

    if (!userId) {
      return { success: false, error: 'User ID is required' };
    }

    if (!tripData) {
      return { success: false, error: 'Trip data is required' };
    }

    const prisma = getPrisma();
    if (!prisma) {
      return { success: false, error: 'Database not available' };
    }

    this.emitLog(`💾 Saving trip to ${tripData.destination}...`, 'info');

    try {
      const savedTrip = await prisma.tripPlan.create({
        data: {
          userId,
          name: tripData.name || `Trip to ${tripData.destination}`,
          origin: tripData.origin,
          destination: tripData.destination,
          departDate: new Date(tripData.departureDate),
          returnDate: tripData.returnDate ? new Date(tripData.returnDate) : null,
          travelers: tripData.travelers || 1,
          tripType: tripData.tripType || 'roundtrip',
          budgetMin: tripData.budgetMin,
          budgetMax: tripData.budgetMax,
          currency: tripData.currency || 'USD',
          flights: tripData.flights || null,
          hotels: tripData.hotels || null,
          activities: tripData.activities || null,
          notes: tripData.notes,
          status: 'planning'
        }
      });

      this.emitLog('✅ Trip saved successfully', 'success');

      return {
        success: true,
        data: { savedTrip }
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get user's saved trips
   */
  private async getTrips(params: TravelParams): Promise<AgentResult<TravelResult>> {
    const { userId } = params;

    if (!userId) {
      return { success: false, error: 'User ID is required' };
    }

    const prisma = getPrisma();
    if (!prisma) {
      return { success: false, error: 'Database not available' };
    }

    try {
      const trips = await prisma.tripPlan.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 50
      });

      return {
        success: true,
        data: { trips }
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Update user's travel preferences
   */
  private async updatePreferences(params: TravelParams): Promise<AgentResult<TravelResult>> {
    const { userId, preferences } = params;

    if (!userId) {
      return { success: false, error: 'User ID is required' };
    }

    if (!preferences) {
      return { success: false, error: 'Preferences are required' };
    }

    const prisma = getPrisma();
    if (!prisma) {
      return { success: false, error: 'Database not available' };
    }

    this.emitLog('⚙️ Updating travel preferences...', 'info');

    try {
      const updatedPrefs = await prisma.userPreferences.upsert({
        where: { userId },
        update: {
          preferredAirlines: preferences.preferredAirlines,
          homeAirport: preferences.homeAirport,
          preferredHotelClass: preferences.preferredHotelClass
        },
        create: {
          userId,
          preferredAirlines: preferences.preferredAirlines || [],
          homeAirport: preferences.homeAirport,
          preferredHotelClass: preferences.preferredHotelClass,
          preferredLanguage: 'javascript',
          preferredJobTypes: [],
          preferredLocations: [],
          preferredCompanies: [],
          completedLists: []
        }
      });

      this.emitLog('✅ Travel preferences updated', 'success');

      return {
        success: true,
        data: { preferences: updatedPrefs }
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
}

// Export singleton instance
export const travelAgent = new TravelAgent();
export default travelAgent;

