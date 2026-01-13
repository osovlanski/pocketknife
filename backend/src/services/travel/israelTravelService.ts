/**
 * Israel Travel Service
 * 
 * Provides domestic Israel travel recommendations using AI and curated data.
 * Features:
 * - AI-powered suggestions based on natural language prompts
 * - Curated destinations, attractions, and restaurants
 * - Region and activity-based filtering
 * - Seasonal recommendations
 */

import Anthropic from '@anthropic-ai/sdk';
import https from 'https';
import { configService } from '../core/configService';
import { cacheService, cacheKeys } from '../core/cacheService';
import type {
  IsraelDestination,
  IsraelAttraction,
  IsraelRestaurant,
  IsraelAccommodation,
  IsraelHikingTrail,
  IsraelBeach,
  IsraelTravelSearchRequest,
  IsraelTravelSuggestion,
  IsraelTravelResponse,
  IsraelRegion,
  IsraelActivityType,
  BudgetLevel
} from '../../types/israelTravel';

// =============================================================================
// CURATED ISRAEL DESTINATIONS DATA
// =============================================================================

const ISRAEL_DESTINATIONS: IsraelDestination[] = [
  // NORTH
  {
    id: 'tzfat',
    name: 'Tzfat (Safed)',
    nameHebrew: 'צפת',
    region: 'north',
    description: 'Mystical city in the Galilee mountains, known for Kabbalah, art galleries, and ancient synagogues.',
    highlights: ['Artists Quarter', 'Ancient Synagogues', 'Kabbalah Center', 'Mountain Views'],
    bestFor: ['religious', 'art_culture', 'historical'],
    bestSeasons: ['spring', 'fall'],
    estimatedCost: { budget: 200, moderate: 400, luxury: 800 },
    distanceFromTelAviv: 160,
    drivingTime: '2 hours',
    coordinates: { latitude: 32.9646, longitude: 35.4960 }
  },
  {
    id: 'rosh_hanikra',
    name: 'Rosh HaNikra',
    nameHebrew: 'ראש הנקרה',
    region: 'north',
    description: 'Stunning white chalk cliffs and sea grottoes at the Lebanese border.',
    highlights: ['Cable Car', 'Sea Grottoes', 'Cliff Views', 'Sunset Point'],
    bestFor: ['nature', 'family', 'hiking'],
    bestSeasons: ['spring', 'summer', 'fall'],
    estimatedCost: { budget: 150, moderate: 300, luxury: 500 },
    distanceFromTelAviv: 120,
    drivingTime: '1.5 hours',
    coordinates: { latitude: 33.0858, longitude: 35.1039 }
  },
  {
    id: 'acre',
    name: 'Acre (Akko)',
    nameHebrew: 'עכו',
    region: 'north',
    description: 'UNESCO World Heritage old city with Crusader fortress, Ottoman architecture, and famous hummus.',
    highlights: ['Crusader Fortress', 'Turkish Bazaar', 'Hummus Said', 'Underground Tunnels'],
    bestFor: ['historical', 'food_wine', 'art_culture'],
    bestSeasons: ['spring', 'fall', 'winter'],
    estimatedCost: { budget: 180, moderate: 350, luxury: 700 },
    distanceFromTelAviv: 95,
    drivingTime: '1.25 hours',
    coordinates: { latitude: 32.9269, longitude: 35.0676 }
  },
  {
    id: 'golan_heights',
    name: 'Golan Heights',
    nameHebrew: 'רמת הגולן',
    region: 'north',
    description: 'Volcanic plateau with nature reserves, wineries, and historical sites.',
    highlights: ['Wineries', 'Gamla Nature Reserve', 'Mount Hermon', 'Druze Villages'],
    bestFor: ['nature', 'hiking', 'food_wine', 'adventure'],
    bestSeasons: ['spring', 'fall', 'winter'],
    estimatedCost: { budget: 250, moderate: 500, luxury: 1000 },
    distanceFromTelAviv: 180,
    drivingTime: '2.5 hours',
    coordinates: { latitude: 33.0025, longitude: 35.7500 }
  },
  {
    id: 'tiberias',
    name: 'Tiberias',
    nameHebrew: 'טבריה',
    region: 'north',
    description: 'Ancient city on the Sea of Galilee with hot springs and religious significance.',
    highlights: ['Sea of Galilee', 'Hot Springs', 'Water Sports', 'Holy Sites'],
    bestFor: ['wellness', 'religious', 'beaches', 'family'],
    bestSeasons: ['spring', 'fall'],
    estimatedCost: { budget: 200, moderate: 450, luxury: 900 },
    distanceFromTelAviv: 140,
    drivingTime: '1.75 hours',
    coordinates: { latitude: 32.7959, longitude: 35.5300 }
  },
  {
    id: 'haifa',
    name: 'Haifa',
    nameHebrew: 'חיפה',
    region: 'north',
    description: 'Port city with the stunning Bahai Gardens, coexistence, and mountain-sea views.',
    highlights: ['Bahai Gardens', 'German Colony', 'Carmel Market', 'Cable Car'],
    bestFor: ['art_culture', 'food_wine', 'historical', 'nature'],
    bestSeasons: ['spring', 'fall', 'winter'],
    estimatedCost: { budget: 180, moderate: 400, luxury: 800 },
    distanceFromTelAviv: 95,
    drivingTime: '1 hour',
    coordinates: { latitude: 32.7940, longitude: 34.9896 }
  },
  
  // CENTER
  {
    id: 'tel_aviv',
    name: 'Tel Aviv',
    nameHebrew: 'תל אביב',
    region: 'center',
    description: 'The vibrant, non-stop city with beaches, nightlife, food scene, and Bauhaus architecture.',
    highlights: ['Beaches', 'Carmel Market', 'Neve Tzedek', 'Rothschild Boulevard', 'Jaffa'],
    bestFor: ['beaches', 'nightlife', 'food_wine', 'art_culture'],
    bestSeasons: ['spring', 'summer', 'fall'],
    estimatedCost: { budget: 250, moderate: 500, luxury: 1200 },
    distanceFromTelAviv: 0,
    drivingTime: '0',
    coordinates: { latitude: 32.0853, longitude: 34.7818 }
  },
  {
    id: 'jaffa',
    name: 'Jaffa',
    nameHebrew: 'יפו',
    region: 'center',
    description: 'Ancient port city with flea market, galleries, and incredible seafood.',
    highlights: ['Flea Market', 'Old Jaffa', 'Clock Tower', 'Abu Hassan Hummus', 'Galleries'],
    bestFor: ['historical', 'food_wine', 'art_culture', 'nightlife'],
    bestSeasons: ['spring', 'summer', 'fall'],
    estimatedCost: { budget: 200, moderate: 400, luxury: 800 },
    distanceFromTelAviv: 5,
    drivingTime: '10 minutes',
    coordinates: { latitude: 32.0515, longitude: 34.7510 }
  },
  {
    id: 'caesarea',
    name: 'Caesarea',
    nameHebrew: 'קיסריה',
    region: 'center',
    description: 'Roman ruins by the sea with an ancient amphitheater and aqueduct.',
    highlights: ['Roman Amphitheater', 'Aqueduct Beach', 'Port', 'Ralli Museum'],
    bestFor: ['historical', 'beaches', 'family'],
    bestSeasons: ['spring', 'summer', 'fall'],
    estimatedCost: { budget: 150, moderate: 300, luxury: 600 },
    distanceFromTelAviv: 55,
    drivingTime: '45 minutes',
    coordinates: { latitude: 32.5000, longitude: 34.8917 }
  },
  
  // JERUSALEM
  {
    id: 'jerusalem',
    name: 'Jerusalem',
    nameHebrew: 'ירושלים',
    region: 'jerusalem',
    description: 'The holy city with the Western Wall, Old City, and thousands of years of history.',
    highlights: ['Western Wall', 'Old City Markets', 'Yad Vashem', 'Mahane Yehuda Market', 'Mount of Olives'],
    bestFor: ['religious', 'historical', 'food_wine', 'art_culture'],
    bestSeasons: ['spring', 'fall', 'winter'],
    estimatedCost: { budget: 200, moderate: 450, luxury: 1000 },
    distanceFromTelAviv: 60,
    drivingTime: '1 hour',
    coordinates: { latitude: 31.7683, longitude: 35.2137 }
  },
  {
    id: 'ein_karem',
    name: 'Ein Karem',
    nameHebrew: 'עין כרם',
    region: 'jerusalem',
    description: 'Picturesque village in Jerusalem with churches, artists, and charming cafes.',
    highlights: ['Church of the Visitation', 'Art Galleries', 'Spring Water', 'Cafes'],
    bestFor: ['art_culture', 'religious', 'food_wine'],
    bestSeasons: ['spring', 'fall'],
    estimatedCost: { budget: 150, moderate: 300, luxury: 600 },
    distanceFromTelAviv: 55,
    drivingTime: '50 minutes',
    coordinates: { latitude: 31.7658, longitude: 35.1617 }
  },
  
  // DEAD SEA
  {
    id: 'dead_sea',
    name: 'Dead Sea',
    nameHebrew: 'ים המלח',
    region: 'dead_sea',
    description: 'The lowest place on Earth with mineral-rich waters and mud treatments.',
    highlights: ['Floating Experience', 'Mud Treatments', 'Ein Bokek Beach', 'Desert Views'],
    bestFor: ['wellness', 'nature', 'beaches', 'family'],
    bestSeasons: ['spring', 'fall', 'winter'],
    estimatedCost: { budget: 200, moderate: 450, luxury: 1000 },
    distanceFromTelAviv: 150,
    drivingTime: '1.5 hours',
    coordinates: { latitude: 31.5000, longitude: 35.4167 }
  },
  {
    id: 'masada',
    name: 'Masada',
    nameHebrew: 'מצדה',
    region: 'dead_sea',
    description: 'UNESCO World Heritage fortress with dramatic sunrise views and ancient history.',
    highlights: ['Sunrise Hike', 'Cable Car', 'Ancient Fortress', 'Desert Views'],
    bestFor: ['historical', 'hiking', 'adventure'],
    bestSeasons: ['spring', 'fall', 'winter'],
    estimatedCost: { budget: 150, moderate: 300, luxury: 500 },
    distanceFromTelAviv: 120,
    drivingTime: '1.5 hours',
    coordinates: { latitude: 31.3156, longitude: 35.3539 }
  },
  {
    id: 'ein_gedi',
    name: 'Ein Gedi',
    nameHebrew: 'עין גדי',
    region: 'dead_sea',
    description: 'Desert oasis with waterfalls, ibex, and lush vegetation by the Dead Sea.',
    highlights: ['David Waterfall', 'Ibex Sightings', 'Botanical Garden', 'Nahal David'],
    bestFor: ['hiking', 'nature', 'family'],
    bestSeasons: ['spring', 'fall', 'winter'],
    estimatedCost: { budget: 150, moderate: 300, luxury: 550 },
    distanceFromTelAviv: 130,
    drivingTime: '1.5 hours',
    coordinates: { latitude: 31.4667, longitude: 35.3833 }
  },
  
  // NEGEV
  {
    id: 'mitzpe_ramon',
    name: 'Mitzpe Ramon',
    nameHebrew: 'מצפה רמון',
    region: 'negev',
    description: 'Desert town on the edge of the Ramon Crater with stargazing and adventure.',
    highlights: ['Ramon Crater', 'Stargazing', 'Desert Hiking', 'Alpaca Farm'],
    bestFor: ['nature', 'hiking', 'adventure', 'wellness'],
    bestSeasons: ['spring', 'fall', 'winter'],
    estimatedCost: { budget: 200, moderate: 400, luxury: 800 },
    distanceFromTelAviv: 150,
    drivingTime: '2 hours',
    coordinates: { latitude: 30.6100, longitude: 34.8017 }
  },
  {
    id: 'beer_sheva',
    name: 'Beer Sheva',
    nameHebrew: 'באר שבע',
    region: 'negev',
    description: 'Capital of the Negev with Bedouin market, museums, and desert gateway.',
    highlights: ['Bedouin Market', 'Tel Beer Sheva', 'Negev Museum of Art', 'Abraham Well'],
    bestFor: ['historical', 'art_culture'],
    bestSeasons: ['spring', 'fall', 'winter'],
    estimatedCost: { budget: 150, moderate: 300, luxury: 600 },
    distanceFromTelAviv: 115,
    drivingTime: '1.25 hours',
    coordinates: { latitude: 31.2518, longitude: 34.7913 }
  },
  
  // EILAT
  {
    id: 'eilat',
    name: 'Eilat',
    nameHebrew: 'אילת',
    region: 'eilat',
    description: 'Red Sea resort city with coral reefs, diving, and year-round sunshine.',
    highlights: ['Coral Beach', 'Underwater Observatory', 'Dolphin Reef', 'Red Canyon'],
    bestFor: ['beaches', 'adventure', 'family', 'wellness'],
    bestSeasons: ['spring', 'fall', 'winter'],
    estimatedCost: { budget: 300, moderate: 600, luxury: 1500 },
    distanceFromTelAviv: 350,
    drivingTime: '4 hours',
    coordinates: { latitude: 29.5581, longitude: 34.9482 }
  },
  {
    id: 'timna_park',
    name: 'Timna Park',
    nameHebrew: 'פארק תמנע',
    region: 'eilat',
    description: 'Ancient copper mines with stunning rock formations and desert activities.',
    highlights: ['Solomon Pillars', 'Mushroom Rock', 'Ancient Mines', 'Night Sky'],
    bestFor: ['nature', 'hiking', 'family', 'historical'],
    bestSeasons: ['spring', 'fall', 'winter'],
    estimatedCost: { budget: 150, moderate: 300, luxury: 500 },
    distanceFromTelAviv: 330,
    drivingTime: '3.75 hours',
    coordinates: { latitude: 29.7833, longitude: 34.9667 }
  }
];

