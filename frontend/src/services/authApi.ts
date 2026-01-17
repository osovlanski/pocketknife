import axios from 'axios';
import { API_BASE_URL } from '../config';
import logger from './logger';

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
  notificationMethod: string; // "email", "discord", "telegram", "all"
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
  try {
    const api = createAuthApi();
    const response = await api.get('/auth/status');
    return response.data;
  } catch (error: any) {
    logger.error('Failed to get auth status', { error: error.message });
    return {
      authenticated: false,
      message: 'Failed to check authentication status'
    };
  }
};

export const getGoogleAuthUrl = (): string => {
  const email = getStoredEmail();
  const baseUrl = `${API_BASE_URL}/auth/google`;
  return email ? `${baseUrl}?userEmail=${encodeURIComponent(email)}` : baseUrl;
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
    logger.debug('signIn starting', { email: normalizedEmail, apiUrl: API_BASE_URL });
    
    // Store the email first so subsequent requests include it
    setStoredEmail(normalizedEmail);
    logger.debug('Email stored in localStorage');
    
    // Initialize admin - this will create/upgrade the user if it's the admin email
    logger.debug('Calling /admin/initialize...');
    const initResponse = await axios.post(`${API_BASE_URL}/admin/initialize`, {}, {
      headers: { 'X-User-Email': normalizedEmail }
    });
    logger.debug('Initialize response', { status: initResponse.status });
    
    // Get user info
    logger.debug('Calling /admin/me...');
    const api = createAuthApi();
    const response = await api.get('/admin/me');
    logger.debug('/admin/me response', { status: response.status });
    
    const user = response.data.user;
    if (!user) {
      logger.error('No user in response');
      clearStoredEmail();
      return {
        success: false,
        error: 'User not found after sign in'
      };
    }
    
    logger.info('Sign in successful', { role: user.role });
    return {
      success: true,
      user
    };
  } catch (error: any) {
    logger.error('Sign in error', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data
    });
    clearStoredEmail();
    return {
      success: false,
      error: error.response?.data?.error || error.message || 'Failed to sign in'
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
    logger.error('Failed to get current user', { error });
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
    logger.error('Failed to get preferences', { error });
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

// =============================================================================
// FACEBOOK INTEGRATION
// =============================================================================

export interface FacebookStatus {
  configured: boolean;
  connected: boolean;
  appName?: string;
  error?: string;
}

export const getFacebookStatus = async (): Promise<FacebookStatus> => {
  try {
    const api = createAuthApi();
    const response = await api.get('/settings/integrations/facebook/status');
    return response.data;
  } catch (error: any) {
    return {
      configured: false,
      connected: false,
      error: error.response?.data?.error || 'Failed to get Facebook status'
    };
  }
};

export const testFacebookConnection = async (): Promise<{ success: boolean; message: string }> => {
  try {
    const api = createAuthApi();
    const response = await api.post('/settings/integrations/facebook/test');
    return response.data;
  } catch (error: any) {
    return {
      success: false,
      message: error.response?.data?.message || 'Failed to test connection'
    };
  }
};

// =============================================================================
// NOTION INTEGRATION
// =============================================================================

export interface NotionStatus {
  configured: boolean;
  connected: boolean;
  workspaceName?: string;
  error?: string;
}

export const getNotionStatus = async (): Promise<NotionStatus> => {
  try {
    const api = createAuthApi();
    const response = await api.get('/settings/integrations/notion/status');
    return response.data;
  } catch (error: any) {
    return {
      configured: false,
      connected: false,
      error: error.response?.data?.error || 'Failed to get Notion status'
    };
  }
};

// =============================================================================
// SOCIAL SIGN-IN PROVIDERS
// =============================================================================

export interface SocialProvidersStatus {
  facebook: boolean;
  linkedin: boolean;
  sso: boolean;
}

/**
 * Check which social sign-in providers are configured
 * Note: This endpoint doesn't require authentication, so we use axios directly
 */
export const getSocialProvidersStatus = async (): Promise<SocialProvidersStatus> => {
  try {
    // Use axios directly without auth headers - this is a public endpoint
    const response = await axios.get(`${API_BASE_URL}/auth/social/status`);
    return response.data;
  } catch (error: any) {
    // Silently fail - this is just for UI enhancement
    console.debug('Social providers status check failed (this is OK if not configured)');
    // Return all disabled if endpoint fails
    return {
      facebook: false,
      linkedin: false,
      sso: false
    };
  }
};

/**
 * Get Facebook OAuth URL
 */
export const getFacebookAuthUrl = (): string => {
  const email = getStoredEmail();
  const baseUrl = `${API_BASE_URL}/auth/facebook`;
  return email ? `${baseUrl}?userEmail=${encodeURIComponent(email)}` : baseUrl;
};

/**
 * Get LinkedIn OAuth URL
 */
export const getLinkedInAuthUrl = (): string => {
  const email = getStoredEmail();
  const baseUrl = `${API_BASE_URL}/auth/linkedin`;
  return email ? `${baseUrl}?userEmail=${encodeURIComponent(email)}` : baseUrl;
};

/**
 * Get Enterprise SSO URL
 */
export const getSSOAuthUrl = (): string => {
  const email = getStoredEmail();
  const baseUrl = `${API_BASE_URL}/auth/sso`;
  return email ? `${baseUrl}?userEmail=${encodeURIComponent(email)}` : baseUrl;
};

