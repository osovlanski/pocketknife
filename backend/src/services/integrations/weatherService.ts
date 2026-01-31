/**
 * Weather Service
 *
 * Provides weather forecasts for travel planning and outdoor activities.
 * Uses OpenWeatherMap API (free tier: 1000 calls/day).
 *
 * API Documentation: https://openweathermap.org/api
 */

import axios from 'axios';
import { configService } from '../core/configService';
import { cacheService } from '../core/cacheService';
import logger from '../../utils/logger';

// =============================================================================
// TYPES
// =============================================================================

export interface WeatherCondition {
  id: number;
  main: string;
  description: string;
  icon: string;
}

export interface CurrentWeather {
  location: string;
  country: string;
  temperature: number;
  feelsLike: number;
  humidity: number;
  windSpeed: number;
  conditions: WeatherCondition[];
  visibility: number;
  pressure: number;
  sunrise: Date;
  sunset: Date;
  timezone: number;
}

export interface DailyForecast {
  date: Date;
  temperatureMin: number;
  temperatureMax: number;
  humidity: number;
  windSpeed: number;
  conditions: WeatherCondition[];
  precipitationProbability: number;
  uvIndex: number;
  summary: string;
}

export interface WeatherForecast {
  location: string;
  country: string;
  current: CurrentWeather;
  daily: DailyForecast[];
  alerts?: Array<{
    event: string;
    description: string;
    start: Date;
    end: Date;
  }>;
}

export interface WeatherRecommendation {
  isGoodForTravel: boolean;
  recommendation: string;
  packingTips: string[];
  activities: string[];
}

// =============================================================================
// SERVICE
// =============================================================================

class WeatherService {
  private readonly apiKey: string | undefined;
  private readonly baseUrl = 'https://api.openweathermap.org/data/2.5';
  private readonly geoUrl = 'https://api.openweathermap.org/geo/1.0';

  constructor() {
    this.apiKey = process.env.OPENWEATHER_API_KEY?.trim();
  }

  /**
   * Check if Weather API is configured
   */
  isConfigured(): boolean {
    return !!this.apiKey;
  }

  /**
   * Get coordinates for a city name
   */
  private async getCoordinates(city: string): Promise<{ lat: number; lon: number; name: string; country: string } | null> {
    if (!this.apiKey) return null;

    const cacheKey = `weather:geo:${city.toLowerCase()}`;
    const cached = await cacheService.get<{ lat: number; lon: number; name: string; country: string }>(cacheKey);
    if (cached) return cached;

    try {
      const response = await axios.get(`${this.geoUrl}/direct`, {
        params: {
          q: city,
          limit: 1,
          appid: this.apiKey
        },
        timeout: 10000
      });

      if (response.data.length === 0) {
        return null;
      }

      const location = response.data[0];
      const result = {
        lat: location.lat,
        lon: location.lon,
        name: location.name,
        country: location.country
      };

      // Cache for 7 days
      await cacheService.set(cacheKey, result, { ttl: 604800 });
      return result;
    } catch (error) {
      logger.fail('Failed to get coordinates', { city, error });
      return null;
    }
  }

  /**
   * Get current weather for a location
   */
  async getCurrentWeather(city: string): Promise<CurrentWeather | null> {
    if (!this.apiKey) {
      logger.warn('Weather API not configured');
      return null;
    }

    const coords = await this.getCoordinates(city);
    if (!coords) {
      logger.warn('City not found', { city });
      return null;
    }

    const cacheKey = `weather:current:${coords.lat}:${coords.lon}`;
    const cached = await cacheService.get<CurrentWeather>(cacheKey);
    if (cached) {
      logger.cache('Weather cache hit', { city });
      return cached;
    }

    try {
      logger.api('Fetching current weather', { city });

      const response = await axios.get(`${this.baseUrl}/weather`, {
        params: {
          lat: coords.lat,
          lon: coords.lon,
          appid: this.apiKey,
          units: 'metric'
        },
        timeout: 10000
      });

      const data = response.data;
      const weather: CurrentWeather = {
        location: coords.name,
        country: coords.country,
        temperature: Math.round(data.main.temp),
        feelsLike: Math.round(data.main.feels_like),
        humidity: data.main.humidity,
        windSpeed: Math.round(data.wind.speed * 3.6), // Convert m/s to km/h
        conditions: data.weather,
        visibility: data.visibility / 1000, // Convert to km
        pressure: data.main.pressure,
        sunrise: new Date(data.sys.sunrise * 1000),
        sunset: new Date(data.sys.sunset * 1000),
        timezone: data.timezone
      };

      // Cache for 30 minutes
      await cacheService.set(cacheKey, weather, { ttl: 1800 });

      logger.success('Weather fetched', { city, temp: weather.temperature });
      return weather;
    } catch (error: any) {
      logger.fail('Failed to get weather', { city, error: error.message });
      return null;
    }
  }

