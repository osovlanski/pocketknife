/**
 * Rami Levy API Service
 * 
 * Direct integration with Rami Levy's online grocery store API.
 * Provides product search, cart management, and checkout functionality.
 * 
 * Based on the Rami Levy MCP Server by Shilo Magen (MIT License)
 * https://github.com/shilomagen/rami-levy-mcp
 * 
 * IMPORTANT: This is an unofficial integration. Users must provide their own
 * authentication tokens extracted from their browser session.
 * 
 * ⚠️ CLOUDFLARE LIMITATION:
 * This integration only works when running the backend LOCALLY (npm run dev).
 * It does NOT work from Railway/production servers because:
 * - Cloudflare's cf_clearance cookie is bound to the browser's IP address
 * - When the server (Railway) makes requests, it has a different IP
 * - Cloudflare rejects the request with a 403 error
 * 
 * For production use, consider:
 * - Running as a local MCP server on the user's machine
 * - Using a browser extension that runs in the Rami Levy context
 * - Finding an alternative API that doesn't use Cloudflare protection
 * 
 * @module services/cooking/ramiLevyService
 */

import axios, { AxiosInstance } from 'axios';
import { getPrisma } from '../core/databaseService';
import { configService } from '../core/configService';
import { cacheService } from '../core/cacheService';
import { encrypt, decrypt, isEncrypted } from '../../utils/encryption';
import logger from '../../utils/logger';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Authentication tokens required for Rami Levy API
 */
export interface RamiLevyTokens {
  /** Bearer token from Authorization header */
  apiKey: string;
  /** ecomtoken header value (optional - only needed for cart ops, appears when logged in) */
  ecomToken?: string;
  /** Full cookie string */
  cookie: string;
}

/**
 * Product information from Rami Levy catalog
 */
export interface RamiLevyProduct {
  id: number;
  barcode: string;
  name: string;
  price: number;
  imageUrl: string;
  brand?: string;
  department?: string;
  group?: string;
  subGroup?: string;
  unit?: string;
  isAvailable: boolean;
  nutritionalInfo?: {
    calories?: number;
    protein?: number;
    carbs?: number;
    fat?: number;
    sodium?: number;
  };
}

/**
 * Item in the shopping cart
 */
export interface RamiLevyCartItem {
  id: number;
  name: string;
  quantity: number;
  price: number;
  totalPrice: number;
  savings?: number;
  imageUrl?: string;
}

/**
 * Shopping cart state
 */
export interface RamiLevyCart {
  items: RamiLevyCartItem[];
  totalPrice: number;
  totalSavings: number;
  itemCount: number;
  deliveryFee?: number;
}

/**
 * Search results from catalog
 */
export interface RamiLevySearchResult {
  products: RamiLevyProduct[];
  total: number;
  query: string;
}

/**
 * Token validation status with detailed info
 */
export interface TokenStatus {
  isValid: boolean;
  userId: string;
  lastUsed?: Date;
  expiresAt?: Date;
  tokenAge?: string;       // Human readable age (e.g., "2 hours ago")
  expiresIn?: string;      // Human readable expiry (e.g., "in 5 days")
  isExpiringSoon?: boolean; // True if expires within 24 hours
  errorMessage?: string;
  refreshInstructions?: string;
}

/**
 * Decode base64 with fallback for both base64url and standard base64
 * Rami Levy may use standard base64 which includes +, /, and = characters
 * @param base64String - Base64 encoded string
 * @returns Decoded string or null on failure
 */
const decodeBase64 = (base64String: string): string | null => {
  try {
    // First, try base64url (RFC 4648 § 5) - uses - and _
    return Buffer.from(base64String, 'base64url').toString('utf8');
  } catch {
    try {
      // Fallback to standard base64 - uses + and /
      // Also handle missing padding
      const padded = base64String + '='.repeat((4 - base64String.length % 4) % 4);
      return Buffer.from(padded, 'base64').toString('utf8');
    } catch {
      return null;
    }
  }
};

/**
 * Clean a token string by removing problematic characters
 * Handles: whitespace, newlines, zero-width characters, trailing garbage
 * @param token - Raw token string
 * @returns Cleaned token
 */
const cleanTokenString = (token: string | undefined): string => {
  if (!token) return '';

  return token
    // Remove leading/trailing whitespace and newlines
    .trim()
    // Remove zero-width characters (common from copy/paste)
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    // Remove newlines and carriage returns
    .replace(/[\r\n]/g, '')
    // Remove trailing non-JWT characters (sometimes copy/paste adds garbage)
    .replace(/[^A-Za-z0-9\-_\.=+\/]+$/, '')
    // Remove leading non-JWT characters
    .replace(/^[^A-Za-z0-9]+/, '');
};

/**
 * Validate JWT token structure
 * @param token - JWT token string
 * @returns Validation result with details
 */
interface TokenValidation {
  isValid: boolean;
  parts: number;
  error?: string;
  hasExpiration?: boolean;
  isExpired?: boolean;
  expiresAt?: Date;
}

const validateJwtStructure = (token: string): TokenValidation => {
  if (!token) {
    return { isValid: false, parts: 0, error: 'Token is empty' };
  }

  const cleaned = cleanTokenString(token);
  const parts = cleaned.split('.');

  if (parts.length !== 3) {
    return { 
      isValid: false, 
      parts: parts.length, 
      error: `Token has ${parts.length} parts, expected 3 (header.payload.signature). Token appears truncated.`
    };
  }

  // Validate each part is valid base64
  for (let i = 0; i < parts.length; i++) {
    const partName = ['header', 'payload', 'signature'][i];
    if (!parts[i] || parts[i].length < 10) {
      return { 
        isValid: false, 
        parts: parts.length, 
        error: `JWT ${partName} is too short or missing`
      };
    }
  }

  // Try to parse expiration from payload
  try {
    const payloadStr = decodeBase64(parts[1]);
    if (payloadStr) {
      const payload = JSON.parse(payloadStr);
      if (payload.exp) {
        const expiresAt = new Date(payload.exp * 1000);
        const isExpired = expiresAt.getTime() < Date.now();
        return { 
          isValid: !isExpired, 
          parts: 3, 
          hasExpiration: true,
          isExpired,
          expiresAt,
          error: isExpired ? `Token expired on ${expiresAt.toISOString()}` : undefined
        };
      }
    }
  } catch {
    // Payload parsing failed, but structure is valid
  }

  return { isValid: true, parts: 3 };
};

/**
 * Parse JWT token to extract expiration time
 * Handles both base64url and standard base64 encoding
 * @param token - JWT token string
 * @returns Expiration date or null
 */
