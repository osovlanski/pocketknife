import axios from 'axios';
import type { TravelSearchQuery, FlightResult, HotelResult, TripPlan } from '../types/travel';
import { API_BASE_URL } from '../config';
import logger from './logger';

const API_URL = API_BASE_URL;

export interface TravelSearchResponse {
  flights: FlightResult[];
  hotels: HotelResult[];
  tripPlan?: TripPlan;
  searchMeta: {
    query: any;
    timestamp: string;
    resultsCount: {
      flights: number;
      hotels: number;
    };
  };
}

export const searchTravel = async (query: TravelSearchQuery): Promise<TravelSearchResponse> => {
  try {
    const response = await axios.post(`${API_URL}/travel/search`, {
      origin: query.origin,
      destinations: [query.destination],
      departureDate: query.departureDate,
      returnDate: query.returnDate,
      passengers: {
        adults: query.adults,
        children: query.children || 0
      },
      travelClass: query.travelClass,
      budget: query.budgetMax ? {
        max: query.budgetMax,
        currency: 'USD'
      } : undefined,
      directFlightsOnly: query.directFlights || false,
      preferences: {
        hotelRating: 4
      },
      generatePlan: query.generatePlan || false
    });
    
    return response.data;
  } catch (error: any) {
    logger.error('Travel search error', { error: error.message });
    throw new Error(error.response?.data?.error || 'Failed to search travel options');
  }
};

export const getDestinationRecommendations = async (budget?: number, interests?: string[]) => {
  try {
    const params = new URLSearchParams();
    if (budget) params.append('budget', budget.toString());
    if (interests && interests.length > 0) params.append('interests', interests.join(','));
    
    const response = await axios.get(`${API_URL}/travel/recommendations?${params}`);
    return response.data.recommendations;
  } catch (error: any) {
    logger.error('Recommendations error', { error: error.message });
    throw new Error('Failed to get recommendations');
  }
};

export const generateTripPlan = async (
  query: TravelSearchQuery,
  flightPrice?: number,
  hotelPrice?: number
): Promise<TripPlan> => {
  try {
    const response = await axios.post(`${API_URL}/travel/plan`, {
      origin: query.origin,
      destinations: [query.destination],
      departureDate: query.departureDate,
      returnDate: query.returnDate,
      passengers: {
        adults: query.adults,
        children: query.children || 0
      },
      travelClass: query.travelClass,
      flightPrice,
      hotelPrice
    });
    
    return response.data.tripPlan;
  } catch (error: any) {
    logger.error('Trip plan error', { error: error.message });
    throw new Error('Failed to generate trip plan');
  }
};

// Ski Deals Types
export interface SkiResort {
  id: string;
  name: string;
  country: string;
  region: string;
  airportCode: string;
  altitude: { base: number; peak: number };
  slopes: { total: number; beginner: number; intermediate: number; advanced: number };
  lifts: number;
  priceLevel?: 'budget' | 'mid' | 'premium';
}

export interface SkiDeal {
  resort: SkiResort;
  flights: FlightResult[];
  hotels: HotelResult[];
  totalEstimate: number;
  dealScore: number;
}

export interface SkiSearchQuery {
  origin: string;
  departureDate: string;
  returnDate?: string;
  passengers?: { adults: number; children?: number };
  preferences?: {
    skillLevel?: 'beginner' | 'intermediate' | 'advanced';
    priceLevel?: 'budget' | 'mid' | 'premium';
    preferredCountries?: string[];
  };
}

export const searchSkiDeals = async (query: SkiSearchQuery): Promise<{ deals: SkiDeal[]; stopped?: boolean }> => {
  try {
    const response = await axios.post(`${API_URL}/travel/ski`, query);
    return response.data;
  } catch (error: any) {
    logger.error('Ski deals search error', { error: error.message });
    throw new Error(error.response?.data?.error || 'Failed to search ski deals');
  }
};

export const getSkiResorts = async (country?: string, priceLevel?: string): Promise<SkiResort[]> => {
  try {
    const params = new URLSearchParams();
    if (country) params.append('country', country);
    if (priceLevel) params.append('priceLevel', priceLevel);
    
    const response = await axios.get(`${API_URL}/travel/ski/resorts?${params}`);
    return response.data.resorts;
  } catch (error: any) {
    logger.error('Ski resorts error', { error: error.message });
    throw new Error('Failed to get ski resorts');
  }
};

// Stop travel search
export const stopTravelSearch = async (): Promise<void> => {
  try {
    await axios.post(`${API_URL}/stop`, { processId: 'travel' });
  } catch (error: any) {
    logger.error('Stop travel error', { error: error.message });
  }
};

// Stop ski search
export const stopSkiSearch = async (): Promise<void> => {
  try {
    await axios.post(`${API_URL}/stop`, { processId: 'ski' });
  } catch (error: any) {
    logger.error('Stop ski error', { error: error.message });
  }
};

// =============================================================================
// ISRAEL TRAVEL API
// =============================================================================

export type IsraelRegion = 'north' | 'center' | 'jerusalem' | 'dead_sea' | 'negev' | 'eilat';
export type IsraelActivityType = 'beaches' | 'hiking' | 'historical' | 'religious' | 'nature' | 'food_wine' | 'wellness' | 'adventure' | 'family' | 'nightlife' | 'art_culture';
export type TripDuration = 'day_trip' | 'weekend' | 'extended';
export type BudgetLevel = 'budget' | 'moderate' | 'luxury';

export interface IsraelDestination {
  id: string;
  name: string;
  nameHebrew: string;
  region: IsraelRegion;
  description: string;
  highlights: string[];
  bestFor: IsraelActivityType[];
  bestSeasons: string[];
  estimatedCost: { budget: number; moderate: number; luxury: number };
  distanceFromTelAviv: number;
  drivingTime: string;
  coordinates: { latitude: number; longitude: number };
}

