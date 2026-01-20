/**
 * Calendar Service Tests
 * 
 * Tests for the Google Calendar integration service.
 * These are lightweight tests focused on service interface and error handling.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock googleAuthService before importing calendar service
vi.mock('../../src/services/email/googleAuthService', () => ({
  default: {
    getClient: vi.fn().mockReturnValue(null),
    isAuthenticated: vi.fn().mockReturnValue(false),
    hasCalendarScopes: vi.fn().mockReturnValue(false)
  }
}));

// Mock googleapis
vi.mock('googleapis', () => ({
  google: {
    calendar: vi.fn().mockReturnValue({
      events: {
        insert: vi.fn().mockResolvedValue({ data: { id: 'event-123' } }),
        update: vi.fn().mockResolvedValue({ data: { id: 'event-123' } }),
        delete: vi.fn().mockResolvedValue({}),
        list: vi.fn().mockResolvedValue({ data: { items: [] } })
      }
    })
  }
}));

describe('CalendarService', () => {
  let calendarService: any;
  let mockGoogleAuthService: any;
  
  beforeEach(async () => {
    vi.resetModules();
    
    mockGoogleAuthService = (await import('../../src/services/email/googleAuthService')).default;
    const { calendarService: service } = await import('../../src/services/calendar/calendarService');
    calendarService = service;
  });
  
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('isAvailable', () => {
    it('should return false when not initialized', () => {
      const isAvailable = calendarService.isAvailable();
      expect(isAvailable).toBe(false);
    });
    
    it('should return false when not authenticated', () => {
      (mockGoogleAuthService.getClient as any).mockReturnValue({ credentials: {} });
      calendarService.initialize();
      (mockGoogleAuthService.isAuthenticated as any).mockReturnValue(false);
      
      const isAvailable = calendarService.isAvailable();
      expect(isAvailable).toBe(false);
    });
  });

  describe('hasCalendarPermissions', () => {
    it('should delegate to googleAuthService.hasCalendarScopes', () => {
      (mockGoogleAuthService.hasCalendarScopes as any).mockReturnValue(true);
      
      const hasPermissions = calendarService.hasCalendarPermissions();
      expect(hasPermissions).toBe(true);
      expect(mockGoogleAuthService.hasCalendarScopes).toHaveBeenCalled();
    });
    
    it('should return false when scopes not granted', () => {
      (mockGoogleAuthService.hasCalendarScopes as any).mockReturnValue(false);
      
      const hasPermissions = calendarService.hasCalendarPermissions();
      expect(hasPermissions).toBe(false);
    });
  });

  describe('createEvent', () => {
    it('should return null when service is not available', async () => {
      (mockGoogleAuthService.isAuthenticated as any).mockReturnValue(false);
      
      const task = {
        id: 'task-123',
        title: 'Test Task',
        dueDate: new Date(),
        priority: 'high'
      };
      
      const result = await calendarService.createEvent(task);
      expect(result).toBeNull();
    });
    
    it('should return null when task has no dueDate', async () => {
      (mockGoogleAuthService.getClient as any).mockReturnValue({ credentials: {} });
      calendarService.initialize();
      (mockGoogleAuthService.isAuthenticated as any).mockReturnValue(true);
      
      const task = {
        id: 'task-123',
        title: 'Test Task',
        dueDate: null,
        priority: 'high'
      };
      
      const result = await calendarService.createEvent(task);
      expect(result).toBeNull();
    });
  });

  describe('updateEvent', () => {
    it('should return false when service is not available', async () => {
      (mockGoogleAuthService.isAuthenticated as any).mockReturnValue(false);
      
      const result = await calendarService.updateEvent('event-123', {
        id: 'task-123',
        title: 'Updated Task',
        dueDate: new Date(),
        priority: 'high'
      });
      
      expect(result).toBe(false);
    });
    
    it('should return false when eventId is not provided', async () => {
      (mockGoogleAuthService.getClient as any).mockReturnValue({ credentials: {} });
      calendarService.initialize();
      (mockGoogleAuthService.isAuthenticated as any).mockReturnValue(true);
      
      const result = await calendarService.updateEvent('', {
        id: 'task-123',
        title: 'Updated Task',
        dueDate: new Date(),
        priority: 'high'
      });
      
      expect(result).toBe(false);
    });
  });

  describe('deleteEvent', () => {
    it('should return false when service is not available', async () => {
      (mockGoogleAuthService.isAuthenticated as any).mockReturnValue(false);
      
      const result = await calendarService.deleteEvent('event-123');
      expect(result).toBe(false);
    });
    
    it('should return false when eventId is not provided', async () => {
      (mockGoogleAuthService.getClient as any).mockReturnValue({ credentials: {} });
      calendarService.initialize();
      (mockGoogleAuthService.isAuthenticated as any).mockReturnValue(true);
      
      const result = await calendarService.deleteEvent('');
      expect(result).toBe(false);
    });
  });

  describe('getEvents', () => {
    it('should return empty array when service is not available', async () => {
      (mockGoogleAuthService.isAuthenticated as any).mockReturnValue(false);
      
      const result = await calendarService.getEvents(new Date(), new Date());
      expect(result).toEqual([]);
    });
    
    it('should return empty array when permissions not granted', async () => {
      (mockGoogleAuthService.getClient as any).mockReturnValue({ credentials: {} });
      calendarService.initialize();
      (mockGoogleAuthService.isAuthenticated as any).mockReturnValue(true);
      (mockGoogleAuthService.hasCalendarScopes as any).mockReturnValue(false);
      
      const result = await calendarService.getEvents(new Date(), new Date());
      expect(result).toEqual([]);
    });
  });

  describe('getDayEvents', () => {
    it('should return empty array when service is not available', async () => {
      (mockGoogleAuthService.isAuthenticated as any).mockReturnValue(false);
      
      const result = await calendarService.getDayEvents(new Date('2026-01-20'));
      expect(result).toEqual([]);
    });
  });

  describe('syncTasks', () => {
    it('should return counts object', async () => {
      (mockGoogleAuthService.isAuthenticated as any).mockReturnValue(false);
      
      const tasks = [
        { id: 'task-1', title: 'Task 1', dueDate: new Date(), priority: 'high', googleEventId: null }
      ];
      
      const result = await calendarService.syncTasks(tasks);
      
      expect(result).toHaveProperty('synced');
      expect(result).toHaveProperty('errors');
    });
  });

  describe('getPermissionError', () => {
    it('should return helpful error message', () => {
      const errorMessage = calendarService.getPermissionError();
      expect(errorMessage).toContain('Calendar permissions not granted');
      expect(errorMessage).toContain('re-authenticate');
    });
  });
});

