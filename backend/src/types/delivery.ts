/**
 * Delivery Types and Interfaces
 * 
 * Defines the contract for delivery providers in the Pocketknife platform.
 * Supports multiple delivery providers (Wolt, Instacart, etc.) through a generic interface.
 */

// =============================================================================
// DELIVERY ITEM TYPES
// =============================================================================

/**
 * A product that can be ordered from a delivery provider
 */
export interface DeliveryProduct {
  id: string;
  name: string;
  description?: string;
  price: number;
  currency: string;
  unit: string;
  quantity: number;
  imageUrl?: string;
  category?: string;
  inStock: boolean;
  providerId: string;
}

/**
 * An item in a delivery order with quantity and matched ingredient info
 */
export interface DeliveryOrderItem {
  product: DeliveryProduct;
  quantity: number;
  originalIngredient: string;
  matchConfidence: number; // 0-100
  notes?: string;
}

// =============================================================================
// ORDER TYPES
// =============================================================================

/**
 * Preview of an order before execution
 */
export interface OrderPreview {
  id: string;
  providerId: string;
  providerName: string;
  items: DeliveryOrderItem[];
  subtotal: number;
  deliveryFee: number;
  serviceFee: number;
  total: number;
  currency: string;
  estimatedDeliveryMinutes?: number;
  createdAt: Date;
  expiresAt: Date;
  recipeId?: string;
  recipeName?: string;
}

/**
 * Deep link to a delivery provider with pre-filled cart
 */
export interface OrderLink {
  orderId: string;
  providerId: string;
  providerName: string;
  url: string;
  deepLink?: string;
  expiresAt: Date;
  itemCount: number;
  total: number;
  currency: string;
}

// =============================================================================
// PROVIDER TYPES
// =============================================================================

/**
 * Information about a delivery provider
 */
export interface DeliveryProviderInfo {
  id: string;
  name: string;
  displayName: string;
  logoUrl?: string;
  baseUrl: string;
  supportedCountries: string[];
  supportedCities?: string[];
  features: DeliveryProviderFeature[];
  isAvailable: boolean;
  averageDeliveryMinutes?: number;
  minimumOrderAmount?: number;
  currency: string;
}

export type DeliveryProviderFeature = 
  | 'grocery'
  | 'restaurant'
  | 'pharmacy'
  | 'alcohol'
  | 'scheduled_delivery'
  | 'express_delivery'
  | 'contactless';

/**
 * Interface that all delivery providers must implement
 */
export interface IDeliveryProvider {
  readonly info: DeliveryProviderInfo;
  
  /**
   * Check if the provider is available in the given location
   */
  isAvailable(location?: DeliveryLocation): Promise<boolean>;
  
  /**
   * Search for products matching the given ingredients
   */
  searchProducts(
    ingredients: string[],
    options?: ProductSearchOptions
  ): Promise<DeliveryProduct[]>;
  
  /**
   * Create an order preview without executing
   */
  createOrderPreview(
    items: DeliveryOrderItem[],
    location?: DeliveryLocation
  ): Promise<OrderPreview>;
  
  /**
   * Generate a deep link/URL to the provider with pre-filled cart
   */
  generateOrderLink(orderPreview: OrderPreview): Promise<OrderLink>;
}

// =============================================================================
// SEARCH & LOCATION TYPES
// =============================================================================

/**
 * Options for searching products
 */
export interface ProductSearchOptions {
  maxResults?: number;
  includeOutOfStock?: boolean;
  category?: string;
  sortBy?: 'price' | 'relevance' | 'popularity';
  location?: DeliveryLocation;
}

/**
 * Delivery location information
 */
export interface DeliveryLocation {
  address?: string;
  city?: string;
  country?: string;
  postalCode?: string;
  latitude?: number;
  longitude?: number;
}

// =============================================================================
// RECIPE TO DELIVERY TYPES
// =============================================================================

