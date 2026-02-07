/**
 * Travel Agent
 * 
 * Searches for flights, hotels, and ski deals using Amadeus API.
 * Generates AI-powered trip plans and persists trip history to database.
 * Includes domestic Israel travel recommendations.
 */

import { AbstractAgent } from './AbstractAgent';
import { AgentMetadata, AgentResult, AgentParams } from './types';
import { getManifest } from './manifests';
import travelSearchService from '../services/travel/travelSearchService';
import tripPlanningService from '../services/travel/tripPlanningService';
import specializedTravelService from '../services/travel/specializedTravelService';
import israelTravelService from '../services/travel/israelTravelService';
import { getPrisma } from '../services/core/databaseService';
import { googleSearchService } from '../services/core/googleSearchService';
import { TripSearchRequest } from '../types/travel';
import type { 
  IsraelTravelSearchRequest, 
  IsraelRegion, 
  IsraelActivityType,
  IsraelTravelResponse
} from '../types/israelTravel';

interface TravelParams extends AgentParams {
  action: 'search' | 'search-ski' | 'search-local' | 'search-israel' | 'search-israel-ai' | 'get-israel-destinations' | 'get-israel-trails' | 'get-israel-beaches' | 'generate-plan' | 'save-trip' | 'get-trips' | 'update-preferences';
  searchRequest?: TripSearchRequest;
  generatePlan?: boolean;
  skiPreferences?: {
    skillLevel?: 'beginner' | 'intermediate' | 'advanced';
    priceLevel?: 'budget' | 'mid' | 'premium';
    preferredCountries?: string[];
  };
  localSearchParams?: {
    destination: string;
    type: 'attractions' | 'restaurants' | 'activities' | 'hotels' | 'all';
    query?: string;
  };
  // Israel travel params
  israelSearchRequest?: IsraelTravelSearchRequest;
  israelFilters?: {
    regions?: IsraelRegion[];
    activityTypes?: IsraelActivityType[];
    duration?: 'day_trip' | 'weekend' | 'extended';
    budget?: 'budget' | 'moderate' | 'luxury';
  };
  israelTrailsFilter?: {
    region?: IsraelRegion;
    difficulty?: 'easy' | 'moderate' | 'challenging' | 'expert';
    maxLength?: number;
  };
  israelBeachesFilter?: {
    region?: IsraelRegion;
    type?: 'mediterranean' | 'red_sea' | 'dead_sea' | 'kineret';
    freeOnly?: boolean;
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
  localResults?: LocalSearchResult[];
  savedTrip?: any;
  trips?: any[];
  preferences?: any;
  // Israel travel results
  israelSuggestions?: IsraelTravelResponse;
  israelDestinations?: any[];
  israelTrails?: any[];
  israelBeaches?: any[];
}

interface LocalSearchResult {
  title: string;
  description: string;
  type: string;
  url: string;
  source: string;
  rating?: string;
  location?: string;
  imageUrl?: string;
}

export class TravelAgent extends AbstractAgent {
  readonly metadata: AgentMetadata = getManifest('travel');

