import Anthropic from '@anthropic-ai/sdk';
import type { TripSearchRequest, TripPlan } from '../types/travel';

class TripPlanningService {
  private client: Anthropic | null = null;

  private initializeClient() {
    if (this.client) return;
    
    const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY is not set');
    }
    
    this.client = new Anthropic({ apiKey });
  }

  /**
   * Generate AI-powered trip itinerary
   */
  async generateTripPlan(
    request: TripSearchRequest,
    flightPrice?: number,
    hotelPrice?: number
  ): Promise<TripPlan> {
    this.initializeClient();
    
    if (!this.client) {
      throw new Error('Failed to initialize Anthropic client');
    }

    try {
      console.log(`🤖 Generating trip plan for ${request.destinations.join(', ')}...`);

      const destination = request.destinations[0];
      const nights = this.calculateNights(request.departureDate, request.returnDate);
      const days = nights + 1;

      const message = await this.client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 3000,
        messages: [{
          role: 'user',
          content: `Create a detailed ${days}-day trip itinerary for travelers from Tel Aviv, Israel.

TRIP DETAILS:
- Destination: ${destination}
- Departure: ${request.departureDate}
- Return: ${request.returnDate || 'Same day'}
- Duration: ${days} days, ${nights} nights
- Travelers: ${request.passengers.adults} adult(s)${request.passengers.children ? `, ${request.passengers.children} child(ren)` : ''}
- Budget: ${request.budget ? `${request.budget.max} ${request.budget.currency} (estimated)` : 'Flexible'}
- Travel Class: ${request.travelClass}
${request.preferences ? `- Preferences: Hotel rating ${request.preferences.hotelRating || 'any'}, ${request.preferences.accommodation || 'hotel'}` : ''}

COST ESTIMATES (if available):
- Flights: ${flightPrice ? `${flightPrice} USD` : 'TBD'}
- Hotels: ${hotelPrice ? `${hotelPrice} USD` : 'TBD'}

INSTRUCTIONS:
1. Create a day-by-day itinerary with morning, afternoon, and evening activities
2. Include popular attractions, restaurants, and local experiences
3. Estimate costs for activities, meals, and transportation
4. Provide local tips and recommendations
5. Suggest what to pack based on season and activities
6. Include visa requirements for Israeli citizens
7. Add health and safety tips

IMPORTANT: Return ONLY valid JSON. No markdown code blocks. No backticks. No explanatory text.
Ensure all strings are properly escaped. Do not use single quotes in text.

JSON Schema:
{
  "overview": "Brief trip overview and highlights",
  "destinations": ["${destination}"],
  "duration": {
    "days": ${days},
    "nights": ${nights}
  },
  "estimatedBudget": {
    "flights": ${flightPrice || 0},
    "hotels": ${hotelPrice || 0},
    "activities": 0,
    "meals": 0,
    "transportation": 0,
    "total": 0,
    "currency": "USD"
  },
  "itinerary": [
    {
      "day": 1,
      "date": "${request.departureDate}",
      "location": "${destination}",
      "activities": [
        {
          "time": "09:00",
          "title": "Activity name",
          "description": "Activity description",
          "estimatedCost": 0,
          "location": "Specific location",
          "tips": ["Tip 1", "Tip 2"]
        }
      ],
      "meals": {
        "breakfast": "Restaurant recommendation",
        "lunch": "Restaurant recommendation",
        "dinner": "Restaurant recommendation"
      }
    }
  ],
  "recommendations": {
    "bestTimeToBook": "When to book for best prices",
    "weatherForecast": "Expected weather conditions",
    "localTips": ["Tip 1", "Tip 2", "Tip 3"],
    "thingsToPack": ["Item 1", "Item 2", "Item 3"],
    "visaRequirements": "Visa info for Israeli citizens",
    "healthAndSafety": ["Safety tip 1", "Safety tip 2"]
  },
  "alternativeOptions": {
    "cheaperDates": ["Alternative date 1", "Alternative date 2"],
    "nearbyDestinations": ["Alternative destination 1"],
    "budgetSavingTips": ["Tip 1", "Tip 2"]
  }
}

Make it practical, realistic, and tailored for Israeli travelers. Include actual restaurant and attraction names when possible.`
        }]
      });

      const firstBlock = message.content[0];
      const responseText = firstBlock.type === 'text' ? firstBlock.text : '';
      
      // Clean the response more thoroughly
      let cleanText = responseText
        .replace(/```json\s*/g, '')
        .replace(/```\s*/g, '')
        .trim();
      
      // Try to find JSON object if there's extra text
      const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        cleanText = jsonMatch[0];
      }
      
      let tripPlan;
      try {
        tripPlan = JSON.parse(cleanText);
      } catch (parseError: any) {
        console.error('❌ JSON parsing failed:', parseError.message);
        console.error('Response preview:', cleanText.substring(0, 500));
        
        // Try to fix common JSON issues
        cleanText = cleanText
          .replace(/,(\s*[}\]])/g, '$1')  // Remove trailing commas
          .replace(/\n/g, ' ')            // Remove newlines in strings
          .replace(/\r/g, '')             // Remove carriage returns
          .replace(/\t/g, ' ')            // Replace tabs with spaces
          .replace(/\\/g, '\\\\')         // Escape backslashes
          .replace(/([^\\])"/g, '$1\\"'); // Escape unescaped quotes (rough fix)
        
        try {
          tripPlan = JSON.parse(cleanText);
          console.log('✅ Fixed JSON and parsed successfully');
        } catch (retryError) {
          console.error('❌ Could not fix JSON. Returning basic plan.');
          // Return a minimal valid plan
          tripPlan = {
            overview: "Trip plan generated but had formatting issues. Please try again.",
            estimatedBudget: { total: flightPrice && hotelPrice ? flightPrice + hotelPrice + 500 : 1500, currency: "USD" },
            itinerary: [],
            recommendations: { localTips: [], thingsToPack: [] }
          };
        }
      }

      console.log(`✅ Trip plan generated with ${tripPlan.itinerary?.length || 0} days`);

      return tripPlan;
    } catch (error: any) {
      console.error('❌ Error generating trip plan:', error);
      throw new Error('Failed to generate trip plan');
    }
  }

  /**
   * Calculate number of nights between dates
   */
  private calculateNights(checkIn: string, checkOut?: string): number {
    if (!checkOut) return 0;
    const start = new Date(checkIn);
    const end = new Date(checkOut);
    const diff = end.getTime() - start.getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }

  /**
   * Quick destination recommendations
   */
  async getDestinationRecommendations(
    budget?: number,
    interests?: string[]
  ): Promise<any> {
    this.initializeClient();

    if (!this.client) {
      throw new Error('Failed to initialize Anthropic client');
    }

    try {
      const message = await this.client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        messages: [{
          role: 'user',
          content: `Recommend 10 travel destinations from Tel Aviv, Israel based on:
- Budget: ${budget ? `$${budget} per person` : 'Flexible'}
- Interests: ${interests && interests.length > 0 ? interests.join(', ') : 'General tourism'}

For each destination, provide:
1. City and country
2. IATA airport code
3. Estimated flight cost from TLV
4. Best time to visit
5. Why it's a good match
6. Visa requirements for Israelis

Respond ONLY with JSON array (no markdown):
[
  {
    "city": "Barcelona",
    "country": "Spain",
    "airportCode": "BCN",
    "estimatedFlightCost": 300,
    "bestTime": "April-October",
    "why": "Reason why it matches criteria",
    "visaRequired": false,
    "flightDuration": "5h 30m"
  }
]`
        }]
      });

      const firstBlock = message.content[0];
      const responseText = firstBlock.type === 'text' ? firstBlock.text : '';
      const cleanText = responseText.replace(/```json|```/g, '').trim();
      return JSON.parse(cleanText);
    } catch (error: any) {
      console.error('❌ Error getting recommendations:', error);
      return [];
    }
  }
}

export default new TripPlanningService();