const parseJwtExpiration = (token: string): Date | null => {
  if (!token) return null;

  try {
    const cleanedToken = cleanTokenString(token);
    const parts = cleanedToken.split('.');
    if (parts.length < 2) {
      logger.debug('JWT parsing: not enough parts', { parts: parts.length });
      return null;
    }

    // Decode the payload (second part)
    const payloadStr = decodeBase64(parts[1]);
    if (!payloadStr) {
      logger.debug('JWT parsing: failed to decode payload');
      return null;
    }

    const payload = JSON.parse(payloadStr);

    if (payload.exp) {
      const expDate = new Date(payload.exp * 1000);
      logger.debug('JWT expiration parsed', {
        exp: payload.exp,
        date: expDate.toISOString(),
        isExpired: expDate < new Date()
      });
      return expDate;
    }
    return null;
  } catch (error: any) {
    logger.debug('JWT parsing failed', { error: error.message });
    return null;
  }
};

/**
 * Get human readable time difference
 */
const getTimeAgo = (date: Date): string => {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
  return `${Math.floor(seconds / 86400)} days ago`;
};

/**
 * Get human readable time until expiration
 */
const getTimeUntil = (date: Date): string => {
  const seconds = Math.floor((date.getTime() - Date.now()) / 1000);
  
  if (seconds < 0) return 'expired';
  if (seconds < 60) return 'less than a minute';
  if (seconds < 3600) return `in ${Math.floor(seconds / 60)} minutes`;
  if (seconds < 86400) return `in ${Math.floor(seconds / 3600)} hours`;
  return `in ${Math.floor(seconds / 86400)} days`;
};

const REFRESH_INSTRUCTIONS = `To refresh your Rami Levy tokens:
1. Go to rami-levy.co.il and log in
2. Open DevTools (F12) → Network tab
3. Search for any product (e.g., "חלב")
4. Find a request to www.rami-levy.co.il/api
5. Right-click the request → "Copy as cURL"
6. Extract these headers:
   - Authorization: Copy FULL Bearer token (starts with "eyJ...")
   - ecomtoken: Copy the full value
   - Cookie: Copy the ENTIRE cookie string (MUST include cf_clearance)

IMPORTANT: The cf_clearance cookie (Cloudflare) expires quickly!
Copy fresh cookies each time you get a 403 error.`;

/**
 * Validate that critical cookies are present
 */
const validateCookies = (cookie: string): { valid: boolean; missing: string[] } => {
  const missing: string[] = [];

  // Critical cookies that should be present
  const criticalCookies = [
    { name: 'cf_clearance', description: 'Cloudflare protection (expires quickly!)' },
    { name: 'AWSALB', description: 'AWS load balancer session' }
  ];

  for (const { name, description } of criticalCookies) {
    if (!cookie.includes(`${name}=`)) {
      missing.push(`${name} (${description})`);
    }
  }

  return { valid: missing.length === 0, missing };
};

/**
 * User session state (per-user, thread-safe)
 */
interface UserSession {
  axiosInstance: AxiosInstance;
  tokens: RamiLevyTokens;
  cart: RamiLevyCart | null;
  lastUsed: Date;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const RAMI_LEVY_BASE_URL = 'https://www.rami-levy.co.il';
const RAMI_LEVY_API_URL = `${RAMI_LEVY_BASE_URL}/api`;
const DEFAULT_STORE_ID = configService.get('ramiLevy.defaultStoreId', '331');
const CHECKOUT_URL = `${RAMI_LEVY_BASE_URL}/he/dashboard/checkout`;

// Retry configuration
const MAX_RETRIES = configService.get('ramiLevy.api.maxRetries', 3);
const INITIAL_RETRY_DELAY_MS = configService.get('ramiLevy.api.retryDelayMs', 1000);

// Circuit breaker configuration
const CIRCUIT_BREAKER_THRESHOLD = configService.get('ramiLevy.circuitBreaker.threshold', 5);
const CIRCUIT_BREAKER_RESET_MS = configService.get('ramiLevy.circuitBreaker.resetMs', 60000);

/**
 * Circuit Breaker State
 * Prevents cascade failures when Rami Levy API is unavailable
 */
interface CircuitBreakerState {
  failures: number;
  lastFailure: Date | null;
  isOpen: boolean;
}

const circuitBreaker: CircuitBreakerState = {
  failures: 0,
  lastFailure: null,
  isOpen: false
};

// =============================================================================
// SERVICE
// =============================================================================

/**
 * Check if circuit breaker should allow request
 */
const isCircuitBreakerOpen = (): boolean => {
  if (!circuitBreaker.isOpen) return false;

  // Check if enough time has passed to reset
  if (circuitBreaker.lastFailure) {
    const elapsed = Date.now() - circuitBreaker.lastFailure.getTime();
    if (elapsed >= CIRCUIT_BREAKER_RESET_MS) {
      // Reset circuit breaker (half-open state)
      circuitBreaker.isOpen = false;
      circuitBreaker.failures = 0;
      logger.info('Rami Levy circuit breaker reset (half-open)');
      return false;
    }
  }

  return true;
};

/**
 * Record a failure for circuit breaker
 */
const recordCircuitBreakerFailure = (): void => {
  circuitBreaker.failures++;
  circuitBreaker.lastFailure = new Date();

  if (circuitBreaker.failures >= CIRCUIT_BREAKER_THRESHOLD) {
    circuitBreaker.isOpen = true;
    logger.warn('Rami Levy circuit breaker OPEN - too many failures', {
      failures: circuitBreaker.failures,
      resetMs: CIRCUIT_BREAKER_RESET_MS
    });
  }
};

/**
 * Record a success for circuit breaker (reset on success)
 */
const recordCircuitBreakerSuccess = (): void => {
  if (circuitBreaker.failures > 0) {
    circuitBreaker.failures = 0;
    circuitBreaker.isOpen = false;
    logger.info('Rami Levy circuit breaker reset (success)');
  }
};

/**
 * Rami Levy API Service
 *
 * Thread-safe service that manages per-user sessions.
 * Each user has their own axios instance and cart state.
 * Includes circuit breaker pattern to prevent cascade failures.
 */
class RamiLevyService {
  /** Per-user session storage (thread-safe) */
  private sessions: Map<string, UserSession> = new Map();

