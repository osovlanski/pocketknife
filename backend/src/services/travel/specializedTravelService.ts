import axios from 'axios';
import travelSearchService from './travelSearchService';
import type { TripSearchRequest, FlightOffer, HotelOffer } from '../../types/travel';

interface SkiResort {
  id: string;
  name: string;
  country: string;
  region: string;
  airportCode: string;
  altitude: { base: number; peak: number };
  slopes: { total: number; beginner: number; intermediate: number; advanced: number };
  lifts: number;
  snowCondition?: string;
  rating?: number;
  priceLevel?: 'budget' | 'mid' | 'premium';
}

interface SkiDeal {
  resort: SkiResort;
  flights: FlightOffer[];
  hotels: HotelOffer[];
  totalEstimate: number;
  dealScore: number;
  packageUrl?: string;
}

interface BeachDestination {
  id: string;
  name: string;
  country: string;
  airportCode: string;
  bestMonths: number[];
  averageTemp: number;
  beachRating: number;
}

class SpecializedTravelService {
  // Popular ski resorts with their nearest airports
  private skiResorts: SkiResort[] = [
    {
      id: 'verbier',
      name: 'Verbier',
      country: 'Switzerland',
      region: 'Valais',
      airportCode: 'GVA', // Geneva
      altitude: { base: 1500, peak: 3330 },
      slopes: { total: 410, beginner: 30, intermediate: 180, advanced: 200 },
      lifts: 89,
      priceLevel: 'premium'
    },
    {
      id: 'chamonix',
      name: 'Chamonix',
      country: 'France',
      region: 'French Alps',
      airportCode: 'GVA',
      altitude: { base: 1035, peak: 3842 },
      slopes: { total: 170, beginner: 20, intermediate: 80, advanced: 70 },
      lifts: 47,
      priceLevel: 'mid'
    },
    {
      id: 'zermatt',
      name: 'Zermatt',
      country: 'Switzerland',
      region: 'Valais',
      airportCode: 'ZRH', // Zurich
      altitude: { base: 1620, peak: 3883 },
      slopes: { total: 360, beginner: 50, intermediate: 180, advanced: 130 },
      lifts: 52,
      priceLevel: 'premium'
    },
    {
      id: 'courchevel',
      name: 'Courchevel',
      country: 'France',
      region: 'French Alps',
      airportCode: 'GVA',
      altitude: { base: 1300, peak: 2738 },
      slopes: { total: 150, beginner: 40, intermediate: 80, advanced: 30 },
      lifts: 58,
      priceLevel: 'premium'
    },
    {
      id: 'st-anton',
      name: 'St. Anton',
      country: 'Austria',
      region: 'Tyrol',
      airportCode: 'INN', // Innsbruck
      altitude: { base: 1304, peak: 2811 },
      slopes: { total: 305, beginner: 50, intermediate: 150, advanced: 105 },
      lifts: 88,
      priceLevel: 'mid'
    },
    {
      id: 'val-disere',
      name: 'Val d\'Isère',
      country: 'France',
      region: 'French Alps',
      airportCode: 'GVA',
      altitude: { base: 1850, peak: 3456 },
      slopes: { total: 300, beginner: 45, intermediate: 170, advanced: 85 },
      lifts: 79,
      priceLevel: 'premium'
    },
    {
      id: 'bansko',
      name: 'Bansko',
      country: 'Bulgaria',
      region: 'Pirin Mountains',
      airportCode: 'SOF', // Sofia
      altitude: { base: 990, peak: 2600 },
      slopes: { total: 75, beginner: 20, intermediate: 40, advanced: 15 },
      lifts: 14,
      priceLevel: 'budget'
    },
    {
      id: 'livigno',
      name: 'Livigno',
      country: 'Italy',
      region: 'Lombardy',
      airportCode: 'MXP', // Milan
      altitude: { base: 1816, peak: 2798 },
      slopes: { total: 115, beginner: 30, intermediate: 60, advanced: 25 },
      lifts: 31,
      priceLevel: 'mid'
    },
    {
      id: 'kitzbuhel',
      name: 'Kitzbühel',
      country: 'Austria',
      region: 'Tyrol',
      airportCode: 'SZG', // Salzburg
      altitude: { base: 800, peak: 2000 },
      slopes: { total: 170, beginner: 35, intermediate: 90, advanced: 45 },
      lifts: 54,
      priceLevel: 'mid'
    },
    {
      id: 'cervinia',
      name: 'Cervinia',
      country: 'Italy',
      region: 'Aosta Valley',
      airportCode: 'TRN', // Turin
      altitude: { base: 2050, peak: 3480 },
      slopes: { total: 150, beginner: 25, intermediate: 85, advanced: 40 },
      lifts: 21,
      priceLevel: 'mid'
    }
  ];