const ISRAEL_HIKING_TRAILS: IsraelHikingTrail[] = [
  {
    id: 'ein_gedi_david',
    name: 'Nahal David Trail',
    nameHebrew: 'נחל דוד',
    region: 'dead_sea',
    difficulty: 'easy',
    length: 2.5,
    duration: '1.5-2 hours',
    elevation: { gain: 100, highest: 150 },
    waterSources: true,
    bestSeasons: ['All year (hot in summer)'],
    highlights: ['David Waterfall', 'Ibex sightings', 'Natural pools'],
    startPoint: { name: 'Ein Gedi Nature Reserve', coordinates: { latitude: 31.4667, longitude: 35.3833 } },
    endPoint: { name: 'David Waterfall', coordinates: { latitude: 31.4680, longitude: 35.3850 } },
    isCircular: false,
    tips: ['Start early', 'Bring water', 'Watch for ibex'],
    requiredGear: ['Comfortable shoes', 'Hat', 'Sunscreen', 'Water (2L)']
  },
  {
    id: 'masada_snake_path',
    name: 'Masada Snake Path',
    nameHebrew: 'שביל הנחש מצדה',
    region: 'dead_sea',
    difficulty: 'challenging',
    length: 3.5,
    duration: '1-1.5 hours up',
    elevation: { gain: 350, highest: 450 },
    waterSources: false,
    bestSeasons: ['Best at sunrise', 'Winter and Spring'],
    highlights: ['Sunrise views', 'Ancient fortress', 'Dead Sea panorama'],
    startPoint: { name: 'Masada Visitor Center', coordinates: { latitude: 31.3156, longitude: 35.3539 } },
    endPoint: { name: 'Masada Summit', coordinates: { latitude: 31.3160, longitude: 35.3545 } },
    isCircular: false,
    tips: ['Start before dawn for sunrise', 'Bring flashlight', 'Descend by cable car if tired'],
    requiredGear: ['Sturdy shoes', 'Headlamp', 'Water (2L)', 'Snacks']
  },
  {
    id: 'ramon_crater_carpentry',
    name: 'The Carpentry Trail',
    nameHebrew: 'שביל הנגרייה',
    region: 'negev',
    difficulty: 'easy',
    length: 1.5,
    duration: '1 hour',
    elevation: { gain: 50, highest: -200 },
    waterSources: false,
    bestSeasons: ['Fall', 'Winter', 'Spring'],
    highlights: ['Unique rock formations', 'Prismatic sandstone', 'Crater views'],
    startPoint: { name: 'Carpentry Parking', coordinates: { latitude: 30.5800, longitude: 34.8200 } },
    endPoint: { name: 'Carpentry Trail End', coordinates: { latitude: 30.5850, longitude: 34.8250 } },
    isCircular: true,
    tips: ['Sunset is magical', 'Combine with crater viewpoint'],
    requiredGear: ['Comfortable shoes', 'Camera', 'Water']
  },
  {
    id: 'gamla_waterfall',
    name: 'Gamla Waterfall Trail',
    nameHebrew: 'מפל גמלא',
    region: 'north',
    difficulty: 'moderate',
    length: 4,
    duration: '2-3 hours',
    elevation: { gain: 200, highest: 300 },
    waterSources: true,
    bestSeasons: ['Winter', 'Spring'],
    highlights: ['Highest waterfall in Israel', 'Vultures', 'Ancient city ruins'],
    startPoint: { name: 'Gamla Nature Reserve', coordinates: { latitude: 32.9000, longitude: 35.7500 } },
    endPoint: { name: 'Gamla Waterfall', coordinates: { latitude: 32.9050, longitude: 35.7550 } },
    isCircular: false,
    tips: ['Best after rain', 'Bring binoculars for vultures'],
    requiredGear: ['Hiking boots', 'Water (2L)', 'Binoculars']
  }
];

