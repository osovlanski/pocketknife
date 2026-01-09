import axios from 'axios';
import { API_BASE_URL } from '../config';

// =============================================================================
// TYPES
// =============================================================================

export interface AuthStatus {
  authenticated: boolean;
  user?: {
    email: string;
    name?: string;
    picture?: string;
  };
  email?: string;
  authUrl?: string;
  message: string;
  error?: string;
}

export interface CurrentUser {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  role: 'USER' | 'ADMIN' | 'SUPER_ADMIN';
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'PENDING';
  isVerified: boolean;
  lastLoginAt: string | null;
  loginCount: number;
  createdAt: string;
  preferences?: UserPreferences;
}

export interface UserPreferences {
  id: string;
  preferredLocations: string[];
  preferredJobTypes: string[];
  preferredCompanies: string[];
  minSalary?: number;
  maxSalary?: number;
  experienceLevel?: string;
  preferredAirlines: string[];
  homeAirport?: string;
  preferredHotelClass?: number;
  preferredLanguage: string;
  completedLists: string[];
  preferredDifficulty?: string;
  autoArchiveSpam: boolean;
  emailDigestTime?: string;
  defaultTaskDuration?: number;
  workingHoursStart?: string;
  workingHoursEnd?: string;
  weekendEnabled: boolean;
  preferredCurrency: string;
  dealScoreThreshold: number;
  favoriteCategories: string[];
  favoriteBrands: string[];
}

// Local storage key for user email
const USER_EMAIL_KEY = 'pocketknife_user_email';

// =============================================================================
// LOCAL USER SESSION
// =============================================================================

export const getStoredEmail = (): string | null => {
  return localStorage.getItem(USER_EMAIL_KEY);
};

export const setStoredEmail = (email: string): void => {
  localStorage.setItem(USER_EMAIL_KEY, email);
};

export const clearStoredEmail = (): void => {
  localStorage.removeItem(USER_EMAIL_KEY);
};

// Create axios instance with dynamic headers
const createAuthApi = () => {
  const email = getStoredEmail();
  return axios.create({
    baseURL: API_BASE_URL,
    headers: email ? { 'X-User-Email': email } : {}
  });
};

// =============================================================================
// GOOGLE AUTH
// =============================================================================

export const getGoogleAuthStatus = async (): Promise<AuthStatus> => {
  const response = await axios.get(`${API_BASE_URL}/auth/status`);
  return response.data;
};

export const getGoogleAuthUrl = (): string => {
  return `${API_BASE_URL}/auth/google`;
};

export const disconnectGoogle = async (): Promise<{ success: boolean; message?: string; error?: string }> => {
  const response = await axios.post(`${API_BASE_URL}/auth/google/disconnect`);
  return response.data;
};

/**
 * Force re-authentication to get new permissions
 * This is useful when OAuth scopes have been updated (e.g., Calendar permissions added)
 */
export const forceGoogleReauth = async (): Promise<{ success: boolean; authUrl: string; message?: string }> => {
  const response = await axios.post(`${API_BASE_URL}/auth/google/reauth`);
  return response.data;
};

// =============================================================================
// USER AUTHENTICATION
// =============================================================================

export const signIn = async (email: string): Promise<{ success: boolean; user?: CurrentUser; error?: string }> => {
  try {
    const normalizedEmail = email.toLowerCase().trim();
    
    // Store the email first so subsequent requests include it
    setStoredEmail(normalizedEmail);
    
    // Initialize admin - this will create/upgrade the user if it's the admin email
    await axios.post(`${API_BASE_URL}/admin/initialize`, {}, {
      headers: { 'X-User-Email': normalizedEmail }
    });
    
    // Get user info
    const api = createAuthApi();
    const response = await api.get('/admin/me');
    
    const user = response.data.user;
    if (!user) {
      clearStoredEmail();
      return {
        success: false,
        error: 'User not found after sign in'
      };
    }
    
    return {
      success: true,
      user
    };
  } catch (error: any) {
    console.error('Sign in error:', error);
    clearStoredEmail();
    return {
      success: false,
      error: error.response?.data?.error || 'Failed to sign in'
    };
  }
};

export const signOut = (): void => {
  clearStoredEmail();
};

export const getCurrentUser = async (): Promise<CurrentUser | null> => {
  const email = getStoredEmail();
  if (!email) return null;
  
  try {
    const api = createAuthApi();
    const response = await api.get('/admin/me');
    return response.data.user;
  } catch (error) {
    console.error('Failed to get current user:', error);
    return null;
  }
};

export const isSignedIn = (): boolean => {
  return !!getStoredEmail();
};

export const isAdmin = (user: CurrentUser | null): boolean => {
  return user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';
};

// =============================================================================
// USER PREFERENCES
// =============================================================================

export const getPreferences = async (): Promise<UserPreferences | null> => {
  const email = getStoredEmail();
  if (!email) return null;
  
  try {
    const api = createAuthApi();
    const response = await api.get('/settings/preferences');
    return response.data.preferences;
  } catch (error) {
    console.error('Failed to get preferences:', error);
    return null;
  }
};

export const updatePreferences = async (preferences: Partial<UserPreferences>): Promise<{ success: boolean; error?: string }> => {
  try {
    const api = createAuthApi();
    await api.put('/settings/preferences', preferences);
    return { success: true };
  } catch (error: any) {
    return {
      success: false,
      error: error.response?.data?.error || 'Failed to update preferences'
    };
  }
};

export const updateProfile = async (data: { name?: string }): Promise<{ success: boolean; user?: CurrentUser; error?: string }> => {
  try {
    const api = createAuthApi();
    const response = await api.put('/settings/profile', data);
    return { success: true, user: response.data.user };
  } catch (error: any) {
    return {
      success: false,
      error: error.response?.data?.error || 'Failed to update profile'
    };
  }
};

// =============================================================================
// TELEGRAM INTEGRATION
// =============================================================================

export interface TelegramStatus {
  configured: boolean;
  connected: boolean;
  botUsername?: string;
  chatId?: string;
  error?: string;
}

export const getTelegramStatus = async (): Promise<TelegramStatus> => {
  try {
    const api = createAuthApi();
    const response = await api.get('/settings/integrations/telegram/status');
    return response.data;
  } catch (error: any) {
    return {
      configured: false,
      connected: false,
      error: error.response?.data?.error || 'Failed to get Telegram status'
    };
  }
};

export const testTelegramConnection = async (): Promise<{ success: boolean; message: string }> => {
  try {
    const api = createAuthApi();
    const response = await api.post('/settings/integrations/telegram/test');
    return response.data;
  } catch (error: any) {
    return {
      success: false,
      message: error.response?.data?.message || 'Failed to test connection'
    };
  }
};

// =============================================================================
// DISCORD INTEGRATION
// =============================================================================

export interface DiscordStatus {
  configured: boolean;
  connected: boolean;
  webhookUrl?: string;
  error?: string;
}

export const getDiscordStatus = async (): Promise<DiscordStatus> => {
  try {
    const api = createAuthApi();
    const response = await api.get('/settings/integrations/discord/status');
    return response.data;
  } catch (error: any) {
    return {
      configured: false,
      connected: false,
      error: error.response?.data?.error || 'Failed to get Discord status'
    };
  }
};

export const testDiscordConnection = async (): Promise<{ success: boolean; message: string }> => {
  try {
    const api = createAuthApi();
    const response = await api.post('/settings/integrations/discord/test');
    return response.data;
  } catch (error: any) {
    return {
      success: false,
      message: error.response?.data?.message || 'Failed to test connection'
    };
  }
};