  /**
   * Search for ski trip deals
   */
  async searchSkiDeals(
    request: TripSearchRequest,
    preferences?: {
      skillLevel?: 'beginner' | 'intermediate' | 'advanced';
      priceLevel?: 'budget' | 'mid' | 'premium';
      preferredCountries?: string[];
    },
    io?: any,
    shouldStop?: () => boolean
  ): Promise<SkiDeal[]> {
    console.log('⛷️ Searching for ski trip deals...');

    if (io) {
      io.emit('travel-log', {
        message: '⛷️ Searching ski resorts across Europe...',
        type: 'info'
      });
      io.emit('log', {
        message: '⛷️ Searching ski resorts across Europe...',
        type: 'info',
        agent: 'travel'
      });
    }

    // Filter resorts based on preferences
    let filteredResorts = [...this.skiResorts];

    if (preferences?.priceLevel) {
      filteredResorts = filteredResorts.filter(r => r.priceLevel === preferences.priceLevel);
    }

    if (preferences?.preferredCountries?.length) {
      filteredResorts = filteredResorts.filter(r => 
        preferences.preferredCountries!.includes(r.country)
      );
    }

    // Sort by skill level suitability
    if (preferences?.skillLevel) {
      filteredResorts.sort((a, b) => {
        const getScore = (resort: SkiResort) => {
          switch (preferences.skillLevel) {
            case 'beginner':
              return resort.slopes.beginner / resort.slopes.total;
            case 'advanced':
              return resort.slopes.advanced / resort.slopes.total;
            default:
              return resort.slopes.intermediate / resort.slopes.total;
          }
        };
        return getScore(b) - getScore(a);
      });
    }

    // Take top 5 resorts
    const topResorts = filteredResorts.slice(0, 5);

    if (io) {
      io.emit('travel-log', {
        message: `🎿 Checking ${topResorts.length} ski resorts: ${topResorts.map(r => r.name).join(', ')}`,
        type: 'info'
      });
    }

    // Search flights and hotels for each resort
    const skiDeals: SkiDeal[] = [];

    for (const resort of topResorts) {
      // Check for stop signal
      if (shouldStop && shouldStop()) {
        if (io) {
          io.emit('travel-log', { message: '⏹️ Ski search stopped by user', type: 'warning' });
          io.emit('log', { message: '⏹️ Ski search stopped by user', type: 'warning', agent: 'travel' });
        }
        break;
      }

      try {
        if (io) {
          io.emit('travel-log', {
            message: `🔍 Searching deals for ${resort.name}, ${resort.country}...`,
            type: 'info'
          });
          io.emit('log', {
            message: `🔍 Searching deals for ${resort.name}, ${resort.country}...`,
            type: 'info',
            agent: 'travel'
          });
        }

        const searchRequest: TripSearchRequest = {
          ...request,
          destinations: [resort.airportCode]
        };

        // Search in parallel
        const [flights, hotels] = await Promise.all([
          travelSearchService.searchFlights(searchRequest).catch(() => []),
          travelSearchService.searchHotels(searchRequest).catch(() => [])
        ]);

        if (flights.length > 0) {
          // Calculate total package estimate
          const cheapestFlight = flights.reduce((min, f) => 
            f.price.total < min.price.total ? f : min
          );
          const cheapestHotel = hotels.length > 0
            ? hotels.reduce((min, h) => h.price.total < min.price.total ? h : min)
            : null;

          const totalEstimate = cheapestFlight.price.total + (cheapestHotel?.price.total || 0);

          // Calculate deal score
          let dealScore = 100;
          
          // Price factor
          if (resort.priceLevel === 'budget') dealScore += 20;
          else if (resort.priceLevel === 'premium') dealScore -= 10;
          
          // Slopes factor
          dealScore += Math.min(30, resort.slopes.total / 10);
          
          // Altitude factor (higher = better snow)
          dealScore += Math.min(20, resort.altitude.peak / 200);

          skiDeals.push({
            resort,
            flights: flights.slice(0, 5),
            hotels: hotels.slice(0, 5),
            totalEstimate,
            dealScore: Math.min(100, Math.max(0, dealScore))
          });

          if (io) {
            io.emit('travel-log', {
              message: `✅ ${resort.name}: Found ${flights.length} flights from $${cheapestFlight.price.total}`,
              type: 'success'
            });
            io.emit('log', {
              message: `✅ ${resort.name}: ${flights.length} flights from $${cheapestFlight.price.total}`,
              type: 'success',
              agent: 'travel'
            });
          }
        }

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 300));
      } catch (error: any) {
        console.error(`❌ Error searching ${resort.name}:`, error.message);
      }
    }

    // Sort by deal score
    skiDeals.sort((a, b) => b.dealScore - a.dealScore);

    if (io) {
      io.emit('travel-log', {
        message: `✅ Found ${skiDeals.length} ski trip packages`,
        type: 'success'
      });
    }

    return skiDeals;
  }

  /**
   * Get ski resort information
   */
  getSkiResorts(filter?: { country?: string; priceLevel?: string }): SkiResort[] {
    let resorts = [...this.skiResorts];

    if (filter?.country) {
      resorts = resorts.filter(r => 
        r.country.toLowerCase() === filter.country!.toLowerCase()
      );
    }

    if (filter?.priceLevel) {
      resorts = resorts.filter(r => r.priceLevel === filter.priceLevel);
    }

    return resorts;
  }

  /**
   * Search for beach vacation deals
   */
  async searchBeachDeals(
    request: TripSearchRequest,
    io?: any
  ): Promise<any[]> {
    console.log('🏖️ Searching for beach vacation deals...');

    const beachDestinations: BeachDestination[] = [
      { id: 'maldives', name: 'Maldives', country: 'Maldives', airportCode: 'MLE', bestMonths: [1, 2, 3, 4, 11, 12], averageTemp: 30, beachRating: 10 },
      { id: 'phuket', name: 'Phuket', country: 'Thailand', airportCode: 'HKT', bestMonths: [11, 12, 1, 2, 3, 4], averageTemp: 32, beachRating: 9 },
      { id: 'cancun', name: 'Cancun', country: 'Mexico', airportCode: 'CUN', bestMonths: [12, 1, 2, 3, 4], averageTemp: 28, beachRating: 9 },
      { id: 'bali', name: 'Bali', country: 'Indonesia', airportCode: 'DPS', bestMonths: [4, 5, 6, 7, 8, 9, 10], averageTemp: 30, beachRating: 9 },
      { id: 'santorini', name: 'Santorini', country: 'Greece', airportCode: 'JTR', bestMonths: [5, 6, 7, 8, 9, 10], averageTemp: 26, beachRating: 8 },
      { id: 'dubai', name: 'Dubai', country: 'UAE', airportCode: 'DXB', bestMonths: [11, 12, 1, 2, 3, 4], averageTemp: 25, beachRating: 8 },
      { id: 'seychelles', name: 'Seychelles', country: 'Seychelles', airportCode: 'SEZ', bestMonths: [4, 5, 10, 11], averageTemp: 29, beachRating: 10 }
    ];

    if (io) {
      io.emit('travel-log', {
        message: '🏖️ Searching beach destinations...',
        type: 'info'
      });
    }

    const deals: any[] = [];
    const departureMonth = new Date(request.departureDate).getMonth() + 1;

    // Filter destinations suitable for the travel month
    const suitableDestinations = beachDestinations.filter(d => 
      d.bestMonths.includes(departureMonth)
    );

    for (const dest of suitableDestinations.slice(0, 5)) {
      try {
        const searchRequest: TripSearchRequest = {
          ...request,
          destinations: [dest.airportCode]
        };

        const result = await travelSearchService.searchTravel(searchRequest, io);
        
        if (result.flights.length > 0) {
          deals.push({
            destination: dest,
            ...result
          });
        }
      } catch (error) {
        console.error(`Error searching ${dest.name}:`, error);
      }
    }

    return deals;
  }
}

export default new SpecializedTravelService();


