// Travel Deals Agent - Frontend Components

export interface TravelSearchPanelProps {
  onSearch: (query: TravelSearchQuery) => void;
  loading: boolean;
}

export interface TravelSearchQuery {
  origin: string;
  destination: string;
  departureDate: string;
  returnDate?: string;
  adults: number;
  children?: number;
  travelClass: 'ECONOMY' | 'PREMIUM_ECONOMY' | 'BUSINESS' | 'FIRST';
  budgetMax?: number;
  directFlights?: boolean;
  generatePlan?: boolean;
}

export interface FlightResult {
  id: string;
  price: {
    total: number;
    currency: string;
    perPerson: number;
  };
  outbound: {
    segments: Array<{
      departure: { airport: string; time: string; terminal?: string };
      arrival: { airport: string; time: string; terminal?: string };
      airline: string;
      flightNumber: string;
      duration: string;
    }>;
    duration: string;
    stops: number;
  };
  inbound?: {
    segments: Array<{
      departure: { airport: string; time: string; terminal?: string };
      arrival: { airport: string; time: string; terminal?: string };
      airline: string;
      flightNumber: string;
      duration: string;
    }>;
    duration: string;
    stops: number;
  };
  validatingAirline?: string;
  dealScore?: number;
}

export interface HotelResult {
  id: string;
  name: string;
  location: {
    address: string;
    city: string;
    country?: string;
  };
  rating: number;
  price: {
    total: number;
    perNight: number;
    currency: string;
    taxesIncluded?: boolean;
  };
  amenities: string[];
  images: string[];
  checkIn?: string;
  checkOut?: string;
  reviewScore?: number;
  reviewCount?: number;
  bookingLink?: string;
  cancellationPolicy?: string;
  dealScore?: number;
}

export interface TripPlan {
  overview: string;
  estimatedBudget: {
    total: number;
    currency: string;
  };
  itinerary: Array<{
    day: number;
    date: string;
    activities: Array<{
      time: string;
      title: string;
      description: string;
    }>;
  }>;
  recommendations: {
    localTips: string[];
    thingsToPack: string[];
  };
}