/**
 * Result of matching recipe ingredients to delivery products
 */
export interface IngredientMatchResult {
  ingredient: string;
  originalAmount: string;
  matchedProducts: DeliveryProduct[];
  bestMatch?: DeliveryProduct;
  matchConfidence: number;
  inInventory: boolean;
  inventoryAmount?: number;
  needToOrder: boolean;
}

/**
 * Full recipe order request
 */
export interface RecipeOrderRequest {
  recipeId: string | number;
  recipeName: string;
  ingredients: RecipeIngredient[];
  servings?: number;
  userId: string;
  providerId?: string;
  checkInventory?: boolean;
  location?: DeliveryLocation;
}

/**
 * Recipe ingredient for ordering
 */
export interface RecipeIngredient {
  name: string;
  amount: number;
  unit: string;
  original: string;
  aisle?: string;
}

/**
 * Full recipe order result including inventory check
 */
export interface RecipeOrderResult {
  recipeId: string | number;
  recipeName: string;
  ingredientMatches: IngredientMatchResult[];
  itemsInInventory: IngredientMatchResult[];
  itemsToOrder: IngredientMatchResult[];
  orderPreview?: OrderPreview;
  orderLink?: OrderLink;
  savings?: number;
}

// =============================================================================
// WOLT DRIVE API TYPES
// =============================================================================

/**
 * Wolt Drive shipment promise request
 */
export interface WoltShipmentPromiseRequest {
  pickup: {
    venue_id: string;
    options?: {
      min_preparation_time_minutes?: number;
    };
  };
  dropoff: {
    location: {
      formatted_address: string;
      coordinates: {
        lat: number;
        lon: number;
      };
    };
  };
}

/**
 * Wolt Drive shipment promise response
 */
export interface WoltShipmentPromiseResponse {
  id: string;
  price: {
    amount: number;
    currency: string;
  };
  time_estimate_minutes: number;
  valid_until: string;
}

/**
 * Wolt Drive delivery request
 */
export interface WoltDeliveryRequest {
  shipment_promise_id: string;
  pickup: {
    venue_id: string;
    options?: {
      min_preparation_time_minutes?: number;
    };
    contact?: {
      name?: string;
      phone?: string;
    };
  };
  dropoff: {
    location: {
      formatted_address: string;
      coordinates: {
        lat: number;
        lon: number;
      };
    };
    contact: {
      name: string;
      phone: string;
    };
    comment?: string;
  };
  parcels: WoltParcel[];
  customer_support?: {
    email?: string;
    phone?: string;
  };
  merchant_order_reference_id?: string;
}

/**
 * Wolt parcel in delivery
 */
export interface WoltParcel {
  description: string;
  type: 'bag' | 'box' | 'envelope' | 'other';
  dimensions?: {
    width_cm?: number;
    height_cm?: number;
    depth_cm?: number;
  };
  weight_kg?: number;
}

/**
 * Wolt Drive delivery response
 */
export interface WoltDeliveryResponse {
  id: string;
  wolt_order_reference_id: string;
  tracking: {
    url: string;
  };
  status: WoltDeliveryStatus;
  price: {
    amount: number;
    currency: string;
  };
  pickup: {
    eta?: string;
    venue_id: string;
  };
  dropoff: {
    eta?: string;
    location: {
      formatted_address: string;
    };
  };
  created_at: string;
}

export type WoltDeliveryStatus = 
  | 'pending'
  | 'confirmed'
  | 'courier_assigned'
  | 'courier_at_pickup'
  | 'picked_up'
  | 'courier_at_dropoff'
  | 'delivered'
  | 'cancelled';

/**
 * User delivery address for orders
 */
export interface UserDeliveryAddress {
  formattedAddress: string;
  coordinates: {
    lat: number;
    lon: number;
  };
  contactName?: string;
  contactPhone?: string;
  deliveryInstructions?: string;
}
