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
