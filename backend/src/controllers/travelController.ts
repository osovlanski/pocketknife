import { Request, Response } from 'express';
import travelSearchService from '../services/travel/travelSearchService';
import tripPlanningService from '../services/travel/tripPlanningService';
import specializedTravelService from '../services/travel/specializedTravelService';
import type { TripSearchRequest } from '../types/travel';

export const searchTravel = async (req: Request, res: Response) => {
  try {
    const io = req.app.get('io');
    const searchRequest: TripSearchRequest = req.body;

    // Validate required fields
    if (!searchRequest.origin || !searchRequest.destinations || searchRequest.destinations.length === 0) {
      return res.status(400).json({ error: 'Origin and at least one destination are required' });
    }

    if (!searchRequest.departureDate) {
      return res.status(400).json({ error: 'Departure date is required' });
    }

    if (!searchRequest.passengers || !searchRequest.passengers.adults) {
      return res.status(400).json({ error: 'Number of passengers is required' });
    }

    console.log('🌍 Starting travel search...');
    
    if (io) {
      io.emit('travel-log', {
        message: '🌍 Starting travel search...',
        type: 'info'
      });
    }

    // Search for flights and hotels
    const results = await travelSearchService.searchTravel(searchRequest, io);

    // Generate trip plan if requested
    let tripPlan = undefined;
    if (req.body.generatePlan) {
      if (io) {
        io.emit('travel-log', {
          message: '🤖 Generating AI-powered trip plan...',
          type: 'info'
        });
      }

      const bestFlight = results.flights[0];
      const bestHotel = results.hotels[0];

      tripPlan = await tripPlanningService.generateTripPlan(
        searchRequest,
        bestFlight?.price.total,
        bestHotel?.price.total
      );

      if (io) {
        io.emit('travel-log', {
          message: '✅ Trip plan generated successfully!',
          type: 'success'
        });
      }
    }

    console.log(`✅ Travel search complete: ${results.flights.length} flights, ${results.hotels.length} hotels`);

    res.json({
      ...results,
      tripPlan
    });
  } catch (error: any) {
    console.error('❌ Error in travel search:', error);
    res.status(500).json({
      error: error.message || 'Failed to search travel options'
    });
  }
};

export const getDestinationRecommendations = async (req: Request, res: Response) => {
  try {
    const { budget, interests } = req.query;

    const recommendations = await tripPlanningService.getDestinationRecommendations(
      budget ? parseInt(budget as string) : undefined,
      interests ? (interests as string).split(',') : undefined
    );

    res.json({ recommendations });
  } catch (error: any) {
    console.error('❌ Error getting recommendations:', error);
    res.status(500).json({
      error: 'Failed to get destination recommendations'
    });
  }
};

export const generateTripPlan = async (req: Request, res: Response) => {
  try {
    const searchRequest: TripSearchRequest = req.body;
    const { flightPrice, hotelPrice } = req.body;

    const tripPlan = await tripPlanningService.generateTripPlan(
      searchRequest,
      flightPrice,
      hotelPrice
    );

    res.json({ tripPlan });
  } catch (error: any) {
    console.error('❌ Error generating trip plan:', error);
    res.status(500).json({
      error: 'Failed to generate trip plan'
    });
  }
};

/**
 * Search for ski trip deals
 */
export const searchSkiDeals = async (req: Request, res: Response) => {
  try {
    const io = req.app.get('io');
    const { origin, departureDate, returnDate, passengers, preferences } = req.body;

    if (!origin || !departureDate) {
      return res.status(400).json({ error: 'Origin and departure date are required' });
    }

    console.log('⛷️ Starting ski deals search...');

    const searchRequest: TripSearchRequest = {
      origin,
      destinations: [], // Will be filled by the service
      departureDate,
      returnDate,
      passengers: passengers || { adults: 2 },
      travelClass: 'ECONOMY'
    };

    const skiDeals = await specializedTravelService.searchSkiDeals(
      searchRequest,
      preferences,
      io
    );

    res.json({
      success: true,
      count: skiDeals.length,
      deals: skiDeals
    });
  } catch (error: any) {
    console.error('❌ Error searching ski deals:', error);
    res.status(500).json({
      error: error.message || 'Failed to search ski deals'
    });
  }
};

/**
 * Get list of ski resorts
 */
export const getSkiResorts = async (req: Request, res: Response) => {
  try {
    const { country, priceLevel } = req.query;

    const resorts = specializedTravelService.getSkiResorts({
      country: country as string,
      priceLevel: priceLevel as string
    });

    res.json({
      success: true,
      count: resorts.length,
      resorts
    });
  } catch (error: any) {
    console.error('❌ Error getting ski resorts:', error);
    res.status(500).json({
      error: 'Failed to get ski resorts'
    });
  }
};

/**
 * Search for beach vacation deals
 */
export const searchBeachDeals = async (req: Request, res: Response) => {
  try {
    const io = req.app.get('io');
    const searchRequest: TripSearchRequest = req.body;

    if (!searchRequest.origin || !searchRequest.departureDate) {
      return res.status(400).json({ error: 'Origin and departure date are required' });
    }

    console.log('🏖️ Starting beach deals search...');

    const beachDeals = await specializedTravelService.searchBeachDeals(
      searchRequest,
      io
    );

    res.json({
      success: true,
      count: beachDeals.length,
      deals: beachDeals
    });
  } catch (error: any) {
    console.error('❌ Error searching beach deals:', error);
    res.status(500).json({
      error: error.message || 'Failed to search beach deals'
    });
  }
};
