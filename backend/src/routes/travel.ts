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

// =============================================================================
// ISRAEL TRAVEL ROUTES
// =============================================================================

/**
 * POST /api/travel/israel/search
 * Search Israel destinations with filters
 * 
 * Body: IsraelTravelSearchRequest
 * {
 *   regions?: ["north", "center", "jerusalem", "dead_sea", "negev", "eilat"],
 *   activityTypes?: ["beaches", "hiking", "historical", "religious", "nature", "food_wine"],
 *   duration?: "day_trip" | "weekend" | "extended",
 *   budget?: "budget" | "moderate" | "luxury",
 *   travelDate?: "2026-03-15",
 *   preferences?: { kosherOnly?: boolean, accessibilityRequired?: boolean }
 * }
 */
router.post('/israel/search', travelController.searchIsrael);

/**
 * POST /api/travel/israel/ai
 * Get AI-powered Israel travel suggestions from natural language prompt
 * 
 * Body:
 * {
 *   prompt: "I want a romantic weekend getaway with good wine and nature",
 *   filters?: { regions?: [], activityTypes?: [], budget?: "moderate" }
 * }
 */
router.post('/israel/ai', travelController.searchIsraelAI);

/**
 * GET /api/travel/israel/destinations
 * Get Israel destinations list with optional filters
 * 
 * Query params:
 * - region: "north" | "center" | "jerusalem" | "dead_sea" | "negev" | "eilat"
 * - activity: "beaches" | "hiking" | "historical" | etc.
 * - duration: "day_trip" | "weekend" | "extended"
 * - budget: "budget" | "moderate" | "luxury"
 */
router.get('/israel/destinations', travelController.getIsraelDestinations);

/**
 * GET /api/travel/israel/trails
 * Get Israel hiking trails
 * 
 * Query params:
 * - region: Filter by region
 * - difficulty: "easy" | "moderate" | "challenging" | "expert"
 * - maxLength: Maximum trail length in km
 */
router.get('/israel/trails', travelController.getIsraelTrails);

/**
 * GET /api/travel/israel/beaches
 * Get Israel beaches
 * 
 * Query params:
 * - region: Filter by region
 * - type: "mediterranean" | "red_sea" | "dead_sea" | "kineret"
 * - freeOnly: "true" to show only free beaches
 */
router.get('/israel/beaches', travelController.getIsraelBeaches);

export default router;