  /**
   * Create axios instance with authentication headers for a user
   * @param tokens - User's authentication tokens
   * @returns Configured axios instance
   */
  private createAxiosInstance(tokens: RamiLevyTokens): AxiosInstance {
    // Use the new cleanTokenString function for robust token cleaning
    const cleanedApiKey = cleanTokenString(tokens.apiKey);
    const cleanedEcomToken = tokens.ecomToken ? cleanTokenString(tokens.ecomToken) : undefined;
    const cleanedCookie = cleanTokenString(tokens.cookie);

    // Validate token structures
    const apiKeyValidation = validateJwtStructure(cleanedApiKey);
    const ecomTokenValidation = cleanedEcomToken ? validateJwtStructure(cleanedEcomToken) : null;

    logger.debug('Token structure analysis', {
      apiKey: {
        length: cleanedApiKey.length,
        parts: apiKeyValidation.parts,
        isValid: apiKeyValidation.isValid,
        error: apiKeyValidation.error
      },
      ecomToken: cleanedEcomToken ? {
        length: cleanedEcomToken.length,
        parts: ecomTokenValidation?.parts,
        isValid: ecomTokenValidation?.isValid,
        expiresAt: ecomTokenValidation?.expiresAt?.toISOString()
      } : 'not provided',
      cookieLength: cleanedCookie.length
    });

    // Determine best token for Authorization header
    // Priority: Valid EcomToken > Valid ApiKey > Any available token
    let authToken: string;
    let authSource: string;

    if (ecomTokenValidation?.isValid && cleanedEcomToken) {
      // EcomToken is valid and complete - prefer it
      authToken = cleanedEcomToken;
      authSource = 'ecomToken (valid)';
    } else if (apiKeyValidation.isValid) {
      // ApiKey is valid
      authToken = cleanedApiKey;
      authSource = 'apiKey (valid)';
    } else if (cleanedEcomToken && ecomTokenValidation && ecomTokenValidation.parts === 3) {
      // EcomToken has correct structure but may be expired - still try it
      authToken = cleanedEcomToken;
      authSource = 'ecomToken (fallback, may be expired)';
    } else {
      // Fallback to whatever we have
      authToken = cleanedEcomToken || cleanedApiKey;
      authSource = cleanedEcomToken ? 'ecomToken (truncated apiKey fallback)' : 'apiKey (truncated)';
      logger.warn('Using potentially invalid token for Authorization', {
        apiKeyValidation,
        ecomTokenValidation,
        selectedSource: authSource
      });
    }

    // Determine if we should skip cookies (for production servers with different IPs)
    // cf_clearance cookie is IP-bound, so it will fail if sent from a different IP
    // When we have a valid ecomToken, the API works WITHOUT cookies (tested via curl)
    const hasValidEcomToken = ecomTokenValidation?.isValid && cleanedEcomToken;
    const skipCookies = hasValidEcomToken && configService.get('ramiLevy.skipCookiesForEcomToken', true);

    logger.info('Token selection for API calls', {
      authSource,
      authTokenLength: authToken.length,
      hasEcomTokenHeader: !!cleanedEcomToken,
      skipCookies,
      reason: skipCookies ? 'Valid ecomToken - cookies not needed (avoids Cloudflare IP binding)' : 'Including cookies'
    });

    const headers: Record<string, string> = {
      // Standard headers
      'Accept': 'application/json, text/plain, */*',
      'Accept-Language': 'he,en-GB;q=0.9,en-US;q=0.8,en;q=0.7',
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json;charset=UTF-8',
      'locale': 'he',
      'Origin': RAMI_LEVY_BASE_URL,
      'Referer': `${RAMI_LEVY_BASE_URL}/he/online/search`,
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36',

      // Security headers required by Cloudflare - CRITICAL for bypassing bot detection
      'sec-ch-ua': '"Not(A:Brand";v="8", "Chromium";v="144", "Google Chrome";v="144"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"macOS"',
      'sec-fetch-dest': 'empty',
      'sec-fetch-mode': 'cors',
      'sec-fetch-site': 'same-origin',
      'priority': 'u=1, i'
    };

    // Only include cookies if we don't have a valid ecomToken
    // This avoids Cloudflare IP binding issues when running from production servers
    if (!skipCookies && cleanedCookie) {
      headers['Cookie'] = cleanedCookie;
    }

    // ecomToken is sent as separate header for cart operations
    // Send both lowercase and mixed-case for compatibility
    if (cleanedEcomToken) {
      headers['ecomtoken'] = cleanedEcomToken;
      headers['EcomToken'] = cleanedEcomToken; // Some servers are case-sensitive
    }

    return axios.create({
      baseURL: RAMI_LEVY_API_URL,
      timeout: configService.get('ramiLevy.api.timeoutMs', 15000),
      headers
    });
  }

