import { Request, Response } from 'express';
import travelSearchService from '../services/travel/travelSearchService';
import tripPlanningService from '../services/travel/tripPlanningService';
import specializedTravelService from '../services/travel/specializedTravelService';
import processControlService from '../services/core/processControlService';
import { databaseService } from '../services/core/databaseService';
import type { TripSearchRequest } from '../types/travel';

/**
 * Helper to emit logs to both travel-specific and general activity log
 */
const emitLog = (io: any, message: string, type: 'info' | 'success' | 'warning' | 'error') => {
  if (io) {
    // Emit to travel-specific log
    io.emit('travel-log', { message, type });
    // Emit to global activity log
    io.emit('log', { message, type, agent: 'travel' });
  }
};

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

    // Start process tracking for stop functionality
    processControlService.startProcess('travel');

    console.log('🌍 Starting travel search...');
    emitLog(io, '🌍 Starting travel search...', 'info');
    emitLog(io, `✈️ Searching ${searchRequest.origin} → ${searchRequest.destinations[0]}`, 'info');

    // Check for stop signal
    if (processControlService.shouldStop('travel')) {
      processControlService.completeProcess('travel', true);
      return res.json({ flights: [], hotels: [], stopped: true });
    }

    // Search for flights and hotels
    const results = await travelSearchService.searchTravel(searchRequest, io);

    // Check for stop signal after search
    if (processControlService.shouldStop('travel')) {
      processControlService.completeProcess('travel', true);
      emitLog(io, '⏹️ Travel search stopped by user', 'warning');
      return res.json({ ...results, stopped: true });
    }

    emitLog(io, `✅ Found ${results.flights.length} flights and ${results.hotels.length} hotels`, 'success');

    // Generate trip plan if requested
    let tripPlan = undefined;
    if (req.body.generatePlan && !processControlService.shouldStop('travel')) {
      emitLog(io, '🤖 Generating AI-powered trip plan...', 'info');

      const bestFlight = results.flights[0];
      const bestHotel = results.hotels[0];

      try {
        tripPlan = await tripPlanningService.generateTripPlan(
          searchRequest,
          bestFlight?.price.total,
          bestHotel?.price.total
        );
        emitLog(io, '✅ Trip plan generated successfully!', 'success');
      } catch (planError: any) {
        emitLog(io, `⚠️ Trip plan generation failed: ${planError.message}`, 'warning');
      }
    }

    console.log(`✅ Travel search complete: ${results.flights.length} flights, ${results.hotels.length} hotels`);

    // Log activity to database
    const user = await databaseService.getDefaultUser();
    if (user) {
      await databaseService.logActivity({
        userId: user.id,
        agent: 'travel',
        action: 'search',
        details: `Searched: ${searchRequest.origin} → ${searchRequest.destinations[0]}`,
        metadata: {
          origin: searchRequest.origin,
          destination: searchRequest.destinations[0],
          departureDate: searchRequest.departureDate,
          flightsFound: results.flights.length,
          hotelsFound: results.hotels.length
        },
        status: 'success'
      });
    }

    // Complete the process
    const wasStopped = processControlService.shouldStop('travel');
    processControlService.completeProcess('travel', wasStopped);

    res.json({
      ...results,
      tripPlan,
      stopped: wasStopped
    });
  } catch (error: any) {
    // Make sure to complete the process on error
    processControlService.completeProcess('travel', false);
    
    const io = req.app.get('io');
    emitLog(io, `❌ Error: ${error.message}`, 'error');
    
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

    // Start process tracking
    processControlService.startProcess('ski');

    console.log('⛷️ Starting ski deals search...');
    emitLog(io, '⛷️ Starting ski deals search...', 'info');

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
      io,
      () => processControlService.shouldStop('ski')
    );

    const wasStopped = processControlService.shouldStop('ski');
    processControlService.completeProcess('ski', wasStopped);

    emitLog(io, `✅ Found ${skiDeals.length} ski deals`, 'success');

    // Log activity to database
    const user = await databaseService.getDefaultUser();
    if (user) {
      await databaseService.logActivity({
        userId: user.id,
        agent: 'travel',
        action: 'search-ski',
        details: `Ski search from ${origin}`,
        metadata: {
          origin,
          departureDate,
          returnDate,
          preferences,
          dealsFound: skiDeals.length
        },
        status: 'success'
      });
    }

    res.json({
      success: true,
      count: skiDeals.length,
      deals: skiDeals,
      stopped: wasStopped
    });
  } catch (error: any) {
    processControlService.completeProcess('ski', false);
    
    const io = req.app.get('io');
    emitLog(io, `❌ Ski search error: ${error.message}`, 'error');
    
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