  protected async run(params: TravelParams): Promise<AgentResult<TravelResult>> {
    const { action } = params;

    switch (action) {
      case 'search':
        return this.searchTravel(params);
      case 'search-ski':
        return this.searchSkiDeals(params);
      case 'search-local':
        return this.searchLocal(params);
      // Israel travel actions
      case 'search-israel':
        return this.searchIsrael(params);
      case 'search-israel-ai':
        return this.searchIsraelAI(params);
      case 'get-israel-destinations':
        return this.getIsraelDestinations(params);
      case 'get-israel-trails':
        return this.getIsraelTrails(params);
      case 'get-israel-beaches':
        return this.getIsraelBeaches(params);
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
   * Search for local attractions, restaurants, and activities using Google Search
   */
  private async searchLocal(params: TravelParams): Promise<AgentResult<TravelResult>> {
    const { localSearchParams } = params;

    if (!localSearchParams?.destination) {
      return { success: false, error: 'Destination is required for local search' };
    }

    const { destination, type, query } = localSearchParams;

    this.emitLog(`🔍 Searching for ${type} in ${destination}...`, 'info');
    this.emitProgress(10);

    // Check if Google Search is available
    if (!googleSearchService.isAvailable()) {
      this.emitLog('⚠️ Google Search not configured', 'warning');
      return { 
        success: false, 
        error: 'Google Search not configured. Add GOOGLE_CSE_API_KEY and GOOGLE_CSE_ID to .env' 
      };
    }

    if (!googleSearchService.hasQuota()) {
      const status = googleSearchService.getQuotaStatus();
      this.emitLog(`⚠️ Google Search quota exhausted (${status.used}/${status.limit})`, 'warning');
      return { 
        success: false, 
        error: 'Daily search quota exhausted. Try again tomorrow.' 
      };
    }

    try {
      // Build search query based on type
      const searchQueries: Record<string, string> = {
        attractions: `best attractions things to do in ${destination}`,
        restaurants: `best restaurants where to eat in ${destination}`,
        activities: `activities tours experiences in ${destination}`,
        hotels: `best hotels where to stay in ${destination}`,
        all: `travel guide ${destination} attractions restaurants activities`
      };

      const searchQuery = query 
        ? `${query} ${destination}` 
        : searchQueries[type] || searchQueries.all;

      this.emitProgress(30);

      const results = await googleSearchService.searchAndParse(searchQuery, 'travel', {
        maxResults: 10
      });

      this.emitProgress(80);

      // Transform results into LocalSearchResult format
      const localResults: LocalSearchResult[] = results.map(r => ({
        title: r.title,
        description: r.description,
        type: this.inferLocalResultType(r.title, r.description, type),
        url: r.url,
        source: r.source,
        rating: r.metadata?.rating,
        location: r.metadata?.location || destination,
        imageUrl: r.imageUrl
      }));

      this.emitLog(`✅ Found ${localResults.length} results for ${type} in ${destination}`, 'success');
      this.emitProgress(100);

      // Log search quota status
      const quotaStatus = googleSearchService.getQuotaStatus();
      this.emitLog(`📊 Search quota: ${quotaStatus.remaining}/${quotaStatus.limit} remaining`, 'info');

      // Log activity
      await this.saveUserActivity(params.userId, 'search-local', {
        destination,
        type,
        query,
        resultsCount: localResults.length
      });

      return {
        success: true,
        data: { localResults }
      };
    } catch (error: any) {
      this.emitLog(`❌ Local search failed: ${error.message}`, 'error');
      return { success: false, error: error.message };
    }
  }

  /**
   * Infer the type of local result based on content
   */
  private inferLocalResultType(title: string, description: string, requestedType: string): string {
    const content = `${title} ${description}`.toLowerCase();
    
    if (content.includes('restaurant') || content.includes('dining') || content.includes('food') || content.includes('eat')) {
      return 'restaurant';
    }
    if (content.includes('hotel') || content.includes('stay') || content.includes('accommodation')) {
      return 'hotel';
    }
    if (content.includes('tour') || content.includes('activity') || content.includes('experience')) {
      return 'activity';
    }
    if (content.includes('museum') || content.includes('park') || content.includes('landmark') || content.includes('attraction')) {
      return 'attraction';
    }
    
    return requestedType === 'all' ? 'general' : requestedType;
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

  // ===========================================================================
  // ISRAEL TRAVEL METHODS
  // ===========================================================================

  /**
   * Search Israel destinations with filters
   */
  private async searchIsrael(params: TravelParams): Promise<AgentResult<TravelResult>> {
    const { israelSearchRequest, israelFilters } = params;

    this.emitLog('🇮🇱 Searching Israel travel destinations...', 'info');
    this.emitProgress(10);

    try {
      const searchRequest: IsraelTravelSearchRequest = {
        ...israelSearchRequest,
        ...israelFilters
      };

      this.emitProgress(30);

      const results = await israelTravelService.searchDestinations(searchRequest);

      this.emitProgress(80);
      this.emitLog(`✅ Found ${results.suggestions.length} Israel travel suggestions`, 'success');
      this.emitProgress(100);

      // Log activity
      await this.saveUserActivity(params.userId, 'search-israel', {
        filters: israelFilters,
        resultsCount: results.suggestions.length
      });

      return {
        success: true,
        data: { israelSuggestions: results }
      };
    } catch (error: any) {
      this.emitLog(`❌ Israel search failed: ${error.message}`, 'error');
      return { success: false, error: error.message };
    }
  }

  /**
   * Get AI-powered Israel travel suggestions from natural language prompt
   */
  private async searchIsraelAI(params: TravelParams): Promise<AgentResult<TravelResult>> {
    const { israelSearchRequest, israelFilters } = params;

    if (!israelSearchRequest?.prompt) {
      return { success: false, error: 'A travel prompt is required for AI suggestions' };
    }

    this.emitLog('🤖 Generating AI-powered Israel travel suggestions...', 'info');
    this.emitProgress(10);

    try {
      this.emitProgress(20);
      this.emitLog(`📝 Processing: "${israelSearchRequest.prompt}"`, 'info');

      const results = await israelTravelService.getAISuggestions(
        israelSearchRequest.prompt,
        israelFilters
      );

      this.emitProgress(90);

      if (results.aiSummary) {
        this.emitLog(`💡 ${results.aiSummary}`, 'info');
      }

      this.emitLog(`✅ Generated ${results.suggestions.length} personalized suggestions`, 'success');
      this.emitProgress(100);

      // Log activity
      await this.saveUserActivity(params.userId, 'search-israel-ai', {
        prompt: israelSearchRequest.prompt,
        filters: israelFilters,
        resultsCount: results.suggestions.length
      });

      return {
        success: true,
        data: { israelSuggestions: results }
      };
    } catch (error: any) {
      this.emitLog(`❌ AI suggestions failed: ${error.message}`, 'error');
      return { success: false, error: error.message };
    }
  }

  /**
   * Get Israel destinations by region or activity
   */
  private async getIsraelDestinations(params: TravelParams): Promise<AgentResult<TravelResult>> {
    const { israelFilters } = params;

    this.emitLog('🇮🇱 Fetching Israel destinations...', 'info');

    try {
      let destinations;

      if (israelFilters?.regions && israelFilters.regions.length === 1) {
        destinations = israelTravelService.getDestinationsByRegion(israelFilters.regions[0]);
        this.emitLog(`📍 Found ${destinations.length} destinations in ${israelFilters.regions[0]}`, 'info');
      } else if (israelFilters?.activityTypes && israelFilters.activityTypes.length === 1) {
        destinations = israelTravelService.getDestinationsByActivity(israelFilters.activityTypes[0]);
        this.emitLog(`🎯 Found ${destinations.length} destinations for ${israelFilters.activityTypes[0]}`, 'info');
      } else if (israelFilters?.duration === 'day_trip') {
        destinations = israelTravelService.getDayTripSuggestions();
        this.emitLog(`🚗 Found ${destinations.length} day trip options`, 'info');
      } else if (israelFilters?.duration === 'weekend' || israelFilters?.duration === 'extended') {
        destinations = israelTravelService.getWeekendGetaways(israelFilters.budget);
        this.emitLog(`🏕️ Found ${destinations.length} weekend getaway options`, 'info');
      } else {
        destinations = israelTravelService.getAllDestinations();
        this.emitLog(`📋 Retrieved ${destinations.length} total Israel destinations`, 'info');
      }

      return {
        success: true,
        data: { israelDestinations: destinations }
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get Israel hiking trails
   */
  private async getIsraelTrails(params: TravelParams): Promise<AgentResult<TravelResult>> {
    const { israelTrailsFilter } = params;

    this.emitLog('🥾 Fetching Israel hiking trails...', 'info');

    try {
      const trails = israelTravelService.getHikingTrails(israelTrailsFilter);

      this.emitLog(`✅ Found ${trails.length} hiking trails`, 'success');

      return {
        success: true,
        data: { israelTrails: trails }
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get Israel beaches
   */
  private async getIsraelBeaches(params: TravelParams): Promise<AgentResult<TravelResult>> {
    const { israelBeachesFilter } = params;

    this.emitLog('🏖️ Fetching Israel beaches...', 'info');

    try {
      const beaches = israelTravelService.getBeaches(israelBeachesFilter);

      this.emitLog(`✅ Found ${beaches.length} beaches`, 'success');

      return {
        success: true,
        data: { israelBeaches: beaches }
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
}

// Export singleton instance
export const travelAgent = new TravelAgent();
export default travelAgent;