  /**
   * Execute API call with exponential backoff retry and circuit breaker
   * @param fn - Async function to execute
   * @param context - Context for logging
   * @returns Result of the function
   */
  private async withRetry<T>(
    fn: () => Promise<T>,
    context: string
  ): Promise<T> {
    // Check circuit breaker first
    if (isCircuitBreakerOpen()) {
      throw new Error(
        'Rami Levy API is temporarily unavailable (circuit breaker open). ' +
        'Please try again later.'
      );
    }

    let lastError: Error | null = null;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const result = await fn();
        recordCircuitBreakerSuccess();
        return result;
      } catch (error: any) {
        lastError = error;

        // Don't retry on auth errors
        if (error.response?.status === 401 || error.response?.status === 403) {
          throw error;
        }

        // Record failure for circuit breaker
        recordCircuitBreakerFailure();

        if (attempt < MAX_RETRIES - 1) {
          const delay = INITIAL_RETRY_DELAY_MS * Math.pow(2, attempt);
          logger.retry(`${context} - attempt ${attempt + 1} failed, retrying in ${delay}ms`, {
            error: error.message,
            attempt: attempt + 1,
            maxRetries: MAX_RETRIES
          });
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError;
  }

  /**
   * Get user session (creates if needed after initialization)
   * @param userId - User identifier
   * @returns User session or null if not initialized
   */
  private getSession(userId: string): UserSession | null {
    return this.sessions.get(userId) || null;
  }

  /**
   * Ensure user session is initialized
   * @param userId - User identifier
   * @throws Error if session not initialized
   */
  private ensureSession(userId: string): UserSession {
    const session = this.sessions.get(userId);
    if (!session) {
      throw new Error('Rami Levy not initialized. Call initialize() first.');
    }
    return session;
  }

  /**
   * Initialize service for a user with their stored tokens
   * @param userId - User identifier
   * @returns Token validation status with detailed info
   */
  async initialize(userId: string): Promise<TokenStatus> {
    try {
      // Check if we're in production and local-only mode is enabled
      const isProduction = process.env.NODE_ENV === 'production';
      const localOnlyMode = configService.get('ramiLevy.localOnlyMode', true);
      
      if (isProduction && localOnlyMode) {
        logger.warn('Rami Levy is in local-only mode - not available in production');
        return {
          isValid: false,
          userId,
          errorMessage: 'Rami Levy integration is only available when running locally. ' +
            'Due to Cloudflare protection, the API cannot be accessed from cloud servers (Railway). ' +
            'Run the backend locally (npm run dev) to use this feature.',
          refreshInstructions: 'To use Rami Levy:\n' +
            '1. Run the backend locally: cd backend && npm run dev\n' +
            '2. The local server shares your browser\'s IP, bypassing Cloudflare restrictions.\n' +
            '3. Cloud deployment (Railway) cannot access this API due to IP binding.'
        };
      }

      const tokens = await this.getStoredTokens(userId);

      if (!tokens) {
        return {
          isValid: false,
          userId,
          errorMessage: 'No tokens stored. Please configure Rami Levy authentication.',
          refreshInstructions: REFRESH_INSTRUCTIONS
        };
      }

      // Validate token structure first
      const cleanedApiKey = cleanTokenString(tokens.apiKey);
      const cleanedEcomToken = tokens.ecomToken ? cleanTokenString(tokens.ecomToken) : undefined;
      const cleanedCookie = cleanTokenString(tokens.cookie);

      // Basic structure validation
      if (!cleanedApiKey || cleanedApiKey.length < 10) {
        return {
          isValid: false,
          userId,
          errorMessage: 'API Key (Bearer token) is missing or too short. Please copy the full Authorization header value.',
          refreshInstructions: REFRESH_INSTRUCTIONS
        };
      }

      if (!cleanedCookie || cleanedCookie.length < 20) {
        return {
          isValid: false,
          userId,
          errorMessage: 'Cookie is missing or too short. Please copy the full Cookie header value.',
          refreshInstructions: REFRESH_INSTRUCTIONS
        };
      }

      // Check if ecomToken is valid (if so, cookies are optional)
      const ecomTokenValidation = cleanedEcomToken ? validateJwtStructure(cleanedEcomToken) : null;
      const hasValidEcomToken = ecomTokenValidation?.isValid === true;

      // Validate critical cookies - but only warn if we don't have a valid ecomToken
      // When ecomToken is valid, cookies are optional (avoids Cloudflare IP binding issues)
      const cookieValidation = validateCookies(cleanedCookie);
      if (!cookieValidation.valid && !hasValidEcomToken) {
        logger.warn('Missing critical cookies and no valid ecomToken', { missing: cookieValidation.missing });
        return {
          isValid: false,
          userId,
          errorMessage: `Missing critical cookies: ${cookieValidation.missing.join(', ')}. Please copy the FULL cookie string from DevTools.`,
          refreshInstructions: REFRESH_INSTRUCTIONS
        };
      } else if (!cookieValidation.valid && hasValidEcomToken) {
        logger.info('Missing some cookies but ecomToken is valid - proceeding without cookies', {
          missing: cookieValidation.missing
        });
      }

      // Parse expiration from both tokens (check whichever is a valid JWT)
      const apiKeyExp = parseJwtExpiration(cleanedApiKey);
      const ecomTokenExp = cleanedEcomToken ? parseJwtExpiration(cleanedEcomToken) : null;

      // Use the earliest expiration date from either token
      const expiresAt = apiKeyExp && ecomTokenExp
        ? (apiKeyExp < ecomTokenExp ? apiKeyExp : ecomTokenExp)
        : apiKeyExp || ecomTokenExp;

      const now = Date.now();
      const isExpired = expiresAt ? expiresAt.getTime() < now : false;
      const isExpiringSoon = expiresAt
        ? (expiresAt.getTime() - now) < 24 * 60 * 60 * 1000
        : false;

      // Log token analysis
      logger.debug('Rami Levy token analysis', {
        apiKeyJwt: apiKeyExp ? 'valid' : 'not a JWT',
        ecomTokenJwt: ecomTokenExp ? 'valid' : 'not a JWT or not provided',
        expiresAt: expiresAt?.toISOString() || 'unknown',
        isExpired,
        isExpiringSoon
      });

      // If token is already expired based on JWT, don't bother validating with API
      if (isExpired) {
        const expiredToken = apiKeyExp && apiKeyExp.getTime() < now ? 'API Key' : 'EcomToken';
        return {
          isValid: false,
          userId,
          expiresAt: expiresAt || undefined,
          expiresIn: 'expired',
          errorMessage: `${expiredToken} expired on ${expiresAt?.toLocaleString()}. Please refresh your authentication.`,
          refreshInstructions: REFRESH_INSTRUCTIONS
        };
      }

      // Create session for this user
      const axiosInstance = this.createAxiosInstance(tokens);
      this.sessions.set(userId, {
        axiosInstance,
        tokens,
        cart: null,
        lastUsed: new Date()
      });

      // Validate tokens with a simple API request
      const validation = await this.validateTokens(userId);

      if (validation.valid) {
        await this.updateLastUsed(userId);
        logger.success('Rami Levy service initialized', { userId });

        const tokenInfo = await this.getTokenInfo(userId);

        return {
          isValid: true,
          userId,
          lastUsed: new Date(),
          expiresAt: expiresAt || undefined,
          tokenAge: tokenInfo?.updatedAt ? getTimeAgo(tokenInfo.updatedAt) : undefined,
          expiresIn: expiresAt ? getTimeUntil(expiresAt) : undefined,
          isExpiringSoon
        };
      }

      // Clean up invalid session
      this.sessions.delete(userId);

      return {
        isValid: false,
        userId,
        expiresAt: expiresAt || undefined,
        expiresIn: expiresAt ? getTimeUntil(expiresAt) : undefined,
        errorMessage: validation.error || 'Tokens expired or invalid. Please refresh your authentication.',
        refreshInstructions: REFRESH_INSTRUCTIONS
      };
    } catch (error: any) {
      logger.fail('Failed to initialize Rami Levy service', { userId, error: error.message });
      return {
        isValid: false,
        userId,
        errorMessage: error.message,
        refreshInstructions: REFRESH_INSTRUCTIONS
      };
    }
  }

  /**
   * Get token metadata from database
   */
  private async getTokenInfo(userId: string): Promise<{ updatedAt: Date } | null> {
    const prisma = getPrisma();
    if (!prisma) return null;

    try {
      const record = await (prisma as any).ramiLevyToken?.findUnique({
        where: { userId },
        select: { updatedAt: true }
      });
      return record || null;
    } catch {
      return null;
    }
  }

  /**
   * Validate tokens by making a simple API call
   * Also checks JWT expiration before making the request
   * @param userId - User identifier
   * @returns Object with validation result and error details
   */
  private async validateTokens(userId: string): Promise<{ valid: boolean; error?: string }> {
    const session = this.getSession(userId);
    if (!session) {
      return { valid: false, error: 'No session found' };
    }

    // Pre-check: Verify JWT structure before making API call
    const apiKeyExp = parseJwtExpiration(session.tokens.apiKey);
    const ecomTokenExp = session.tokens.ecomToken ? parseJwtExpiration(session.tokens.ecomToken) : null;
    const now = new Date();

    // Log expiration status
    logger.debug('Token expiration check', {
      apiKeyExp: apiKeyExp?.toISOString() || 'not a JWT',
      ecomTokenExp: ecomTokenExp?.toISOString() || 'not provided/not a JWT',
      apiKeyExpired: apiKeyExp ? apiKeyExp < now : 'unknown',
      ecomTokenExpired: ecomTokenExp ? ecomTokenExp < now : 'unknown'
    });

    // Check if tokens are expired before making the API call
    if (apiKeyExp && apiKeyExp < now) {
      return {
        valid: false,
        error: `API Key (Bearer token) expired on ${apiKeyExp.toLocaleString()}. Please log in to Rami Levy and copy fresh tokens.`
      };
    }

    if (ecomTokenExp && ecomTokenExp < now) {
      return {
        valid: false,
        error: `EcomToken expired on ${ecomTokenExp.toLocaleString()}. Please log in to Rami Levy and copy fresh tokens.`
      };
    }

    try {
      logger.api('Validating Rami Levy tokens with test search...');
      const response = await session.axiosInstance.post('/catalog', {
        q: 'test',
        aggs: 0,
        store: DEFAULT_STORE_ID
      });

      // Check if the response indicates success
      const data = response.data;
      if (data.status === 200 || (data.data && Array.isArray(data.data))) {
        logger.success('Token validation successful', {
          resultCount: data.data?.length || 0
        });
        return { valid: true };
      }

      logger.warn('Token validation: unexpected response format', {
        status: data.status,
        hasData: !!data.data,
        dataType: typeof data.data
      });
      return { valid: false, error: `API returned status ${data.status}` };
    } catch (error: any) {
      const status = error.response?.status;
      const responseData = error.response?.data;
      const message = responseData?.message || responseData?.error || error.message;

      // Log detailed error info for debugging
      logger.fail('Token validation failed', {
        status,
        message,
        url: error.config?.url,
        responseData: typeof responseData === 'object' ? JSON.stringify(responseData).substring(0, 500) : responseData,
        headers: error.config?.headers ? {
          hasAuth: !!error.config.headers['Authorization'],
          authLength: error.config.headers['Authorization']?.length || 0,
          hasCookie: !!error.config.headers['Cookie'],
          cookieLength: error.config.headers['Cookie']?.length || 0,
          hasEcom: !!error.config.headers['ecomtoken'],
          hasEcomMixed: !!error.config.headers['EcomToken']
        } : 'none'
      });

      if (status === 401 || status === 403) {
        const detail = responseData?.error || responseData?.message || '';

        // Check if this looks like a Cloudflare block
        const responseText = typeof responseData === 'string' ? responseData : JSON.stringify(responseData || '');
        const isCloudflareBlock = responseText.includes('cloudflare') ||
                                  responseText.includes('cf-') ||
                                  responseText.includes('challenge') ||
                                  status === 403;

        // Provide more specific guidance based on the error
        let guidance = 'Tokens may be expired or invalid.';
        if (isCloudflareBlock) {
          guidance = 'Cloudflare protection blocked the request. The cf_clearance cookie has likely expired (they expire quickly!).';
        } else if (detail.toLowerCase().includes('token')) {
          guidance = 'The token format appears to be incorrect.';
        } else if (detail.toLowerCase().includes('session')) {
          guidance = 'Your session has expired.';
        } else if (detail.toLowerCase().includes('cookie')) {
          guidance = 'The cookie is invalid or expired.';
        }

        return {
          valid: false,
          error: `Authentication rejected (${status}): ${guidance} Please log in to Rami Levy again and copy FRESH tokens from DevTools (especially the Cookie header with cf_clearance).`
        };
      }
      if (status === 429) {
        return { valid: false, error: 'Rate limited by Rami Levy. Try again in a few minutes.' };
      }

      // Network errors
      if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
        return { valid: false, error: 'Cannot reach Rami Levy servers. Check your internet connection.' };
      }
      if (error.code === 'ETIMEDOUT') {
        return { valid: false, error: 'Connection to Rami Levy timed out. Try again.' };
      }

      return { valid: false, error: `Validation failed (${status || error.code || 'unknown'}): ${message}` };
    }
  }

