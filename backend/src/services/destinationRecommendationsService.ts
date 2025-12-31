import Anthropic from '@anthropic-ai/sdk';
import https from 'https';

interface DestinationGuide {
  city: string;
  country: string;
  airportCode: string;
  highlights: string[];
  attractions: Array<{
    name: string;
    description: string;
    estimatedCost: string;
    mustSee: boolean;
  }>;
  localCuisine: Array<{
    dish: string;
    description: string;
    whereToTry: string;
  }>;
  transportation: {
    fromAirport: string;
    withinCity: string;
    costs: string;
  };
  tips: string[];
  bestTimeToVisit: string;
  visaInfo: string;
  estimatedBudget: {
    budget: string;
    midRange: string;
    luxury: string;
  };
  safety: string;
  language: string;
  currency: string;
}

class DestinationRecommendationsService {
  private client: Anthropic | null = null;

  private initializeClient() {
    if (this.client) return;

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY not found in environment variables');
    }

    this.client = new Anthropic({
      apiKey: apiKey,
      httpAgent: new https.Agent({ rejectUnauthorized: false })
    });
  }

  /**
   * Get comprehensive destination guide with attractions, food, tips
   */
  async getDestinationGuide(
    city: string,
    country: string,
    tripDuration: number = 7
  ): Promise<DestinationGuide> {
    this.initializeClient();

    if (!this.client) {
      throw new Error('Failed to initialize Anthropic client');
    }

    try {
      console.log(`🌍 Generating destination guide for ${city}, ${country}...`);

      const message = await this.client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 3000,
        messages: [{
          role: 'user',
          content: `Create a comprehensive travel guide for ${city}, ${country} for a ${tripDuration}-day trip.

**IMPORTANT**: Respond ONLY with valid JSON. No markdown, no backticks, no extra text.

Include:
1. **Top Attractions** (5-10 must-see places):
   - Name, description, estimated cost, must-see rating
   
2. **Local Cuisine** (5-7 dishes):
   - Dish name, description, where to try it
   
3. **Transportation**:
   - How to get from airport to city center
   - Best way to get around the city
   - Estimated costs
   
4. **Practical Tips** (7-10 tips):
   - Best neighborhoods to stay
   - Safety concerns
   - Money-saving tips
   - Cultural etiquette
   - Hidden gems locals love
   
5. **Travel Basics**:
   - Best time to visit
   - Visa requirements for Israeli citizens
   - Budget estimates (budget/mid-range/luxury per day)
   - Language and currency
   - Safety rating

Return ONLY this JSON structure:
{
  "city": "${city}",
  "country": "${country}",
  "airportCode": "XXX",
  "highlights": ["highlight1", "highlight2", ...],
  "attractions": [
    {
      "name": "Attraction Name",
      "description": "Brief description",
      "estimatedCost": "$10-20 or Free",
      "mustSee": true
    }
  ],
  "localCuisine": [
    {
      "dish": "Dish Name",
      "description": "What it is",
      "whereToTry": "Restaurant or area"
    }
  ],
  "transportation": {
    "fromAirport": "How to get from airport",
    "withinCity": "Best transport in city",
    "costs": "Estimated costs"
  },
  "tips": [
    "Tip 1: Stay in X neighborhood for best access",
    "Tip 2: Book attractions online to skip lines",
    ...
  ],
  "bestTimeToVisit": "Best months and why",
  "visaInfo": "Visa requirements for Israelis",
  "estimatedBudget": {
    "budget": "$50-80/day",
    "midRange": "$100-150/day",
    "luxury": "$250+/day"
  },
  "safety": "Safety rating and concerns",
  "language": "Primary language(s)",
  "currency": "Currency code"
}`
        }]
      });

      const firstBlock = message.content[0];
      const responseText = firstBlock.type === 'text' ? firstBlock.text : '';
      
      // Clean response
      let cleanText = responseText.trim();
      
      // Remove markdown code blocks if present
      cleanText = cleanText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      
      // Extract JSON if wrapped in other text
      const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        cleanText = jsonMatch[0];
      }

      try {
        const guide = JSON.parse(cleanText);
        console.log(`✅ Generated guide for ${city} with ${guide.attractions.length} attractions`);
        return guide;
      } catch (parseError) {
        // Try to fix common JSON issues
        cleanText = cleanText
          .replace(/,(\s*[}\]])/g, '$1')  // Remove trailing commas
          .replace(/\n/g, ' ')             // Remove newlines
          .replace(/\t/g, ' ')             // Remove tabs
          .replace(/\\/g, '\\\\');         // Escape backslashes

        try {
          const guide = JSON.parse(cleanText);
          return guide;
        } catch (secondError) {
          console.error('❌ Failed to parse destination guide:', cleanText.substring(0, 200));
          
          // Return minimal valid guide
          return {
            city,
            country,
            airportCode: 'XXX',
            highlights: ['Visit the main square', 'Explore old town', 'Try local food'],
            attractions: [
              {
                name: 'City Center',
                description: 'Explore the heart of the city',
                estimatedCost: 'Free',
                mustSee: true
              }
            ],
            localCuisine: [
              {
                dish: 'Local Specialty',
                description: 'Traditional local dish',
                whereToTry: 'Local restaurants'
              }
            ],
            transportation: {
              fromAirport: 'Taxi or public transport',
              withinCity: 'Public transport or walking',
              costs: 'Varies'
            },
            tips: [
              'Book accommodations in advance',
              'Learn basic local phrases',
              'Carry local currency'
            ],
            bestTimeToVisit: 'Spring or Fall for pleasant weather',
            visaInfo: 'Check requirements before travel',
            estimatedBudget: {
              budget: '$50-80/day',
              midRange: '$100-150/day',
              luxury: '$250+/day'
            },
            safety: 'Generally safe for tourists',
            language: 'Local language',
            currency: 'Local currency'
          };
        }
      }
    } catch (error: any) {
      console.error('❌ Error generating destination guide:', error.message);
      throw new Error('Failed to generate destination guide');
    }
  }

  /**
   * Get recommendations for top destinations based on flights
   */
  async getRecommendationsForFlights(
    flights: Array<{ destination: string; price: number }>,
    tripDuration: number = 7
  ): Promise<Map<string, DestinationGuide>> {
    const guides = new Map<string, DestinationGuide>();

    // Get guides for top 3 destinations
    const topDestinations = flights.slice(0, 3);

    for (const flight of topDestinations) {
      try {
        // Parse city/country from destination code (simplified)
        const cityCountry = this.getCityCountryFromCode(flight.destination);
        
        const guide = await this.getDestinationGuide(
          cityCountry.city,
          cityCountry.country,
          tripDuration
        );

        guides.set(flight.destination, guide);
        
        // Add delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`❌ Failed to get guide for ${flight.destination}:`, error);
      }
    }

    return guides;
  }

  /**
   * Helper: Get city/country from IATA code (simplified mapping)
   */
  private getCityCountryFromCode(code: string): { city: string; country: string } {
    const mapping: Record<string, { city: string; country: string }> = {
      'BCN': { city: 'Barcelona', country: 'Spain' },
      'PAR': { city: 'Paris', country: 'France' },
      'CDG': { city: 'Paris', country: 'France' },
      'ROM': { city: 'Rome', country: 'Italy' },
      'FCO': { city: 'Rome', country: 'Italy' },
      'LON': { city: 'London', country: 'United Kingdom' },
      'LHR': { city: 'London', country: 'United Kingdom' },
      'NYC': { city: 'New York', country: 'United States' },
      'JFK': { city: 'New York', country: 'United States' },
      'IST': { city: 'Istanbul', country: 'Turkey' },
      'BER': { city: 'Berlin', country: 'Germany' },
      'AMS': { city: 'Amsterdam', country: 'Netherlands' },
      'ATH': { city: 'Athens', country: 'Greece' },
      'PRG': { city: 'Prague', country: 'Czech Republic' },
      'VIE': { city: 'Vienna', country: 'Austria' },
      'BUD': { city: 'Budapest', country: 'Hungary' },
      'LIS': { city: 'Lisbon', country: 'Portugal' },
      'MAD': { city: 'Madrid', country: 'Spain' },
      'DXB': { city: 'Dubai', country: 'UAE' },
      'BKK': { city: 'Bangkok', country: 'Thailand' }
    };

    return mapping[code] || { city: code, country: 'Unknown' };
  }
}

export default new DestinationRecommendationsService();