export interface IsraelHikingTrail {
  id: string;
  name: string;
  nameHebrew: string;
  region: IsraelRegion;
  difficulty: 'easy' | 'moderate' | 'challenging' | 'expert';
  length: number;
  duration: string;
  elevation: { gain: number; highest: number };
  waterSources: boolean;
  bestSeasons: string[];
  highlights: string[];
  startPoint: { name: string; coordinates: { latitude: number; longitude: number } };
  endPoint: { name: string; coordinates: { latitude: number; longitude: number } };
  isCircular: boolean;
  tips: string[];
  requiredGear: string[];
}

export interface IsraelBeach {
  id: string;
  name: string;
  nameHebrew: string;
  region: IsraelRegion;
  city: string;
  type: 'mediterranean' | 'red_sea' | 'dead_sea' | 'kineret';
  facilities: string[];
  lifeguard: boolean;
  freeEntry: boolean;
  entryFee?: number;
  parking: boolean;
  parkingFee?: number;
  accessibility: string;
  familyFriendly: boolean;
  waterSports: string[];
  nearbyRestaurants: boolean;
  coordinates: { latitude: number; longitude: number };
}

export interface IsraelTravelSuggestion {
  destination: IsraelDestination;
  attractions: any[];
  restaurants: any[];
  estimatedTotalCost: number;
  suggestedItinerary?: string[];
  travelTips: string[];
  matchScore: number;
  aiRecommendation?: string;
}

export interface IsraelTravelSearchRequest {
  prompt?: string;
  regions?: IsraelRegion[];
  activityTypes?: IsraelActivityType[];
  duration?: TripDuration;
  budget?: BudgetLevel;
  travelDate?: string;
  season?: 'spring' | 'summer' | 'fall' | 'winter';
  preferences?: {
    kosherOnly?: boolean;
    accessibilityRequired?: boolean;
    petFriendly?: boolean;
  };
  maxResults?: number;
}

export interface IsraelTravelResponse {
  success: boolean;
  suggestions: IsraelTravelSuggestion[];
  aiSummary?: string;
  searchMeta: {
    query: any;
    timestamp: string;
    totalResults: number;
  };
}

/**
 * Search Israel destinations with filters
 */
export const searchIsraelDestinations = async (
  request: IsraelTravelSearchRequest
): Promise<IsraelTravelResponse> => {
  try {
    const response = await axios.post(`${API_URL}/travel/israel/search`, request);
    return response.data;
  } catch (error: any) {
    logger.error('Israel search error', { error: error.message });
    throw new Error(error.response?.data?.error || 'Failed to search Israel destinations');
  }
};

/**
 * Get AI-powered Israel travel suggestions from natural language prompt
 */
export const searchIsraelAI = async (
  prompt: string,
  filters?: Partial<IsraelTravelSearchRequest>
): Promise<IsraelTravelResponse> => {
  try {
    const response = await axios.post(`${API_URL}/travel/israel/ai`, { prompt, filters });
    return response.data;
  } catch (error: any) {
    logger.error('Israel AI search error', { error: error.message });
    throw new Error(error.response?.data?.error || 'Failed to get AI suggestions');
  }
};

/**
 * Get Israel destinations list with optional filters
 */
export const getIsraelDestinations = async (params?: {
  region?: IsraelRegion;
  activity?: IsraelActivityType;
  duration?: TripDuration;
  budget?: BudgetLevel;
}): Promise<{ destinations: IsraelDestination[] }> => {
  try {
    const queryParams = new URLSearchParams();
    if (params?.region) queryParams.append('region', params.region);
    if (params?.activity) queryParams.append('activity', params.activity);
    if (params?.duration) queryParams.append('duration', params.duration);
    if (params?.budget) queryParams.append('budget', params.budget);
    
    const response = await axios.get(`${API_URL}/travel/israel/destinations?${queryParams}`);
    return response.data;
  } catch (error: any) {
    logger.error('Get Israel destinations error', { error: error.message });
    throw new Error('Failed to get Israel destinations');
  }
};

/**
 * Get Israel hiking trails
 */
export const getIsraelTrails = async (params?: {
  region?: IsraelRegion;
  difficulty?: 'easy' | 'moderate' | 'challenging' | 'expert';
  maxLength?: number;
}): Promise<{ trails: IsraelHikingTrail[] }> => {
  try {
    const queryParams = new URLSearchParams();
    if (params?.region) queryParams.append('region', params.region);
    if (params?.difficulty) queryParams.append('difficulty', params.difficulty);
    if (params?.maxLength) queryParams.append('maxLength', params.maxLength.toString());
    
    const response = await axios.get(`${API_URL}/travel/israel/trails?${queryParams}`);
    return response.data;
  } catch (error: any) {
    logger.error('Get Israel trails error', { error: error.message });
    throw new Error('Failed to get Israel trails');
  }
};

/**
 * Get Israel beaches
 */
export const getIsraelBeaches = async (params?: {
  region?: IsraelRegion;
  type?: 'mediterranean' | 'red_sea' | 'dead_sea' | 'kineret';
  freeOnly?: boolean;
}): Promise<{ beaches: IsraelBeach[] }> => {
  try {
    const queryParams = new URLSearchParams();
    if (params?.region) queryParams.append('region', params.region);
    if (params?.type) queryParams.append('type', params.type);
    if (params?.freeOnly) queryParams.append('freeOnly', 'true');
    
    const response = await axios.get(`${API_URL}/travel/israel/beaches?${queryParams}`);
    return response.data;
  } catch (error: any) {
    logger.error('Get Israel beaches error', { error: error.message });
    throw new Error('Failed to get Israel beaches');
  }
};