  /**
   * Get stored tokens for a user (decrypts from database)
   * @param userId - User identifier
   * @returns Decrypted tokens or null
   */
  private async getStoredTokens(userId: string): Promise<RamiLevyTokens | null> {
    const prisma = getPrisma();
    if (!prisma) return null;

    try {
      // Using type assertion with proper fallback
      const tokenRecord = await this.findToken(prisma, userId);
      if (!tokenRecord) return null;

      // Decrypt tokens if they're encrypted
      return {
        apiKey: isEncrypted(tokenRecord.apiKey) 
          ? decrypt(tokenRecord.apiKey) 
          : tokenRecord.apiKey,
        ecomToken: tokenRecord.ecomToken && isEncrypted(tokenRecord.ecomToken)
          ? decrypt(tokenRecord.ecomToken)
          : tokenRecord.ecomToken,
        cookie: isEncrypted(tokenRecord.cookie)
          ? decrypt(tokenRecord.cookie)
          : tokenRecord.cookie
      };
    } catch (error: any) {
      logger.warn('Failed to get stored tokens', { userId, error: error.message });
      return null;
    }
  }

  /**
   * Find token record from database with proper typing
   * @param prisma - Prisma client instance
   * @param userId - User identifier
   * @returns Token record or null
   */
  private async findToken(
    prisma: ReturnType<typeof getPrisma>,
    userId: string
  ): Promise<{ apiKey: string; ecomToken?: string; cookie: string } | null> {
    if (!prisma) return null;
    
    try {
      // Try to access the model - will throw if not available
      const record = await (prisma as any).ramiLevyToken?.findUnique({
        where: { userId },
        select: { apiKey: true, ecomToken: true, cookie: true }
      });
      return record || null;
    } catch {
      // Model doesn't exist yet - migration not run
      return null;
    }
  }

