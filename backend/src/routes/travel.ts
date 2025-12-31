import express from 'express';
import * as travelController from '../controllers/travelController';

const router = express.Router();

/**
 * POST /api/travel/search
 * Search for flights, hotels, and optionally generate trip plan
 * 
 * Body: TripSearchRequest
 * {
 *   origin: "TLV",
 *   destinations: ["BCN"],
 *   departureDate: "2025-06-15",
 *   returnDate: "2025-06-22",
 *   passengers: { adults: 2 },
 *   travelClass: "ECONOMY",
 *   budget: { max: 2000, currency: "USD" },
 *   generatePlan: true
 * }
 */
router.post('/search', travelController.searchTravel);

/**
 * GET /api/travel/recommendations
 * Get AI-powered destination recommendations
 * 
 * Query params:
 * - budget: number (optional)
 * - interests: string (comma-separated, optional)
 */
router.get('/recommendations', travelController.getDestinationRecommendations);

/**
 * POST /api/travel/plan
 * Generate detailed trip plan
 * 
 * Body: TripSearchRequest + prices
 */
router.post('/plan', travelController.generateTripPlan);

/**
 * POST /api/travel/ski
 * Search for ski trip deals across European resorts
 * 
 * Body: TripSearchRequest + preferences
 * {
 *   origin: "TLV",
 *   departureDate: "2026-01-15",
 *   returnDate: "2026-01-22",
 *   passengers: { adults: 2 },
 *   preferences: {
 *     skillLevel: "intermediate",
 *     priceLevel: "mid",
 *     preferredCountries: ["France", "Austria"]
 *   }
 * }
 */
router.post('/ski', travelController.searchSkiDeals);

/**
 * GET /api/travel/ski/resorts
 * Get list of ski resorts
 * 
 * Query params:
 * - country: string (optional)
 * - priceLevel: "budget" | "mid" | "premium" (optional)
 */
router.get('/ski/resorts', travelController.getSkiResorts);

/**
 * POST /api/travel/beach
 * Search for beach vacation deals
 */
router.post('/beach', travelController.searchBeachDeals);

export default router;