const ISRAEL_BEACHES: IsraelBeach[] = [
  {
    id: 'gordon_beach',
    name: 'Gordon Beach',
    nameHebrew: 'חוף גורדון',
    region: 'center',
    city: 'Tel Aviv',
    type: 'mediterranean',
    facilities: ['Showers', 'Restrooms', 'Beach chairs', 'Umbrellas', 'Beach bar'],
    lifeguard: true,
    freeEntry: true,
    parking: true,
    parkingFee: 20,
    accessibility: 'Wheelchair accessible',
    familyFriendly: true,
    waterSports: ['Swimming', 'Volleyball'],
    nearbyRestaurants: true,
    coordinates: { latitude: 32.0825, longitude: 34.7680 }
  },
  {
    id: 'coral_beach_eilat',
    name: 'Coral Beach Nature Reserve',
    nameHebrew: 'שמורת חוף האלמוגים',
    region: 'eilat',
    city: 'Eilat',
    type: 'red_sea',
    facilities: ['Snorkeling gear rental', 'Showers', 'Restaurant'],
    lifeguard: true,
    freeEntry: false,
    entryFee: 35,
    parking: true,
    parkingFee: 25,
    accessibility: 'Partially accessible',
    familyFriendly: true,
    waterSports: ['Snorkeling', 'Diving'],
    nearbyRestaurants: true,
    coordinates: { latitude: 29.5050, longitude: 34.9170 }
  },
  {
    id: 'ein_bokek',
    name: 'Ein Bokek Beach',
    nameHebrew: 'חוף עין בוקק',
    region: 'dead_sea',
    city: 'Ein Bokek',
    type: 'dead_sea',
    facilities: ['Showers', 'Mud station', 'Sun beds'],
    lifeguard: true,
    freeEntry: true,
    parking: true,
    accessibility: 'Wheelchair accessible',
    familyFriendly: true,
    waterSports: [],
    nearbyRestaurants: true,
    coordinates: { latitude: 31.2000, longitude: 35.3600 }
  }
];

