// Travel-related TypeScript interfaces

export interface TripSearchRequest {
  origin: string;              // IATA code (e.g., "TLV")
  destinations: string[];      // IATA codes (e.g., ["BCN", "PAR"])
  departureDate: string;       // ISO date
  returnDate?: string;         // ISO date
  tripDuration?: number;       // Number of days (alternative to returnDate)
  dateFlexibility?: 'exact' | 'flexible' | 'anytime'; // NEW: Date flexibility
  flexibleDateRange?: {        // NEW: Date range for flexible search
    start: string;             // Earliest departure (ISO date)
    end: string;               // Latest departure (ISO date)
  };
  passengers: {
    adults: number;
    children?: number;
    infants?: number;
  };
  travelClass: 'ECONOMY' | 'PREMIUM_ECONOMY' | 'BUSINESS' | 'FIRST';
  budget?: {
    max: number;
    currency: 'USD' | 'EUR' | 'ILS';
  };
  flexibleDates?: boolean;     // ±3 days (deprecated, use dateFlexibility)
  directFlightsOnly?: boolean;
  preferences?: {
    airlines?: string[];
    hotelRating?: number;      // 1-5
    accommodation?: 'hotel' | 'apartment' | 'hostel';
  };
}

export interface FlightSegment {
  departure: {
    airport: string;           // IATA code
    terminal?: string;
    time: string;              // ISO datetime
  };
  arrival: {
    airport: string;
    terminal?: string;
    time: string;
  };
  airline: string;             // IATA code (e.g., "LY")
  flightNumber: string;
  aircraft?: string;
  duration: string;            // ISO 8601 duration (e.g., "PT2H30M")
  stops: number;
}

export interface FlightItinerary {
  segments: FlightSegment[];
  duration: string;
  stops: number;
}

export interface FlightOffer {
  id: string;
  price: {
    total: number;
    currency: string;
    perPerson: number;
  };
  outbound: FlightItinerary;
  inbound?: FlightItinerary;   // For round trips
  validatingAirline: string;
  bookingLink?: string;
  dealScore?: number;          // 0-100
  lastUpdated: string;
}

export interface HotelOffer {
  id: string;
  name: string;
  location: {
    address: string;
    city: string;
    country: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
  };
  rating: number;              // 1-5 stars
  reviewScore?: number;        // 1-10
  reviewCount?: number;
  price: {
    total: number;
    perNight: number;
    currency: string;
    taxesIncluded: boolean;
  };
  amenities: string[];
  images: string[];
  checkIn: string;
  checkOut: string;
  roomType?: string;
  bookingLink: string;
  dealScore?: number;          // 0-100
  cancellationPolicy?: string;
}

export interface DayActivity {
  time: string;
  title: string;
  description: string;
  estimatedCost?: number;
  location?: string;
  tips?: string[];
}

export interface ItineraryDay {
  day: number;
  date: string;
  location: string;
  activities: DayActivity[];
  meals?: {
    breakfast?: string;
    lunch?: string;
    dinner?: string;
  };
}

export interface TripPlan {
  overview: string;
  destinations: string[];
  duration: {
    days: number;
    nights: number;
  };
  estimatedBudget: {
    flights: number;
    hotels: number;
    activities: number;
    meals: number;
    transportation: number;
    total: number;
    currency: string;
  };
  itinerary: ItineraryDay[];
  recommendations: {
    bestTimeToBook?: string;
    weatherForecast?: string;
    localTips: string[];
    thingsToPack: string[];
    visaRequirements?: string;
    healthAndSafety?: string[];
  };
  alternativeOptions?: {
    cheaperDates?: string[];
    nearbyDestinations?: string[];
    budgetSavingTips?: string[];
  };
}

export interface TravelSearchResult {
  flights: FlightOffer[];
  hotels: HotelOffer[];
  tripPlan?: TripPlan;
  searchMeta: {
    query: TripSearchRequest;
    timestamp: string;
    resultsCount: {
      flights: number;
      hotels: number;
    };
  };
}

export interface FlexibleDateResult {
  date: string;                // Departure date
  price: number;
  flightCount: number;
  bestDeal?: FlightOffer;
}

export interface DestinationRecommendation {
  city: string;
  country: string;
  airportCode: string;
  estimatedFlightCost: number;
  bestTime: string;
  why: string;
  highlights: string[];        // NEW: Top attractions
  localCuisine: string[];      // NEW: Must-try dishes
  transportation: string;      // NEW: How to get around
  tips: string[];              // NEW: Travel tips
  visaRequired: boolean;
  flightDuration: string;
}
