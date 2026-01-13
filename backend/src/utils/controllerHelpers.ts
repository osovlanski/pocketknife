/**
 * Controller Helpers
 * 
 * Shared utility functions for controllers to avoid code duplication.
 */

import { Request } from 'express';
import { databaseService } from '../services/core/databaseService';

/**
 * Extract user ID from request headers (X-User-Email)
 * 
 * @param req - Express request object
 * @returns User ID or undefined if not authenticated
 */
export const getUserIdFromRequest = async (req: Request): Promise<string | undefined> => {
  const email = req.headers['x-user-email'] as string;
  if (!email) return undefined;
  
  const user = await databaseService.getOrCreateUser(email);
  return user?.id;
};

/**
 * Get effective user ID (from request or fallback to default user)
 * Used for controllers that support unauthenticated access with a default user
 * 
 * @param requestUserId - User ID from request
 * @returns User ID or null if no default user exists
 */
export const getEffectiveUserId = async (requestUserId?: string): Promise<string | null> => {
  if (requestUserId && requestUserId !== 'default-user') {
    return requestUserId;
  }
  const defaultUser = await databaseService.getDefaultUser();
  return defaultUser?.id || null;
};

