import axios from 'axios';
import https from 'https';
import type { TripSearchRequest, FlightOffer, HotelOffer, TravelSearchResult, FlexibleDateResult } from '../types/travel';

// HTTPS agent to handle SSL certificate issues in corporate environments
const httpsAgent = new https.Agent({
  rejectUnauthorized: false
});

class TravelSearchService {
  private amadeusToken: string | null = null;
  private tokenExpiry: number = 0;

  /**
   * Get Amadeus access token (cached)
   */
  private async getAmadeusToken(): Promise<string> {
    // Return cached token if still valid
    if (this.amadeusToken && Date.now() < this.tokenExpiry) {
      return this.amadeusToken;
    }

    try {
      const apiKey = process.env.AMADEUS_API_KEY?.trim();
      const apiSecret = process.env.AMADEUS_API_SECRET?.trim();

      if (!apiKey || !apiSecret) {
        throw new Error('Amadeus API credentials not configured');
      }

      console.log('🔐 Getting Amadeus access token...');

      const response = await axios.post(
        'https://test.api.amadeus.com/v1/security/oauth2/token',
        new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: apiKey,
          client_secret: apiSecret
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          httpsAgent
        }
      );

      this.amadeusToken = response.data.access_token;
      // Token expires in 30 minutes, refresh 5 minutes early
      this.tokenExpiry = Date.now() + (response.data.expires_in - 300) * 1000;

      console.log('✅ Amadeus token obtained');
      return this.amadeusToken!;
    } catch (error: any) {
      console.error('❌ Failed to get Amadeus token:', error.response?.data || error.message);
      throw new Error('Failed to authenticate with Amadeus API');
    }
  }

  /**
   * Search for flights using Amadeus API
   */
  async searchFlights(request: TripSearchRequest): Promise<FlightOffer[]> {
    try {
      console.log(`✈️ Searching flights: ${request.origin} → ${request.destinations[0]}`);

      const token = await this.getAmadeusToken();
      const destination = request.destinations[0]; // For now, support single destination

      const params: any = {
        originLocationCode: request.origin,
        destinationLocationCode: destination,
        departureDate: request.departureDate,
        adults: request.passengers.adults,
        travelClass: request.travelClass,
        max: 20
      };

      if (request.returnDate) {
        params.returnDate = request.returnDate;
      }

      if (request.passengers.children) {
        params.children = request.passengers.children;
      }

      if (request.passengers.infants) {
        params.infants = request.passengers.infants;
      }

      if (request.directFlightsOnly) {
        params.nonStop = true;
      }

      if (request.budget?.max) {
        params.maxPrice = request.budget.max;
      }

      const response = await axios.get(
        'https://test.api.amadeus.com/v2/shopping/flight-offers',
        {
          params,
          headers: {
            'Authorization': `Bearer ${token}`
          },
          httpsAgent
        }
      );

      const offers = response.data.data || [];
      console.log(`✅ Found ${offers.length} flight offers`);

      // Transform Amadeus response to our format
      const flights: FlightOffer[] = offers.map((offer: any) => {
        const price = parseFloat(offer.price.total);
        const perPerson = price / request.passengers.adults;

        // Parse outbound itinerary
        const outboundSegments = offer.itineraries[0].segments.map((seg: any) => ({
          departure: {
            airport: seg.departure.iataCode,
            terminal: seg.departure.terminal,
            time: seg.departure.at
          },
          arrival: {
            airport: seg.arrival.iataCode,
            terminal: seg.arrival.terminal,
            time: seg.arrival.at
          },
          airline: seg.carrierCode,
          flightNumber: `${seg.carrierCode}${seg.number}`,
          aircraft: seg.aircraft?.code,
          duration: seg.duration,
          stops: 0
        }));

        // Parse inbound itinerary (if round trip)
        let inboundSegments = undefined;
        if (offer.itineraries.length > 1) {
          inboundSegments = offer.itineraries[1].segments.map((seg: any) => ({
            departure: {
              airport: seg.departure.iataCode,
              terminal: seg.departure.terminal,
              time: seg.departure.at
            },
            arrival: {
              airport: seg.arrival.iataCode,
              terminal: seg.arrival.terminal,
              time: seg.arrival.at
            },
            airline: seg.carrierCode,
            flightNumber: `${seg.carrierCode}${seg.number}`,
            aircraft: seg.aircraft?.code,
            duration: seg.duration,
            stops: 0
          }));
        }

        return {
          id: offer.id,
          price: {
            total: price,
            currency: offer.price.currency,
            perPerson
          },
          outbound: {
            segments: outboundSegments,
            duration: offer.itineraries[0].duration,
            stops: outboundSegments.length - 1
          },
          inbound: inboundSegments ? {
            segments: inboundSegments,
            duration: offer.itineraries[1].duration,
            stops: inboundSegments.length - 1
          } : undefined,
          validatingAirline: offer.validatingAirlineCodes[0],
          lastUpdated: new Date().toISOString()
        };
      });

      // Calculate deal scores
      const scoredFlights = this.calculateFlightDealScores(flights, request);

      return scoredFlights;
    } catch (error: any) {
      if (error.response?.status === 401) {
        console.error('❌ Amadeus authentication failed');
        throw new Error('Travel API authentication failed. Please check API credentials.');
      } else if (error.response?.status === 400) {
        console.error('❌ Invalid search parameters:', error.response.data);
        throw new Error('Invalid search parameters. Please check your input.');
      } else {
        console.error('❌ Error searching flights:', error.response?.data || error.message);
        throw new Error('Failed to search flights. Please try again.');
      }
    }
  }

  /**
   * Search for hotels using Amadeus API
   */
  async searchHotels(request: TripSearchRequest): Promise<HotelOffer[]> {
    try {
      const destination = request.destinations[0];
      console.log(`🏨 Searching hotels in ${destination}`);

      const token = await this.getAmadeusToken();

      // Step 1: Search for hotels by city using Hotel List API (v1)
      const hotelListParams: any = {
        cityCode: destination,
        radius: 20,
        radiusUnit: 'KM',
        hotelSource: 'ALL'
      };

      if (request.preferences?.hotelRating && request.preferences.hotelRating > 0) {
        hotelListParams.ratings = request.preferences.hotelRating;
      }

      console.log(`🔍 Searching for hotels in ${destination}...`);
      
      const hotelListResponse = await axios.get(
        'https://test.api.amadeus.com/v1/reference-data/locations/hotels/by-city',
        {
          params: hotelListParams,
          headers: {
            'Authorization': `Bearer ${token}`
          },
          httpsAgent
        }
      );

      const hotelList = hotelListResponse.data.data || [];
      
      if (hotelList.length === 0) {
        console.log(`⚠️ No hotels found in ${destination}`);
        return [];
      }

      console.log(`✅ Found ${hotelList.length} hotels in ${destination}`);

      // Step 2: Get offers for the first 20 hotels
      const hotelIds = hotelList.slice(0, 20).map((h: any) => h.hotelId).join(',');
      
      const offersParams: any = {
        hotelIds,
        checkInDate: request.departureDate,
        checkOutDate: request.returnDate || request.departureDate,
        adults: request.passengers.adults,
        currency: 'USD',
        bestRateOnly: true
      };

      console.log(`💰 Getting offers for ${hotelIds.split(',').length} hotels...`);

      const offersResponse = await axios.get(
        'https://test.api.amadeus.com/v3/shopping/hotel-offers',
        {
          params: offersParams,
          headers: {
            'Authorization': `Bearer ${token}`
          },
          httpsAgent
        }
      );

      const offers = offersResponse.data.data || [];
      console.log(`✅ Found ${offers.length} hotel offers with pricing`);

      // Transform to our format
      const hotels: HotelOffer[] = offers.slice(0, 20).map((offer: any) => {
        const hotel = offer.hotel;
        const bestOffer = offer.offers[0]; // Take cheapest offer

        const totalPrice = parseFloat(bestOffer.price.total);
        const nights = this.calculateNights(request.departureDate, request.returnDate);
        const perNight = nights > 0 ? totalPrice / nights : totalPrice;

        return {
          id: hotel.hotelId,
          name: hotel.name,
          location: {
            address: hotel.address?.lines?.join(', ') || '',
            city: hotel.address?.cityName || destination,
            country: hotel.address?.countryCode || '',
            coordinates: hotel.latitude && hotel.longitude ? {
              latitude: parseFloat(hotel.latitude),
              longitude: parseFloat(hotel.longitude)
            } : undefined
          },
          rating: hotel.rating ? parseInt(hotel.rating) : 3,
          price: {
            total: totalPrice,
            perNight,
            currency: bestOffer.price.currency,
            taxesIncluded: true
          },
          amenities: hotel.amenities || [],
          images: hotel.media?.map((m: any) => m.uri) || [],
          checkIn: request.departureDate,
          checkOut: request.returnDate || request.departureDate,
          roomType: bestOffer.room?.type || 'Standard',
          bookingLink: `https://www.amadeus.com/hotel/${hotel.hotelId}`,
          cancellationPolicy: bestOffer.policies?.cancellation?.description
        };
      });

      // Calculate deal scores
      const scoredHotels = this.calculateHotelDealScores(hotels, request);

      return scoredHotels;
    } catch (error: any) {
      console.error('❌ Error searching hotels:', error.response?.data || error.message);
      // Return empty array on error (hotels are optional)
      return [];
    }
  }

  /**
   * Search for best flight deals across multiple dates
   * NEW: Flexible date search
   */
  async searchFlexibleDates(request: TripSearchRequest): Promise<{
    bestDeals: FlexibleDateResult[];
    allFlights: FlightOffer[];
    cheapestDate: string;
    priceRange: { min: number; max: number };
  }> {
    try {
      console.log(`📅 Searching flexible dates from ${request.flexibleDateRange?.start} to ${request.flexibleDateRange?.end}`);
      
      if (!request.flexibleDateRange) {
        throw new Error('Flexible date range is required for flexible search');
      }

      const startDate = new Date(request.flexibleDateRange.start);
      const endDate = new Date(request.flexibleDateRange.end);
      const tripDuration = request.tripDuration || 7; // Default 7 days
      
      // Generate list of departure dates
      const searchDates: string[] = [];
      const currentDate = new Date(startDate);
      
      while (currentDate <= endDate) {
        searchDates.push(currentDate.toISOString().split('T')[0]);
        currentDate.setDate(currentDate.getDate() + 1);
      }

      console.log(`🔍 Searching ${searchDates.length} different dates...`);

      // Search flights for each date
      const dateResults: FlexibleDateResult[] = [];
      const allFlights: FlightOffer[] = [];

      for (const departureDate of searchDates) {
        try {
          // Calculate return date
          const returnDate = new Date(departureDate);
          returnDate.setDate(returnDate.getDate() + tripDuration);
          
          const searchRequest: TripSearchRequest = {
            ...request,
            departureDate,
            returnDate: returnDate.toISOString().split('T')[0]
          };

          const flights = await this.searchFlights(searchRequest);
          
          if (flights.length > 0) {
            // Find cheapest flight for this date
            const sortedByPrice = [...flights].sort((a, b) => a.price.total - b.price.total);
            const cheapest = sortedByPrice[0];

            dateResults.push({
              date: departureDate,
              price: cheapest.price.total,
              flightCount: flights.length,
              bestDeal: cheapest
            });

            allFlights.push(...flights);
          }

          // Add delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 200));
          
        } catch (error) {
          console.error(`❌ Error searching date ${departureDate}:`, error);
          // Continue with next date
        }
      }

      // Sort by price
      const sortedResults = dateResults.sort((a, b) => a.price - b.price);
      
      // Calculate price range
      const prices = dateResults.map(r => r.price);
      const priceRange = {
        min: Math.min(...prices),
        max: Math.max(...prices)
      };

      console.log(`✅ Found deals for ${dateResults.length} dates`);
      console.log(`💰 Price range: $${priceRange.min} - $${priceRange.max}`);
      console.log(`🏆 Best deal: ${sortedResults[0]?.date} at $${sortedResults[0]?.price}`);

      return {
        bestDeals: sortedResults.slice(0, 10), // Top 10 best deals
        allFlights,
        cheapestDate: sortedResults[0]?.date || '',
        priceRange
      };
    } catch (error: any) {
      console.error('❌ Error in flexible date search:', error);
      throw error;
    }
  }

  /**
   * Calculate deal scores for flights (0-100)
   */
  private calculateFlightDealScores(flights: FlightOffer[], request: TripSearchRequest): FlightOffer[] {
    if (flights.length === 0) return flights;

    const prices = flights.map(f => f.price.total);
    const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
    const minPrice = Math.min(...prices);

    return flights.map(flight => {
      let score = 100;

      // Price score (40 points)
      const priceRatio = flight.price.total / avgPrice;
      if (priceRatio <= 0.7) score += 0; // Already excellent
      else if (priceRatio <= 0.9) score -= 10;
      else if (priceRatio <= 1.1) score -= 20;
      else score -= 40;

      // Stops penalty (30 points)
      score -= flight.outbound.stops * 15;
      if (flight.inbound) score -= flight.inbound.stops * 15;

      // Budget fit (20 points)
      if (request.budget?.max) {
        if (flight.price.total <= request.budget.max * 0.8) score += 0;
        else if (flight.price.total <= request.budget.max) score -= 10;
        else score -= 20;
      }

      // Duration penalty (10 points)
      const totalMinutes = this.parseDuration(flight.outbound.duration);
      if (totalMinutes > 12 * 60) score -= 10; // Over 12 hours

      return {
        ...flight,
        dealScore: Math.max(0, Math.min(100, score))
      };
    }).sort((a, b) => (b.dealScore || 0) - (a.dealScore || 0));
  }

  /**
   * Calculate deal scores for hotels (0-100)
   */
  private calculateHotelDealScores(hotels: HotelOffer[], request: TripSearchRequest): HotelOffer[] {
    if (hotels.length === 0) return hotels;

    const prices = hotels.map(h => h.price.perNight);
    const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;

    return hotels.map(hotel => {
      let score = 100;

      // Price score (40 points)
      const priceRatio = hotel.price.perNight / avgPrice;
      if (priceRatio <= 0.7) score += 0;
      else if (priceRatio <= 0.9) score -= 10;
      else if (priceRatio <= 1.1) score -= 20;
      else score -= 40;

      // Rating score (30 points)
      if (hotel.rating >= 4) score += 0;
      else if (hotel.rating >= 3) score -= 10;
      else score -= 30;

      // Review score (20 points)
      if (hotel.reviewScore) {
        if (hotel.reviewScore >= 8) score += 0;
        else if (hotel.reviewScore >= 6) score -= 10;
        else score -= 20;
      }

      // Amenities bonus (10 points)
      if (hotel.amenities.length >= 5) score += 0;
      else score -= 5;

      return {
        ...hotel,
        dealScore: Math.max(0, Math.min(100, score))
      };
    }).sort((a, b) => (b.dealScore || 0) - (a.dealScore || 0));
  }

  /**
   * Parse ISO 8601 duration to minutes
   */
  private parseDuration(duration: string): number {
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
    if (!match) return 0;
    const hours = parseInt(match[1] || '0');
    const minutes = parseInt(match[2] || '0');
    return hours * 60 + minutes;
  }

  /**
   * Calculate number of nights between dates
   */
  private calculateNights(checkIn: string, checkOut?: string): number {
    if (!checkOut) return 1;
    const start = new Date(checkIn);
    const end = new Date(checkOut);
    const diff = end.getTime() - start.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }

  /**
   * Search for complete travel package
   */
  async searchTravel(request: TripSearchRequest, io?: any): Promise<TravelSearchResult> {
    try {
      if (io) {
        io.emit('travel-log', {
          message: `🌍 Searching travel options for ${request.destinations[0]}...`,
          type: 'info'
        });
      }

      // Search flights and hotels in parallel
      const [flights, hotels] = await Promise.all([
        this.searchFlights(request).catch(() => []),
        this.searchHotels(request).catch(() => [])
      ]);

      if (io) {
        io.emit('travel-log', {
          message: `✅ Found ${flights.length} flights and ${hotels.length} hotels`,
          type: 'success'
        });
      }

      return {
        flights,
        hotels,
        searchMeta: {
          query: request,
          timestamp: new Date().toISOString(),
          resultsCount: {
            flights: flights.length,
            hotels: hotels.length
          }
        }
      };
    } catch (error: any) {
      console.error('❌ Error in travel search:', error);
      throw error;
    }
  }
}

export default new TravelSearchService();
