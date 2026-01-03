import axios from 'axios';
import type { TravelSearchQuery, FlightResult, HotelResult, TripPlan } from '../types/travel';

const API_URL = 'http://localhost:5000/api';

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
    console.error('Travel search error:', error);
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
    console.error('Recommendations error:', error);
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
    console.error('Trip plan error:', error);
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
    console.error('Ski deals search error:', error);
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
    console.error('Ski resorts error:', error);
    throw new Error('Failed to get ski resorts');
  }
};

// Stop travel search
export const stopTravelSearch = async (): Promise<void> => {
  try {
    await axios.post(`${API_URL}/stop`, { processId: 'travel' });
  } catch (error: any) {
    console.error('Stop travel error:', error);
  }
};

// Stop ski search
export const stopSkiSearch = async (): Promise<void> => {
  try {
    await axios.post(`${API_URL}/stop`, { processId: 'ski' });
  } catch (error: any) {
    console.error('Stop ski error:', error);
  }
};