/// <reference types="vite/client" />
/**
 * Frontend Configuration
 * 
 * Centralizes all configuration values.
 * Uses Vite environment variables with fallbacks for development.
 */

/**
 * API Base URL
 * Set VITE_API_URL in .env for production
 */
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Debug logging for production troubleshooting
if (typeof window !== 'undefined') {
  console.log('[Config] API_BASE_URL:', API_BASE_URL);
  console.log('[Config] VITE_API_URL env:', import.meta.env.VITE_API_URL || 'NOT SET');
  console.log('[Config] Mode:', import.meta.env.MODE);
  
  // Warn if using localhost in production
  if (import.meta.env.PROD && API_BASE_URL.includes('localhost')) {
    console.error('[Config] ⚠️ WARNING: Using localhost API URL in production! Set VITE_API_URL environment variable on Vercel.');
  }
}

/**
 * WebSocket URL (derived from API URL)
 */
export const WS_URL = import.meta.env.VITE_WS_URL || 
  API_BASE_URL.replace('/api', '').replace('https://', 'wss://').replace('http://', 'ws://');

/**
 * Socket.io connection URL
 */
export const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

/**
 * Configuration defaults
 */
export const config = {
  api: {
    baseUrl: API_BASE_URL,
    timeout: 30000, // 30 seconds
  },
  socket: {
    url: SOCKET_URL,
    reconnectionAttempts: 5,
  },
  cache: {
    ttlMs: 30 * 1000, // 30 seconds
  },
  features: {
    enableDevTools: import.meta.env.DEV,
  }
} as const;

export default config;