  /**
   * Validate tokens before storage
   * @param tokens - Tokens to validate
   * @returns Validation result with warnings
   */
  validateTokensForStorage(tokens: RamiLevyTokens): {
    isValid: boolean;
    warnings: string[];
    errors: string[];
    recommendations: string[];
  } {
    const warnings: string[] = [];
    const errors: string[] = [];
    const recommendations: string[] = [];

    // Validate API Key
    const apiKeyValidation = validateJwtStructure(tokens.apiKey);
    if (!apiKeyValidation.isValid) {
      if (apiKeyValidation.parts < 3) {
        warnings.push(`API Key appears truncated (${apiKeyValidation.parts} parts, expected 3). The full Bearer token from Authorization header is required.`);
        recommendations.push('When copying from DevTools, ensure you copy the COMPLETE Authorization header value.');
      }
      if (apiKeyValidation.isExpired) {
        errors.push(`API Key expired on ${apiKeyValidation.expiresAt?.toISOString()}`);
      }
    }

    // Validate EcomToken (optional but recommended)
    if (tokens.ecomToken) {
      const ecomValidation = validateJwtStructure(tokens.ecomToken);
      if (!ecomValidation.isValid) {
        if (ecomValidation.parts < 3) {
          warnings.push(`EcomToken appears truncated (${ecomValidation.parts} parts, expected 3).`);
        }
        if (ecomValidation.isExpired) {
          errors.push(`EcomToken expired on ${ecomValidation.expiresAt?.toISOString()}`);
        }
      }
    } else {
      recommendations.push('Consider providing ecomtoken header for cart operations.');
    }

    // Validate Cookie - but cookies are optional if ecomToken is valid
    // (Cloudflare's cf_clearance is IP-bound and fails from production servers)
    const cookieValidation = validateCookies(tokens.cookie);
    const ecomValidation = tokens.ecomToken ? validateJwtStructure(tokens.ecomToken) : null;
    const hasValidEcomForCookieSkip = ecomValidation?.isValid === true;
    
    if (!cookieValidation.valid && !hasValidEcomForCookieSkip) {
      warnings.push(`Missing critical cookies: ${cookieValidation.missing.join(', ')}`);
      recommendations.push('Copy the FULL Cookie header from DevTools to include all required cookies.');
    } else if (!cookieValidation.valid && hasValidEcomForCookieSkip) {
      // Just an info, not a warning - cookies optional with valid ecomToken
      recommendations.push('Cookies are missing but ecomToken is valid - API calls will work without cookies.');
    }

    // Determine overall validity
    // Allow storage even with warnings, but block if there are hard errors (like expiration)
    const ecomIsValid = tokens.ecomToken ? validateJwtStructure(tokens.ecomToken).isValid : false;
    const hasValidToken = apiKeyValidation.isValid || ecomIsValid;
    const isValid = errors.length === 0 && hasValidToken;

    return { isValid, warnings, errors, recommendations };
  }

  /**
   * Store or update tokens for a user (encrypts before storage)
   * @param userId - User identifier
   * @param tokens - Plain text tokens to store
   * @param skipValidation - Skip validation (use with caution)
   * @returns Object with success status and any validation messages
   */
  async storeTokens(userId: string, tokens: RamiLevyTokens, skipValidation = false): Promise<{
    success: boolean;
    warnings?: string[];
    errors?: string[];
    recommendations?: string[];
  }> {
    const prisma = getPrisma();
    if (!prisma) {
      logger.fail('Database not available');
      return { success: false, errors: ['Database not available'] };
    }

    // Validate tokens before storage
    if (!skipValidation) {
      const validation = this.validateTokensForStorage(tokens);
      
      if (validation.warnings.length > 0) {
        logger.warn('Token validation warnings', { warnings: validation.warnings });
      }
      
      if (!validation.isValid) {
        logger.fail('Token validation failed', { errors: validation.errors });
        return { 
          success: false, 
          warnings: validation.warnings,
          errors: validation.errors,
          recommendations: validation.recommendations
        };
      }
    }

    try {
      // Encrypt sensitive tokens before storage
      const encryptedData = {
        apiKey: encrypt(tokens.apiKey),
        ecomToken: tokens.ecomToken ? encrypt(tokens.ecomToken) : null,
        cookie: encrypt(tokens.cookie),
        updatedAt: new Date()
      };

      await (prisma as any).ramiLevyToken?.upsert({
        where: { userId },
        update: encryptedData,
        create: {
          userId,
          ...encryptedData
        }
      });

      // Create session for this user
      const axiosInstance = this.createAxiosInstance(tokens);
      this.sessions.set(userId, {
        axiosInstance,
        tokens,
        cart: null,
        lastUsed: new Date()
      });

      const validation = this.validateTokensForStorage(tokens);
      logger.success('Rami Levy tokens stored (encrypted)', { 
        userId,
        hasWarnings: validation.warnings.length > 0 
      });
      
      return { 
        success: true, 
        warnings: validation.warnings.length > 0 ? validation.warnings : undefined,
        recommendations: validation.recommendations.length > 0 ? validation.recommendations : undefined
      };
    } catch (error: any) {
      logger.fail('Failed to store Rami Levy tokens', { userId, error: error.message });
      return { success: false, errors: [error.message] };
    }
  }

  /**
   * Update last used timestamp
   * @param userId - User identifier
   */
  private async updateLastUsed(userId: string): Promise<void> {
    const prisma = getPrisma();
    if (!prisma) return;

    try {
      await (prisma as any).ramiLevyToken?.update({
        where: { userId },
        data: { lastUsedAt: new Date() }
      });
    } catch {
      // Ignore errors - non-critical
    }
  }

  /**
   * Delete stored tokens for a user
   * @param userId - User identifier
   * @returns True if deleted successfully
   */
  async deleteTokens(userId: string): Promise<boolean> {
    const prisma = getPrisma();
    if (!prisma) return false;

    try {
      await (prisma as any).ramiLevyToken?.delete({
        where: { userId }
      });

      // Clean up session
      this.sessions.delete(userId);

      logger.success('Rami Levy tokens deleted', { userId });
      return true;
    } catch (error: any) {
      logger.fail('Failed to delete Rami Levy tokens', { error: error.message });
      return false;
    }
  }

  // ===========================================================================
  // PRODUCT SEARCH
  // ===========================================================================

  /**
   * Search for products in Rami Levy catalog
   * @param userId - User identifier
   * @param query - Search query
   * @param options - Search options
   * @returns Search results
   */
  async searchProducts(
    userId: string,
    query: string,
    options?: { storeId?: string; limit?: number }
  ): Promise<RamiLevySearchResult> {
    const session = this.ensureSession(userId);
    const storeId = options?.storeId || DEFAULT_STORE_ID;
    const cacheKey = `rami-levy:search:${query}:${storeId}`;
    
    // Check cache
    const cached = await cacheService.get<RamiLevySearchResult>(cacheKey);
    if (cached) {
      logger.cache('Rami Levy search cache hit', { query });
      return cached;
    }

    return this.withRetry(async () => {
      logger.search('Searching Rami Levy products', { query, storeId });

      const response = await session.axiosInstance.post('/catalog', {
        q: query,
        aggs: 1,
        store: storeId
      });

      const data = response.data;
      
      if (data.status !== 200) {
        throw new Error(`API returned status ${data.status}`);
      }

      const products: RamiLevyProduct[] = (data.data || []).map((item: any) => 
        this.mapApiProductToProduct(item)
      );

      const result: RamiLevySearchResult = {
        products: products.slice(0, options?.limit || 20),
        total: data.total || products.length,
        query
      };

      // Cache for configured duration
      await cacheService.set(cacheKey, result, { 
        ttl: configService.get('ramiLevy.cache.searchTtlSeconds', 1800) 
      });

      logger.found('Rami Levy products found', { query, count: products.length });
      return result;
    }, 'Product search');
  }

