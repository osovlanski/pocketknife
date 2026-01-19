/**
 * Israel Travel Types
 * 
 * Types for domestic Israel travel suggestions and recommendations.
 */

export type IsraelRegion = 
  | 'north'         // Galilee, Golan, Haifa, Acre
  | 'center'        // Tel Aviv, Herzliya, Netanya
  | 'jerusalem'     // Jerusalem and surroundings
  | 'dead_sea'      // Dead Sea, Ein Gedi, Masada
  | 'negev'         // Negev Desert, Mitzpe Ramon
  | 'eilat';        // Eilat and Red Sea

export type IsraelActivityType = 
  | 'beaches'
  | 'hiking'
  | 'historical'
  | 'religious'
  | 'nature'
  | 'food_wine'
  | 'nightlife'
  | 'family'
  | 'adventure'
  | 'wellness'
  | 'art_culture';

export type TripDuration = 
  | 'day_trip'      // Same day
  | 'weekend'       // 2-3 days
  | 'extended';     // 4+ days

export type BudgetLevel = 'budget' | 'moderate' | 'luxury';

export interface IsraelDestination {
  id: string;
  name: string;
  nameHebrew: string;
  region: IsraelRegion;
  description: string;
  highlights: string[];
  bestFor: IsraelActivityType[];
  bestSeasons: ('spring' | 'summer' | 'fall' | 'winter')[];
  estimatedCost: {
    budget: number;     // Per person per day in ILS
    moderate: number;
    luxury: number;
  };
  distanceFromTelAviv: number;  // in km
  drivingTime: string;          // e.g., "1.5 hours"
  coordinates: {
    latitude: number;
    longitude: number;
  };
  imageUrl?: string;
  websiteUrl?: string;
}

export interface IsraelAttraction {
  id: string;
  name: string;
  nameHebrew: string;
  description: string;
  type: IsraelActivityType;
  region: IsraelRegion;
  destination: string;          // Parent destination ID
  address: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  openingHours?: string;
  entryFee?: {
    adult: number;              // ILS
    child?: number;
    senior?: number;
  };
  duration: string;             // e.g., "2-3 hours"
  rating?: number;              // 1-5
  reviewCount?: number;
  tips: string[];
  accessibility?: string;
  bookingUrl?: string;
  imageUrl?: string;
}

export interface IsraelRestaurant {
  id: string;
  name: string;
  cuisine: string[];
  priceLevel: BudgetLevel;
  region: IsraelRegion;
  destination: string;
  address: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  rating?: number;
  specialties: string[];
  kosher: boolean;
  vegetarianFriendly: boolean;
  reservationRecommended: boolean;
  averagePrice: number;         // Per person in ILS
  openingHours?: string;
  phone?: string;
  websiteUrl?: string;
}

export interface IsraelAccommodation {
  id: string;
  name: string;
  type: 'hotel' | 'zimmer' | 'hostel' | 'camping' | 'boutique';
  rating: number;               // 1-5 stars
  priceLevel: BudgetLevel;
  region: IsraelRegion;
  destination: string;
  address: string;
  amenities: string[];
  priceRange: {
    min: number;                // Per night in ILS
    max: number;
  };
  bookingUrl?: string;
  imageUrl?: string;
}

export interface IsraelTravelSearchRequest {
  // Natural language prompt (for AI processing)
  prompt?: string;
  
  // Filter options
  regions?: IsraelRegion[];
  activityTypes?: IsraelActivityType[];
  duration?: TripDuration;
  budget?: BudgetLevel;
  
  // Date preferences
  travelDate?: string;          // ISO date
  season?: 'spring' | 'summer' | 'fall' | 'winter';
  
  // Group info
  travelers?: {
    adults: number;
    children?: number;
    infants?: number;
  };
  
  // Preferences
  preferences?: {
    kosherOnly?: boolean;
    accessibilityRequired?: boolean;
    petFriendly?: boolean;
    avoidCrowds?: boolean;
    offTheBeatenPath?: boolean;
  };
  
  // Limit results
  maxResults?: number;
}

export interface IsraelTravelSuggestion {
  destination: IsraelDestination;
  attractions: IsraelAttraction[];
  restaurants: IsraelRestaurant[];
  accommodations?: IsraelAccommodation[];
  estimatedTotalCost: number;   // ILS
  suggestedItinerary?: string[];
  travelTips: string[];
  matchScore: number;           // 0-100, how well it matches the request
  aiRecommendation?: string;    // AI-generated explanation
}

export interface IsraelTravelResponse {
  suggestions: IsraelTravelSuggestion[];
  aiSummary?: string;           // AI-generated summary of recommendations
  searchMeta: {
    query: IsraelTravelSearchRequest;
    timestamp: string;
    totalResults: number;
  };
}

export interface IsraelHikingTrail {
  id: string;
  name: string;
  nameHebrew: string;
  region: IsraelRegion;
  difficulty: 'easy' | 'moderate' | 'challenging' | 'expert';
  length: number;               // in km
  duration: string;             // e.g., "3-4 hours"
  elevation: {
    gain: number;               // in meters
    highest: number;
  };
  waterSources: boolean;
  bestSeasons: string[];
  highlights: string[];
  startPoint: {
    name: string;
    coordinates: { latitude: number; longitude: number };
  };
  endPoint: {
    name: string;
    coordinates: { latitude: number; longitude: number };
  };
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
  entryFee?: number;            // ILS
  parking: boolean;
  parkingFee?: number;
  accessibility: string;
  familyFriendly: boolean;
  waterSports: string[];
  nearbyRestaurants: boolean;
  coordinates: { latitude: number; longitude: number };
}





