/**
 * Google Calendar Service
 * 
 * Manages Google Calendar integration for syncing tasks.
 */

import { google, calendar_v3 } from 'googleapis';
import googleAuthService from '../email/googleAuthService';
import { configService } from '../core/configService';

interface CalendarEvent {
  id?: string;
  summary: string;
  description?: string;
  start: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  colorId?: string;
  reminders?: {
    useDefault: boolean;
    overrides?: { method: string; minutes: number }[];
  };
}

interface Task {
  id: string;
  title: string;
  description?: string | null;
  dueDate: Date | null;
  dueTime?: string | null;
  duration?: number | null;
  priority: string;
  category?: string | null;
  googleEventId?: string | null;
}

// Priority to color mapping (Google Calendar color IDs)
const PRIORITY_COLORS: Record<string, string> = {
  urgent: '11',    // Red
  high: '6',       // Orange
  medium: '7',     // Cyan
  low: '2'         // Green
};

interface CalendarEventResponse {
  id: string;
  title: string;
  description?: string;
  start: string;
  end: string;
  isAllDay: boolean;
  colorId?: string;
  htmlLink?: string;
  isPocketknifeTask: boolean;
}

class CalendarService {
  private initialized = false;

  /**
   * Initialize the Calendar service
   */
  initialize() {
    try {
      const client = googleAuthService.getClient();
      if (!client) {
        console.warn('⚠️ Google auth client not available for Calendar');
        return;
      }

      this.initialized = true;
      console.log('✅ Google Calendar service initialized');
    } catch (error) {
      console.error('❌ Failed to initialize Calendar service:', error);
    }
  }

  /**
   * Get a fresh calendar client (always uses current auth)
   */
  private getCalendar(): calendar_v3.Calendar | null {
    const client = googleAuthService.getClient();
    if (!client) {
      return null;
    }
    return google.calendar({ version: 'v3', auth: client });
  }

  /**
   * Check if calendar service is available
   */
  isAvailable(): boolean {
    return this.initialized && googleAuthService.isAuthenticated();
  }

  /**
   * Check if we have the required Calendar scopes
   */
  hasCalendarPermissions(): boolean {
    return googleAuthService.hasCalendarScopes();
  }

  /**
   * Get error message for missing permissions
   */
  getPermissionError(): string {
    return 'Calendar permissions not granted. Please re-authenticate with Google to grant Calendar access. Go to Settings > Google Integration > Sign In Again.';
  }

  /**
   * Get the primary calendar ID
   */
  private async getPrimaryCalendarId(): Promise<string> {
    return 'primary'; // Uses the user's primary calendar
  }