  /**
   * Get 7-day forecast for a location
   */
  async getForecast(city: string): Promise<WeatherForecast | null> {
    if (!this.apiKey) {
      logger.warn('Weather API not configured');
      return null;
    }

    const coords = await this.getCoordinates(city);
    if (!coords) {
      logger.warn('City not found', { city });
      return null;
    }

    const cacheKey = `weather:forecast:${coords.lat}:${coords.lon}`;
    const cached = await cacheService.get<WeatherForecast>(cacheKey);
    if (cached) {
      logger.cache('Forecast cache hit', { city });
      return cached;
    }

    try {
      logger.api('Fetching weather forecast', { city });

      // Use One Call API for comprehensive forecast
      const response = await axios.get(`${this.baseUrl}/onecall`, {
        params: {
          lat: coords.lat,
          lon: coords.lon,
          appid: this.apiKey,
          units: 'metric',
          exclude: 'minutely,hourly'
        },
        timeout: 15000
      });

      const data = response.data;

      const current: CurrentWeather = {
        location: coords.name,
        country: coords.country,
        temperature: Math.round(data.current.temp),
        feelsLike: Math.round(data.current.feels_like),
        humidity: data.current.humidity,
        windSpeed: Math.round(data.current.wind_speed * 3.6),
        conditions: data.current.weather,
        visibility: (data.current.visibility || 10000) / 1000,
        pressure: data.current.pressure,
        sunrise: new Date(data.current.sunrise * 1000),
        sunset: new Date(data.current.sunset * 1000),
        timezone: data.timezone_offset
      };

      const daily: DailyForecast[] = (data.daily || []).slice(0, 7).map((day: any) => ({
        date: new Date(day.dt * 1000),
        temperatureMin: Math.round(day.temp.min),
        temperatureMax: Math.round(day.temp.max),
        humidity: day.humidity,
        windSpeed: Math.round(day.wind_speed * 3.6),
        conditions: day.weather,
        precipitationProbability: Math.round((day.pop || 0) * 100),
        uvIndex: day.uvi || 0,
        summary: day.summary || day.weather[0]?.description || ''
      }));

      const forecast: WeatherForecast = {
        location: coords.name,
        country: coords.country,
        current,
        daily,
        alerts: data.alerts?.map((alert: any) => ({
          event: alert.event,
          description: alert.description,
          start: new Date(alert.start * 1000),
          end: new Date(alert.end * 1000)
        }))
      };

      // Cache for 3 hours
      await cacheService.set(cacheKey, forecast, { ttl: 10800 });

      logger.success('Forecast fetched', { city, days: daily.length });
      return forecast;
    } catch (error: any) {
      // Fallback to current weather if One Call fails
      logger.warn('One Call API failed, falling back to basic weather', { error: error.message });

      const current = await this.getCurrentWeather(city);
      if (current) {
        return {
          location: current.location,
          country: current.country,
          current,
          daily: []
        };
      }

      return null;
    }
  }

  /**
   * Get weather for a specific date (uses forecast data)
   */
  async getWeatherForDate(city: string, date: Date): Promise<DailyForecast | CurrentWeather | null> {
    const forecast = await this.getForecast(city);
    if (!forecast) return null;

    const targetDate = new Date(date).toDateString();

    // Check if it's today
    if (new Date().toDateString() === targetDate) {
      return forecast.current;
    }

    // Find the matching day in forecast
    const dayForecast = forecast.daily.find(
      day => new Date(day.date).toDateString() === targetDate
    );

    return dayForecast || null;
  }