// =============================================================================
// SERVICE IMPLEMENTATION
// =============================================================================

class IsraelTravelService {
  private client: Anthropic | null = null;

  private initializeClient(): void {
    if (this.client) return;

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY not found in environment variables');
    }

    this.client = new Anthropic({
      apiKey,
      httpAgent: new https.Agent({ rejectUnauthorized: false })
    });
  }

  /**
   * Get current season based on date
   */
  private getCurrentSeason(date?: string): 'spring' | 'summer' | 'fall' | 'winter' {
    const month = date ? new Date(date).getMonth() : new Date().getMonth();
    if (month >= 2 && month <= 4) return 'spring';
    if (month >= 5 && month <= 7) return 'summer';
    if (month >= 8 && month <= 10) return 'fall';
    return 'winter';
  }

  /**
   * Search Israel travel destinations with filters
   */
  async searchDestinations(
    request: IsraelTravelSearchRequest
  ): Promise<IsraelTravelResponse> {
    console.log('🇮🇱 Searching Israel travel destinations...');

    const maxResults = configService.get('travel.israel.maxResults', 10);
    const currentSeason = this.getCurrentSeason(request.travelDate);

    // Filter destinations based on request
    let filteredDestinations = [...ISRAEL_DESTINATIONS];

    // Filter by region
    if (request.regions && request.regions.length > 0) {
      filteredDestinations = filteredDestinations.filter(d => 
        request.regions!.includes(d.region)
      );
    }

    // Filter by activity types
    if (request.activityTypes && request.activityTypes.length > 0) {
      filteredDestinations = filteredDestinations.filter(d =>
        d.bestFor.some(activity => request.activityTypes!.includes(activity))
      );
    }

    // Filter by season
    const seasonToCheck = request.season || currentSeason;
    filteredDestinations = filteredDestinations.filter(d =>
      d.bestSeasons.includes(seasonToCheck)
    );

    // Sort by match score
    const suggestions: IsraelTravelSuggestion[] = filteredDestinations
      .slice(0, request.maxResults || maxResults)
      .map(destination => {
        const matchScore = this.calculateMatchScore(destination, request, currentSeason);
        const budgetLevel = request.budget || 'moderate';
        
        return {
          destination,
          attractions: this.getAttractionsForDestination(destination.id),
          restaurants: this.getRestaurantsForDestination(destination.id),
          estimatedTotalCost: destination.estimatedCost[budgetLevel] * (
            request.duration === 'day_trip' ? 1 :
            request.duration === 'weekend' ? 2.5 :
            4
          ),
          travelTips: this.getTravelTips(destination, currentSeason),
          matchScore
        };
      })
      .sort((a, b) => b.matchScore - a.matchScore);

    return {
      suggestions,
      searchMeta: {
        query: request,
        timestamp: new Date().toISOString(),
        totalResults: suggestions.length
      }
    };
  }

  /**
   * Get AI-powered travel suggestions based on natural language prompt
   */
  async getAISuggestions(
    prompt: string,
    filters?: Partial<IsraelTravelSearchRequest>
  ): Promise<IsraelTravelResponse> {
    this.initializeClient();

    if (!this.client) {
      throw new Error('Failed to initialize AI client');
    }

    const cacheKey = `israel-ai-${Buffer.from(prompt + JSON.stringify(filters || {})).toString('base64').substring(0, 50)}`;
    const cacheTTL = configService.get('travel.israel.cacheTTL', 3600);
    
    // Check cache
    const cached = await cacheService.get<IsraelTravelResponse>(cacheKey);
    if (cached) {
      console.log('🇮🇱 Returning cached AI suggestions');
      return cached;
    }

    console.log('🤖 Generating AI-powered Israel travel suggestions...');

    const destinationsContext = ISRAEL_DESTINATIONS.map(d => 
      `- ${d.name} (${d.region}): ${d.description}. Best for: ${d.bestFor.join(', ')}.`
    ).join('\n');

    const trailsContext = ISRAEL_HIKING_TRAILS.map(t =>
      `- ${t.name} (${t.region}, ${t.difficulty}): ${t.duration}, ${t.length}km`
    ).join('\n');

    const beachesContext = ISRAEL_BEACHES.map(b =>
      `- ${b.name} in ${b.city} (${b.type})`
    ).join('\n');

    try {
      const message = await this.client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 3000,
        messages: [{
          role: 'user',
          content: `You are an expert local Israeli travel advisor. Help recommend destinations in Israel based on this request.

USER REQUEST: "${prompt}"

ADDITIONAL FILTERS:
${filters?.regions ? `- Preferred regions: ${filters.regions.join(', ')}` : ''}
${filters?.activityTypes ? `- Activity types: ${filters.activityTypes.join(', ')}` : ''}
${filters?.budget ? `- Budget level: ${filters.budget}` : ''}
${filters?.duration ? `- Trip duration: ${filters.duration}` : ''}

AVAILABLE DESTINATIONS:
${destinationsContext}

HIKING TRAILS:
${trailsContext}

BEACHES:
${beachesContext}

INSTRUCTIONS:
1. Recommend 3-5 destinations that best match the user's request
2. For each destination, explain why it's a good match
3. Provide specific tips for visiting
4. Suggest a rough itinerary if applicable
5. Consider current season and weather
6. Include food recommendations
7. Mention any festivals or events if relevant

**IMPORTANT**: Respond ONLY with valid JSON. No markdown, no backticks, no extra text.

JSON Schema:
{
  "summary": "Brief overview of recommendations",
  "recommendations": [
    {
      "destinationId": "destination_id_from_list",
      "destinationName": "Destination Name",
      "whyRecommended": "Explanation of why this matches the request",
      "suggestedActivities": ["Activity 1", "Activity 2"],
      "foodRecommendations": ["Place 1", "Dish to try"],
      "tips": ["Tip 1", "Tip 2"],
      "estimatedDuration": "1 day / weekend / 3+ days",
      "bestTimeToVisit": "When to go",
      "matchScore": 85
    }
  ],
  "suggestedItinerary": [
    "Day 1: ...",
    "Day 2: ..."
  ],
  "seasonalNotes": "Notes about current season",
  "budgetTips": ["Tip 1", "Tip 2"]
}`
        }]
      });

      const firstBlock = message.content[0];
      const responseText = firstBlock.type === 'text' ? firstBlock.text : '';
      
      let cleanText = responseText.trim()
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '');
      
      const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        cleanText = jsonMatch[0];
      }

      let aiResponse;
      try {
        aiResponse = JSON.parse(cleanText);
      } catch {
        // Try to fix common JSON issues
        cleanText = cleanText
          .replace(/,(\s*[}\]])/g, '$1')
          .replace(/\n/g, ' ');
        aiResponse = JSON.parse(cleanText);
      }

      // Map AI recommendations to our format
      const suggestions: IsraelTravelSuggestion[] = aiResponse.recommendations.map((rec: any) => {
        const destination = ISRAEL_DESTINATIONS.find(d => 
          d.id === rec.destinationId || 
          d.name.toLowerCase().includes(rec.destinationName.toLowerCase())
        ) || ISRAEL_DESTINATIONS.find(d => d.name === rec.destinationName);

        if (!destination) {
          // Create a basic destination from AI response
          return null;
        }

        return {
          destination,
          attractions: this.getAttractionsForDestination(destination.id),
          restaurants: this.getRestaurantsForDestination(destination.id),
          estimatedTotalCost: destination.estimatedCost[filters?.budget || 'moderate'] * 2,
          suggestedItinerary: rec.suggestedActivities,
          travelTips: rec.tips,
          matchScore: rec.matchScore || 80,
          aiRecommendation: rec.whyRecommended
        };
      }).filter(Boolean);

      const response: IsraelTravelResponse = {
        suggestions,
        aiSummary: aiResponse.summary,
        searchMeta: {
          query: { prompt, ...filters },
          timestamp: new Date().toISOString(),
          totalResults: suggestions.length
        }
      };

      // Cache the response
      await cacheService.set(cacheKey, response, { ttl: cacheTTL });

      console.log(`✅ Generated ${suggestions.length} AI-powered suggestions`);
      return response;

    } catch (error: any) {
      console.error('❌ Error generating AI suggestions:', error.message);
      
      // Fallback to regular search
      return this.searchDestinations({
        prompt,
        ...filters
      });
    }
  }

  /**
   * Get destination by ID
   */
  getDestination(id: string): IsraelDestination | undefined {
    return ISRAEL_DESTINATIONS.find(d => d.id === id);
  }

  /**
   * Get all destinations
   */
  getAllDestinations(): IsraelDestination[] {
    return ISRAEL_DESTINATIONS;
  }

  /**
   * Get destinations by region
   */
  getDestinationsByRegion(region: IsraelRegion): IsraelDestination[] {
    return ISRAEL_DESTINATIONS.filter(d => d.region === region);
  }

  /**
   * Get destinations by activity type
   */
  getDestinationsByActivity(activity: IsraelActivityType): IsraelDestination[] {
    return ISRAEL_DESTINATIONS.filter(d => d.bestFor.includes(activity));
  }

  /**
   * Get hiking trails by region or difficulty
   */
  getHikingTrails(options?: { 
    region?: IsraelRegion; 
    difficulty?: 'easy' | 'moderate' | 'challenging' | 'expert';
    maxLength?: number;
  }): IsraelHikingTrail[] {
    let trails = [...ISRAEL_HIKING_TRAILS];

    if (options?.region) {
      trails = trails.filter(t => t.region === options.region);
    }
    if (options?.difficulty) {
      trails = trails.filter(t => t.difficulty === options.difficulty);
    }
    if (options?.maxLength !== undefined) {
      trails = trails.filter(t => t.length <= options.maxLength!);
    }

    return trails;
  }

  /**
   * Get beaches by type or region
   */
  getBeaches(options?: {
    region?: IsraelRegion;
    type?: 'mediterranean' | 'red_sea' | 'dead_sea' | 'kineret';
    freeOnly?: boolean;
  }): IsraelBeach[] {
    let beaches = [...ISRAEL_BEACHES];

    if (options?.region) {
      beaches = beaches.filter(b => b.region === options.region);
    }
    if (options?.type) {
      beaches = beaches.filter(b => b.type === options.type);
    }
    if (options?.freeOnly) {
      beaches = beaches.filter(b => b.freeEntry);
    }

    return beaches;
  }

  /**
   * Calculate match score for a destination
   */
  private calculateMatchScore(
    destination: IsraelDestination,
    request: IsraelTravelSearchRequest,
    currentSeason: string
  ): number {
    let score = 50; // Base score

    // Activity match (+30)
    if (request.activityTypes && request.activityTypes.length > 0) {
      const matchingActivities = destination.bestFor.filter(a => 
        request.activityTypes!.includes(a)
      );
      score += (matchingActivities.length / request.activityTypes.length) * 30;
    } else {
      score += 15; // Neutral if no preference
    }

    // Season match (+20)
    if (destination.bestSeasons.includes(currentSeason as any)) {
      score += 20;
    }

    // Duration match (+10)
    if (request.duration) {
      const distance = destination.distanceFromTelAviv;
      if (request.duration === 'day_trip' && distance <= 100) {
        score += 10;
      } else if (request.duration === 'weekend' && distance <= 200) {
        score += 10;
      } else if (request.duration === 'extended') {
        score += 10;
      }
    } else {
      score += 5;
    }

    // Budget match (+10)
    if (request.budget) {
      // All destinations have all budget levels, but some are better value
      score += 10;
    } else {
      score += 5;
    }

    return Math.min(100, Math.max(0, Math.round(score)));
  }

  /**
   * Get attractions for a destination (placeholder - would be from database)
   */
  private getAttractionsForDestination(destinationId: string): IsraelAttraction[] {
    // In a real implementation, this would fetch from database
    // For now, return empty array - attractions can be added later
    return [];
  }

  /**
   * Get restaurants for a destination (placeholder - would be from database)
   */
  private getRestaurantsForDestination(destinationId: string): IsraelRestaurant[] {
    // In a real implementation, this would fetch from database
    return [];
  }

  /**
   * Get travel tips for a destination and season
   */
  private getTravelTips(destination: IsraelDestination, season: string): string[] {
    const tips: string[] = [];

    // Region-specific tips
    switch (destination.region) {
      case 'north':
        tips.push('Book zimmer (cabins) in advance for weekends');
        if (season === 'winter') tips.push('Check road conditions for Golan/Hermon');
        break;
      case 'dead_sea':
        tips.push('Avoid getting water in eyes - it stings!');
        tips.push('Drink plenty of water - very hot and dry');
        if (season === 'summer') tips.push('Visit early morning or late afternoon');
        break;
      case 'negev':
      case 'eilat':
        tips.push('Start hikes early to avoid heat');
        tips.push('Bring more water than you think you need');
        break;
      case 'jerusalem':
        tips.push('Dress modestly for religious sites');
        tips.push('Friday afternoon - many things close for Shabbat');
        break;
      case 'center':
        tips.push('Parking is challenging - consider public transport');
        tips.push('Beach beaches free but chair rentals cost money');
        break;
    }

    // General tips
    tips.push('Carry cash for small vendors and parking');
    tips.push('Fill up on gas before heading to remote areas');

    return tips;
  }

  /**
   * Get quick day trip suggestions from Tel Aviv
   */
  getDayTripSuggestions(): IsraelDestination[] {
    return ISRAEL_DESTINATIONS
      .filter(d => d.distanceFromTelAviv <= 100)
      .sort((a, b) => a.distanceFromTelAviv - b.distanceFromTelAviv);
  }

  /**
   * Get weekend getaway suggestions
   */
  getWeekendGetaways(budget?: BudgetLevel): IsraelDestination[] {
    return ISRAEL_DESTINATIONS
      .filter(d => d.distanceFromTelAviv > 50)
      .sort((a, b) => {
        if (budget) {
          return a.estimatedCost[budget] - b.estimatedCost[budget];
        }
        return b.highlights.length - a.highlights.length;
      });
  }
}

export const israelTravelService = new IsraelTravelService();
export default israelTravelService;

