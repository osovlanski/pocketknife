/**
 * Weather Service Tests
 *
 * Basic tests for the OpenWeatherMap API service.
 * These tests verify service configuration and basic functionality.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Store original env
const originalEnv = process.env;

describe('WeatherService', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.clearAllMocks();
  });

  describe('isConfigured', () => {
    it('should return true when API key is set', async () => {
      process.env.OPENWEATHER_API_KEY = 'test-api-key';
      const { weatherService } = await import('../../src/services/integrations/weatherService');
      expect(weatherService.isConfigured()).toBe(true);
    });

    it('should return false when API key is not set', async () => {
      delete process.env.OPENWEATHER_API_KEY;
      const { weatherService } = await import('../../src/services/integrations/weatherService');
      expect(weatherService.isConfigured()).toBe(false);
    });

    it('should return false when API key is empty', async () => {
      process.env.OPENWEATHER_API_KEY = '';
      const { weatherService } = await import('../../src/services/integrations/weatherService');
      expect(weatherService.isConfigured()).toBe(false);
    });
  });

  describe('getCurrentWeather (unconfigured)', () => {
    it('should return null when not configured', async () => {
      delete process.env.OPENWEATHER_API_KEY;
      const { weatherService } = await import('../../src/services/integrations/weatherService');

      const result = await weatherService.getCurrentWeather('Tel Aviv');
      expect(result).toBeNull();
    });
  });

  describe('getForecast (unconfigured)', () => {
    it('should return null when not configured', async () => {
      delete process.env.OPENWEATHER_API_KEY;
      const { weatherService } = await import('../../src/services/integrations/weatherService');

      const result = await weatherService.getForecast('Tel Aviv');
      expect(result).toBeNull();
    });
  });

  describe('getWeatherForDate (unconfigured)', () => {
    it('should return null when not configured', async () => {
      delete process.env.OPENWEATHER_API_KEY;
      const { weatherService } = await import('../../src/services/integrations/weatherService');

      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + 2);

      const result = await weatherService.getWeatherForDate('Tel Aviv', targetDate);
      expect(result).toBeNull();
    });
  });

  describe('getTravelRecommendation (unconfigured)', () => {
    it('should return default recommendation when not configured', async () => {
      delete process.env.OPENWEATHER_API_KEY;
      const { weatherService } = await import('../../src/services/integrations/weatherService');

      const startDate = new Date();
      const endDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      const result = await weatherService.getTravelRecommendation('Barcelona', startDate, endDate);

      // Returns default recommendation when weather data is unavailable
      expect(result).toEqual({
        isGoodForTravel: true,
        recommendation: 'Weather data unavailable. Check local forecasts before travel.',
        packingTips: ['Pack layers for varying conditions'],
        activities: []
      });
    });
  });

  describe('getWeatherEmoji', () => {
    it('should return correct emoji for clear conditions', async () => {
      const { weatherService } = await import('../../src/services/integrations/weatherService');
      expect(weatherService.getWeatherEmoji([{ id: 800, main: 'Clear', description: 'clear sky', icon: '01d' }])).toBe('☀️');
    });

    it('should return correct emoji for rain conditions', async () => {
      const { weatherService } = await import('../../src/services/integrations/weatherService');
      expect(weatherService.getWeatherEmoji([{ id: 500, main: 'Rain', description: 'light rain', icon: '10d' }])).toBe('🌧️');
    });

    it('should return default emoji for unknown conditions', async () => {
      const { weatherService } = await import('../../src/services/integrations/weatherService');
      expect(weatherService.getWeatherEmoji([{ id: 999, main: 'Unknown', description: 'unknown', icon: '00d' }])).toBe('🌡️');
    });

    it('should return default emoji for empty conditions', async () => {
      const { weatherService } = await import('../../src/services/integrations/weatherService');
      expect(weatherService.getWeatherEmoji([])).toBe('🌡️');
    });
  });

  describe('service export', () => {
    it('should export weatherService instance', async () => {
      const module = await import('../../src/services/integrations/weatherService');
      expect(module.weatherService).toBeDefined();
      expect(typeof module.weatherService.isConfigured).toBe('function');
      expect(typeof module.weatherService.getCurrentWeather).toBe('function');
      expect(typeof module.weatherService.getForecast).toBe('function');
      expect(typeof module.weatherService.getWeatherForDate).toBe('function');
      expect(typeof module.weatherService.getTravelRecommendation).toBe('function');
      expect(typeof module.weatherService.getWeatherEmoji).toBe('function');
    });
  });
});