  /**
   * Map API response to our product type
   */
  private mapApiProductToProduct(item: any): RamiLevyProduct {
    const price = item.price?.price || 0;
    const gs = item.gs || {};
    
    return {
      id: item.id,
      barcode: String(item.barcode || ''),
      name: item.name || gs.name || 'Unknown',
      price,
      imageUrl: item.images?.small 
        ? `${RAMI_LEVY_BASE_URL}${item.images.small}` 
        : '',
      brand: gs.BrandName,
      department: item.department?.name,
      group: item.group?.name,
      subGroup: item.subGroup?.name,
      unit: item.prop?.unit,
      isAvailable: item.prop?.status === 2,
      nutritionalInfo: this.extractNutritionalInfo(gs)
    };
  }

  /**
   * Extract nutritional information from GS1 data
   */
  private extractNutritionalInfo(gs: any): RamiLevyProduct['nutritionalInfo'] {
    if (!gs.Nutritional_Values) return undefined;

    const getValue = (code: string): number | undefined => {
      const item = gs.Nutritional_Values?.find((n: any) => n.code === code);
      const field = item?.fields?.[0];
      if (!field?.value) return undefined;
      const parsed = parseFloat(field.value);
      return isNaN(parsed) ? undefined : parsed;
    };

    return {
      calories: getValue('79001'),
      protein: getValue('79002'),
      carbs: getValue('79003'),
      fat: getValue('79007'),
      sodium: getValue('79011')
    };
  }

  // ===========================================================================
  // CART OPERATIONS
  // ===========================================================================

  /**
   * Add items to cart
   * @param userId - User identifier
   * @param items - Items to add
   * @param options - Cart options
   * @returns Updated cart
   */
  async addToCart(
    userId: string,
    items: Array<{ productId: number; quantity: number }>,
    options?: { storeId?: string }
  ): Promise<RamiLevyCart> {
    const session = this.ensureSession(userId);
    const storeId = options?.storeId || DEFAULT_STORE_ID;
    
    const itemsPayload: Record<string, string> = {};
    
    // Include existing cart items
    if (session.cart) {
      for (const cartItem of session.cart.items) {
        if (!cartItem.name.includes('משלוח')) {
          itemsPayload[String(cartItem.id)] = String(cartItem.quantity);
        }
      }
    }

    // Add new items
    for (const item of items) {
      const existingQty = parseFloat(itemsPayload[String(item.productId)] || '0');
      itemsPayload[String(item.productId)] = String(existingQty + item.quantity);
    }

    return this.updateCart(userId, itemsPayload, storeId);
  }

  /**
   * Remove items from cart
   * @param userId - User identifier
   * @param productIds - Product IDs to remove
   * @param options - Cart options
   * @returns Updated cart
   */
  async removeFromCart(
    userId: string,
    productIds: number[],
    options?: { storeId?: string }
  ): Promise<RamiLevyCart> {
    const session = this.ensureSession(userId);
    const storeId = options?.storeId || DEFAULT_STORE_ID;
    
    const itemsPayload: Record<string, string> = {};
    
    if (session.cart) {
      for (const cartItem of session.cart.items) {
        if (!productIds.includes(cartItem.id) && !cartItem.name.includes('משלוח')) {
          itemsPayload[String(cartItem.id)] = String(cartItem.quantity);
        }
      }
    }

    return this.updateCart(userId, itemsPayload, storeId);
  }

  /**
   * Update item quantity in cart
   * @param userId - User identifier
   * @param productId - Product ID
   * @param newQuantity - New quantity (0 to remove)
   * @param options - Cart options
   * @returns Updated cart
   */
  async updateCartQuantity(
    userId: string,
    productId: number,
    newQuantity: number,
    options?: { storeId?: string }
  ): Promise<RamiLevyCart> {
    const session = this.ensureSession(userId);
    const storeId = options?.storeId || DEFAULT_STORE_ID;
    
    const itemsPayload: Record<string, string> = {};
    
    if (session.cart) {
      for (const cartItem of session.cart.items) {
        if (!cartItem.name.includes('משלוח')) {
          if (cartItem.id === productId) {
            if (newQuantity > 0) {
              itemsPayload[String(productId)] = String(newQuantity);
            }
          } else {
            itemsPayload[String(cartItem.id)] = String(cartItem.quantity);
          }
        }
      }
    }

    if (newQuantity > 0 && !itemsPayload[String(productId)]) {
      itemsPayload[String(productId)] = String(newQuantity);
    }

    return this.updateCart(userId, itemsPayload, storeId);
  }

  /**
   * Clear all items from cart
   * @param userId - User identifier
   * @param options - Cart options
   * @returns Empty cart
   */
  async clearCart(userId: string, options?: { storeId?: string }): Promise<RamiLevyCart> {
    const storeId = options?.storeId || DEFAULT_STORE_ID;
    return this.updateCart(userId, {}, storeId);
  }

  /**
   * Update cart with new items payload
   */
  private async updateCart(
    userId: string,
    items: Record<string, string>,
    storeId: string
  ): Promise<RamiLevyCart> {
    const session = this.ensureSession(userId);

    return this.withRetry(async () => {
      const supplyDate = new Date();
      supplyDate.setDate(supplyDate.getDate() + 1);
      supplyDate.setHours(0, 0, 0, 0);

      const payload = {
        store: storeId,
        isClub: 0,
        supplyAt: supplyDate.toISOString(),
        items,
        meta: null
      };

      logger.processing('Updating Rami Levy cart', { itemCount: Object.keys(items).length });

      const response = await session.axiosInstance.post('/v2/cart', payload);
      const data = response.data;

      if (data.status !== 200) {
        throw new Error(`Cart API returned status ${data.status}`);
      }

      const cart = this.mapApiCartToCart(data);
      
      // Update session cart
      session.cart = cart;
      session.lastUsed = new Date();

      logger.success('Rami Levy cart updated', { 
        itemCount: cart.itemCount, 
        total: cart.totalPrice 
      });

      return cart;
    }, 'Cart update');
  }