  /**
   * Get travel recommendation based on weather
   */
  async getTravelRecommendation(city: string, startDate: Date, endDate: Date): Promise<WeatherRecommendation> {
    const forecast = await this.getForecast(city);

    if (!forecast || forecast.daily.length === 0) {
      return {
        isGoodForTravel: true,
        recommendation: 'Weather data unavailable. Check local forecasts before travel.',
        packingTips: ['Pack layers for varying conditions'],
        activities: []
      };
    }

    // Analyze weather conditions
    const startTime = startDate.getTime();
    const endTime = endDate.getTime();

    const relevantDays = forecast.daily.filter(day => {
      const dayTime = new Date(day.date).getTime();
      return dayTime >= startTime && dayTime <= endTime;
    });

    if (relevantDays.length === 0) {
      // Use current weather as reference
      const current = forecast.current;
      return this.generateRecommendation([{
        temperatureMax: current.temperature,
        temperatureMin: current.temperature - 5,
        precipitationProbability: 0,
        conditions: current.conditions
      } as DailyForecast], city);
    }

    return this.generateRecommendation(relevantDays, city);
  }

  /**
   * Generate travel recommendation from forecast data
   */
  private generateRecommendation(days: DailyForecast[], city: string): WeatherRecommendation {
    const avgMaxTemp = days.reduce((sum, d) => sum + d.temperatureMax, 0) / days.length;
    const avgMinTemp = days.reduce((sum, d) => sum + d.temperatureMin, 0) / days.length;
    const maxRainChance = Math.max(...days.map(d => d.precipitationProbability));
    const hasStorms = days.some(d =>
      d.conditions.some(c => c.main.toLowerCase().includes('thunder'))
    );

    const packingTips: string[] = [];
    const activities: string[] = [];
    let isGoodForTravel = true;
    let recommendation = '';

    // Temperature-based recommendations
    if (avgMaxTemp > 30) {
      packingTips.push('Light, breathable clothing');
      packingTips.push('Sunscreen and sunglasses');
      packingTips.push('Stay hydrated');
      activities.push('Beach activities', 'Water sports', 'Early morning tours');
    } else if (avgMaxTemp > 20) {
      packingTips.push('Light layers');
      packingTips.push('Comfortable walking shoes');
      activities.push('Sightseeing', 'Outdoor dining', 'Hiking');
    } else if (avgMaxTemp > 10) {
      packingTips.push('Jacket or sweater');
      packingTips.push('Long pants');
      activities.push('Museums', 'City tours', 'Cozy cafes');
    } else {
      packingTips.push('Warm coat');
      packingTips.push('Layers');
      packingTips.push('Hat and gloves');
      activities.push('Indoor attractions', 'Hot springs', 'Winter sports');
    }

    // Rain recommendations
    if (maxRainChance > 60) {
      packingTips.push('Umbrella or rain jacket');
      packingTips.push('Waterproof shoes');
      recommendation = `Expect rain during your trip to ${city}. `;
    }

    // Storm warnings
    if (hasStorms) {
      isGoodForTravel = false;
      recommendation += 'Thunderstorms expected. Consider indoor activities and flexible plans.';
    } else if (maxRainChance > 80) {
      recommendation += 'High chance of rain. Pack accordingly and have backup plans.';
    } else if (avgMaxTemp > 35) {
      recommendation += 'Very hot conditions. Stay hydrated and avoid midday sun.';
    } else {
      recommendation += `Good conditions for visiting ${city}. `;
      recommendation += `Expect temperatures between ${Math.round(avgMinTemp)}°C and ${Math.round(avgMaxTemp)}°C.`;
    }

    return {
      isGoodForTravel,
      recommendation,
      packingTips,
      activities
    };
  }

  /**
   * Get weather emoji for conditions
   */
  getWeatherEmoji(conditions: WeatherCondition[]): string {
    const main = conditions[0]?.main.toLowerCase() || '';

    const emojiMap: Record<string, string> = {
      clear: '☀️',
      clouds: '☁️',
      rain: '🌧️',
      drizzle: '🌦️',
      thunderstorm: '⛈️',
      snow: '❄️',
      mist: '🌫️',
      fog: '🌫️',
      haze: '🌫️'
    };

    return emojiMap[main] || '🌡️';
  }
}

export const weatherService = new WeatherService();
export default weatherService;