  /**
   * Create a calendar event from a task
   */
  async createEvent(task: Task): Promise<string | null> {
    if (!this.isAvailable()) {
      console.warn('⚠️ Calendar service not available');
      return null;
    }

    if (!task.dueDate) {
      console.warn('⚠️ Task has no due date, skipping calendar sync');
      return null;
    }

    try {
      const calendarId = await this.getPrimaryCalendarId();
      
      // Calculate start and end times
      let startDateTime: Date;
      let endDateTime: Date;
      const duration = task.duration || 30; // Default 30 minutes

      if (task.dueTime) {
        // Combine dueDate with dueTime
        const [hours, minutes] = task.dueTime.split(':').map(Number);
        startDateTime = new Date(task.dueDate);
        startDateTime.setHours(hours, minutes, 0, 0);
        endDateTime = new Date(startDateTime.getTime() + duration * 60000);
      } else {
        // All-day event or use noon as default
        startDateTime = new Date(task.dueDate);
        startDateTime.setHours(12, 0, 0, 0);
        endDateTime = new Date(startDateTime.getTime() + duration * 60000);
      }

      const event: CalendarEvent = {
        summary: `[${task.priority.toUpperCase()}] ${task.title}`,
        description: this.formatDescription(task),
        start: {
          dateTime: startDateTime.toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
        },
        end: {
          dateTime: endDateTime.toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
        },
        colorId: PRIORITY_COLORS[task.priority] || '7',
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'popup', minutes: 15 },
            { method: 'popup', minutes: 5 }
          ]
        }
      };

      const calendar = this.getCalendar();
      if (!calendar) {
        console.error('❌ Calendar client not available');
        return null;
      }

      const response = await calendar.events.insert({
        calendarId,
        requestBody: event
      });

      console.log(`📅 Created calendar event: ${response.data.id}`);
      return response.data.id || null;
    } catch (error: any) {
      // Log full error details for debugging
      console.error('❌ Calendar API Error:', {
        message: error.message,
        code: error.code,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data
      });
      
      if (error.message?.includes('Insufficient Permission') || error.code === 403) {
        console.error('❌ Calendar permissions not granted. Please re-authenticate with Google.');
        throw new Error('NEEDS_REAUTH: Calendar permissions not granted. Please re-authenticate with Google to grant Calendar access.');
      }
      console.error('❌ Failed to create calendar event:', error.message);
      return null;
    }
  }

  /**
   * Update an existing calendar event
   */
  async updateEvent(eventId: string, task: Task): Promise<boolean> {
    if (!this.isAvailable() || !eventId) {
      return false;
    }

    if (!task.dueDate) {
      // If no due date, delete the event
      return this.deleteEvent(eventId);
    }

    try {
      const calendarId = await this.getPrimaryCalendarId();
      const duration = task.duration || 30;

      let startDateTime: Date;
      let endDateTime: Date;

      if (task.dueTime) {
        const [hours, minutes] = task.dueTime.split(':').map(Number);
        startDateTime = new Date(task.dueDate);
        startDateTime.setHours(hours, minutes, 0, 0);
        endDateTime = new Date(startDateTime.getTime() + duration * 60000);
      } else {
        startDateTime = new Date(task.dueDate);
        startDateTime.setHours(12, 0, 0, 0);
        endDateTime = new Date(startDateTime.getTime() + duration * 60000);
      }

      const event: CalendarEvent = {
        summary: `[${task.priority.toUpperCase()}] ${task.title}`,
        description: this.formatDescription(task),
        start: {
          dateTime: startDateTime.toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
        },
        end: {
          dateTime: endDateTime.toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
        },
        colorId: PRIORITY_COLORS[task.priority] || '7'
      };

      const calendar = this.getCalendar();
      if (!calendar) {
        console.error('❌ Calendar client not available');
        return false;
      }

      await calendar.events.update({
        calendarId,
        eventId,
        requestBody: event
      });

      console.log(`📅 Updated calendar event: ${eventId}`);
      return true;
    } catch (error: any) {
      console.error('❌ Failed to update calendar event:', error.message);
      return false;
    }
  }

  /**
   * Delete a calendar event
   */
  async deleteEvent(eventId: string): Promise<boolean> {
    if (!this.isAvailable() || !eventId) {
      return false;
    }

    try {
      const calendarId = await this.getPrimaryCalendarId();
      const calendar = this.getCalendar();
      if (!calendar) {
        console.error('❌ Calendar client not available');
        return false;
      }
      
      await calendar.events.delete({
        calendarId,
        eventId
      });

      console.log(`🗑️ Deleted calendar event: ${eventId}`);
      return true;
    } catch (error: any) {
      // Ignore not found errors
      if (error.code === 404 || error.code === 410) {
        return true;
      }
      console.error('❌ Failed to delete calendar event:', error.message);
      return false;
    }
  }

  /**
   * Sync multiple tasks to calendar
   */
  async syncTasks(tasks: Task[]): Promise<{ synced: number; errors: number; needsReauth?: boolean }> {
    let synced = 0;
    let errors = 0;
    let needsReauth = false;

    for (const task of tasks) {
      try {
        if (task.googleEventId) {
          // Update existing event
          const success = await this.updateEvent(task.googleEventId, task);
          if (success) synced++;
          else errors++;
        } else {
          // Create new event
          const eventId = await this.createEvent(task);
          if (eventId) synced++;
          else errors++;
        }
      } catch (error: any) {
        if (error.message?.includes('NEEDS_REAUTH')) {
          needsReauth = true;
          errors = tasks.length;
          break; // Stop trying, all will fail
        }
        errors++;
        console.error(`Failed to sync task ${task.id}:`, error);
      }
    }

    return { synced, errors, needsReauth };
  }

  /**
   * Format task description for calendar event
   */
  private formatDescription(task: Task): string {
    const parts: string[] = [];
    
    if (task.description) {
      parts.push(task.description);
    }
    
    parts.push('---');
    parts.push(`Category: ${task.category || 'General'}`);
    parts.push(`Priority: ${task.priority}`);
    parts.push(`Task ID: ${task.id}`);
    parts.push('\nManaged by Pocketknife ToDo Agent');
    
    return parts.join('\n');
  }

  /**
   * Get calendar events for a date range
   */
  async getEvents(startDate: Date, endDate: Date): Promise<CalendarEventResponse[]> {
    if (!this.isAvailable()) {
      console.warn('⚠️ Calendar service not available');
      return [];
    }

    if (!this.hasCalendarPermissions()) {
      console.warn('⚠️ Calendar permissions not granted');
      return [];
    }

    try {
      const calendar = this.getCalendar();
      if (!calendar) {
        return [];
      }

      const calendarId = await this.getPrimaryCalendarId();
      
      const response = await calendar.events.list({
        calendarId,
        timeMin: startDate.toISOString(),
        timeMax: endDate.toISOString(),
        singleEvents: true,
        orderBy: 'startTime',
        maxResults: configService.get('limits.calendar.events.maxResults', 50) as number
      });

      const events = response.data.items || [];
      
      return events.map(event => ({
        id: event.id || '',
        title: event.summary || 'Untitled Event',
        description: event.description || undefined,
        start: event.start?.dateTime || event.start?.date || '',
        end: event.end?.dateTime || event.end?.date || '',
        isAllDay: !event.start?.dateTime,
        colorId: event.colorId ?? undefined,
        htmlLink: event.htmlLink || undefined,
        isPocketknifeTask: (event.description || '').includes('Pocketknife ToDo Agent')
      })) as CalendarEventResponse[];
    } catch (error: any) {
      console.error('❌ Failed to get calendar events:', error.message);
      return [];
    }
  }

  /**
   * Get events for a specific day
   */
  async getDayEvents(date: Date): Promise<CalendarEventResponse[]> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    
    return this.getEvents(startOfDay, endOfDay);
  }
}

interface CalendarEventResponse {
  id: string;
  title: string;
  description?: string;
  start: string;
  end: string;
  isAllDay: boolean;
  colorId?: string;
  htmlLink?: string;
  isPocketknifeTask: boolean;
}

export const calendarService = new CalendarService();
export default calendarService;

