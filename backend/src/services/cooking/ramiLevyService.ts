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
 * Parse JWT token to extract expiration time
 * @param token - JWT token string
 * @returns Expiration date or null
 */
const parseJwtExpiration = (token: string): Date | null => {
  if (!token) return null;
  
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    
    // Decode the payload (second part)
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
    
    if (payload.exp) {
      return new Date(payload.exp * 1000);
    }
    return null;
  } catch {
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
6. Extract: Authorization (Bearer token), EcomToken, and Cookie headers`;

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
    // Clean tokens by removing trailing invalid characters (browser copy/paste issues)
    const cleanToken = (token: string): string => {
      return token ? token.replace(/[^A-Za-z0-9\-_\.]+$/, '') : token;
    };

    const cleanedApiKey = cleanToken(tokens.apiKey);
    const cleanedEcomToken = tokens.ecomToken ? cleanToken(tokens.ecomToken) : undefined;

    // Determine best token for Authorization header
    // If apiKey is truncated (2 parts), use ecomToken if available (it's a valid 3-part JWT)
    const apiKeyParts = cleanedApiKey.split('.').length;
    const useEcomAsAuth = apiKeyParts < 3 && cleanedEcomToken && cleanedEcomToken.split('.').length === 3;
    const authToken = useEcomAsAuth ? cleanedEcomToken : cleanedApiKey;

    if (useEcomAsAuth) {
      logger.info('Using EcomToken as Authorization (apiKey appears truncated)', {
        apiKeyParts,
        ecomTokenValid: true
      });
    }

    const headers: Record<string, string> = {
      'Accept': 'application/json, text/plain, */*',
      'Accept-Language': 'en-US,en;q=0.9,he;q=0.8',
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json;charset=UTF-8',
      'Cookie': tokens.cookie,
      'locale': 'he',
      'Origin': RAMI_LEVY_BASE_URL,
      'Referer': `${RAMI_LEVY_BASE_URL}/he`,
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
    };

    // ecomToken is also sent as separate header for cart operations
    if (cleanedEcomToken) {
      headers['ecomtoken'] = cleanedEcomToken;
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
      const tokens = await this.getStoredTokens(userId);
      
      if (!tokens) {
        return {
          isValid: false,
          userId,
          errorMessage: 'No tokens stored. Please configure Rami Levy authentication.',
          refreshInstructions: REFRESH_INSTRUCTIONS
        };
      }

      // Parse expiration from EcomToken (it's a valid JWT with exp claim)
      const expiresAt = tokens.ecomToken ? parseJwtExpiration(tokens.ecomToken) : null;
      const isExpired = expiresAt ? expiresAt.getTime() < Date.now() : false;
      const isExpiringSoon = expiresAt 
        ? (expiresAt.getTime() - Date.now()) < 24 * 60 * 60 * 1000 
        : false;

      // If token is already expired based on JWT, don't bother validating
      if (isExpired) {
        return {
          isValid: false,
          userId,
          expiresAt,
          expiresIn: 'expired',
          errorMessage: 'Tokens have expired. Please refresh your authentication.',
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
      const isValid = await this.validateTokens(userId);
      
      if (isValid) {
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
        errorMessage: 'Tokens expired or invalid. Please refresh your authentication.',
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
   * @param userId - User identifier
   * @returns True if tokens are valid
   */
  private async validateTokens(userId: string): Promise<boolean> {
    const session = this.getSession(userId);
    if (!session) return false;

    try {
      const response = await session.axiosInstance.post('/catalog', {
        q: 'test',
        aggs: 0,
        store: DEFAULT_STORE_ID
      });
      return response.status === 200;
    } catch {
      return false;
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
   * Store or update tokens for a user (encrypts before storage)
   * @param userId - User identifier
   * @param tokens - Plain text tokens to store
   * @returns True if stored successfully
   */
  async storeTokens(userId: string, tokens: RamiLevyTokens): Promise<boolean> {
    const prisma = getPrisma();
    if (!prisma) {
      logger.fail('Database not available');
      return false;
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

      logger.success('Rami Levy tokens stored (encrypted)', { userId });
      return true;
    } catch (error: any) {
      logger.fail('Failed to store Rami Levy tokens', { userId, error: error.message });
      return false;
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