  /**
   * Map API cart response to our cart type
   */
  private mapApiCartToCart(data: any): RamiLevyCart {
    const items: RamiLevyCartItem[] = [];
    let deliveryFee = 0;

    for (const item of data.items || []) {
      if (item.is_delivery) {
        deliveryFee = item.price || 0;
        continue;
      }

      items.push({
        id: item.id,
        name: item.name,
        quantity: item.quantity,
        price: item.price,
        totalPrice: item.FormatedTotalPrice || (item.price * item.quantity),
        savings: item.FormatedSavePrice || 0,
        imageUrl: item.images?.small 
          ? `${RAMI_LEVY_BASE_URL}${item.images.small}` 
          : undefined
      });
    }

    return {
      items,
      totalPrice: data.price || 0,
      totalSavings: data.discount || 0,
      itemCount: data.quantity || items.length,
      deliveryFee
    };
  }

  /**
   * Get current cart for a user
   * @param userId - User identifier
   * @returns Current cart or null
   */
  getCart(userId: string): RamiLevyCart | null {
    const session = this.getSession(userId);
    return session?.cart || null;
  }

  // ===========================================================================
  // CHECKOUT & ORDER
  // ===========================================================================

  /**
   * Get checkout URL
   * @returns Rami Levy checkout URL
   */
  getCheckoutUrl(): string {
    return CHECKOUT_URL;
  }

  /**
   * Create order from ingredients - main integration flow
   * Searches for each ingredient and adds best match to cart
   * 
   * @param userId - User identifier
   * @param ingredients - List of ingredients to order
   * @param options - Order options
   * @returns Order result with cart and matched products
   */
  async createOrderFromIngredients(
    userId: string,
    ingredients: Array<{ name: string; quantity?: number }>,
    options?: { storeId?: string; autoSelectFirst?: boolean }
  ): Promise<{
    cart: RamiLevyCart;
    checkoutUrl: string;
    matchedProducts: Array<{ ingredient: string; product: RamiLevyProduct | null }>;
    unmatchedIngredients: string[];
  }> {
    this.ensureSession(userId);

    const storeId = options?.storeId || DEFAULT_STORE_ID;
    const autoSelect = options?.autoSelectFirst ?? true;

    logger.start('Creating Rami Levy order from ingredients', { 
      ingredientCount: ingredients.length 
    });

    const matchedProducts: Array<{ ingredient: string; product: RamiLevyProduct | null }> = [];
    const unmatchedIngredients: string[] = [];
    const itemsToAdd: Array<{ productId: number; quantity: number }> = [];

    // Search for each ingredient
    for (const ingredient of ingredients) {
      try {
        const searchResult = await this.searchProducts(userId, ingredient.name, { 
          storeId, 
          limit: 5 
        });

        if (searchResult.products.length > 0 && autoSelect) {
          const product = searchResult.products[0];
          matchedProducts.push({ ingredient: ingredient.name, product });
          itemsToAdd.push({
            productId: product.id,
            quantity: ingredient.quantity || 1
          });
        } else if (searchResult.products.length > 0) {
          matchedProducts.push({ ingredient: ingredient.name, product: searchResult.products[0] });
        } else {
          unmatchedIngredients.push(ingredient.name);
          matchedProducts.push({ ingredient: ingredient.name, product: null });
        }
      } catch {
        unmatchedIngredients.push(ingredient.name);
        matchedProducts.push({ ingredient: ingredient.name, product: null });
      }
    }

    // Add matched products to cart
    let cart: RamiLevyCart;
    if (itemsToAdd.length > 0) {
      cart = await this.addToCart(userId, itemsToAdd, { storeId });
    } else {
      cart = this.getCart(userId) || {
        items: [],
        totalPrice: 0,
        totalSavings: 0,
        itemCount: 0
      };
    }

    logger.complete('Rami Levy order created', {
      matched: matchedProducts.filter(m => m.product).length,
      unmatched: unmatchedIngredients.length,
      cartTotal: cart.totalPrice
    });

    return {
      cart,
      checkoutUrl: CHECKOUT_URL,
      matchedProducts,
      unmatchedIngredients
    };
  }

  // ===========================================================================
  // TOKEN STATUS
  // ===========================================================================

  /**
   * Get token status for a user
   * @param userId - User identifier
   * @returns Token validation status
   */
  async getTokenStatus(userId: string): Promise<TokenStatus> {
    const prisma = getPrisma();
    if (!prisma) {
      return { isValid: false, userId, errorMessage: 'Database not available' };
    }

    try {
      const tokenRecord = await (prisma as any).ramiLevyToken?.findUnique({
        where: { userId },
        select: { lastUsedAt: true, updatedAt: true }
      });

      if (!tokenRecord) {
        return { 
          isValid: false, 
          userId, 
          errorMessage: 'No tokens configured' 
        };
      }

      // Initialize to check if tokens are still valid
      return this.initialize(userId);
    } catch {
      return { 
        isValid: false, 
        userId, 
        errorMessage: 'Token table not configured. Run database migration.' 
      };
    }
  }

  /**
   * Get available store IDs
   * @returns List of available stores
   */
  getAvailableStores(): Array<{ id: string; name: string }> {
    return [
      { id: '331', name: 'Rami Levy - Default' },
      { id: '179', name: 'Rami Levy - Tel Aviv' },
      { id: '279', name: 'Rami Levy - Jerusalem' },
      { id: '290', name: 'Rami Levy - Haifa' },
      { id: '306', name: 'Rami Levy - Beer Sheva' }
    ];
  }

  /**
   * Clean up expired sessions (call periodically)
   * @param maxAgeMs - Maximum session age in milliseconds
   */
  cleanupSessions(maxAgeMs: number = 3600000): void {
    const now = new Date();
    for (const [userId, session] of this.sessions.entries()) {
      if (now.getTime() - session.lastUsed.getTime() > maxAgeMs) {
        this.sessions.delete(userId);
        logger.info('Cleaned up expired Rami Levy session', { userId });
      }
    }
  }

  /**
   * Get circuit breaker status (for health checks)
   * @returns Circuit breaker state information
   */
  getCircuitBreakerStatus(): {
    isOpen: boolean;
    failures: number;
    lastFailure: Date | null;
    threshold: number;
    resetMs: number;
  } {
    return {
      isOpen: circuitBreaker.isOpen,
      failures: circuitBreaker.failures,
      lastFailure: circuitBreaker.lastFailure,
      threshold: CIRCUIT_BREAKER_THRESHOLD,
      resetMs: CIRCUIT_BREAKER_RESET_MS
    };
  }

  /**
   * Reset circuit breaker (for admin/testing purposes)
   */
  resetCircuitBreaker(): void {
    circuitBreaker.failures = 0;
    circuitBreaker.lastFailure = null;
    circuitBreaker.isOpen = false;
    logger.info('Rami Levy circuit breaker manually reset');
  }
}

// Export singleton
export const ramiLevyService = new RamiLevyService();
export default ramiLevyService;
