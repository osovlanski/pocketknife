/**
 * Encryption Utility
 * 
 * Provides symmetric encryption/decryption for sensitive data storage.
 * Uses AES-256-GCM for authenticated encryption.
 * 
 * @module utils/encryption
 */

import crypto from 'crypto';
import { configService } from '../services/core/configService';
import logger from './logger';

// Constants
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const SALT_LENGTH = 32;

/**
 * Get or generate encryption key from environment/config
 * Uses ENCRYPTION_KEY env var or generates a deterministic key from a secret
 *
 * SECURITY: In production, ENCRYPTION_KEY must be explicitly set.
 * The fallback is only allowed in development/test environments.
 */
const getEncryptionKey = (): Buffer => {
  const envKey = process.env.ENCRYPTION_KEY;
  const isProduction = process.env.NODE_ENV === 'production';

  if (envKey && envKey.length >= 32) {
    // Use provided key (must be at least 32 chars for AES-256)
    return Buffer.from(envKey.slice(0, 32), 'utf-8');
  }

  // In production, require ENCRYPTION_KEY
  if (isProduction) {
    logger.fail('ENCRYPTION_KEY must be set in production environment');
    throw new Error(
      'ENCRYPTION_KEY environment variable is required in production. ' +
      'Generate a secure 32+ character key and set it in your environment.'
    );
  }

  // Fallback: derive key from DATABASE_URL (development/test only)
  // WARNING: This is a fallback - production MUST use ENCRYPTION_KEY
  logger.warn('Using fallback encryption key derivation (development mode only)');
  const secret = process.env.DATABASE_URL || 'pocketknife-default-encryption-key';
  return crypto.scryptSync(secret, 'pocketknife-salt', 32);
};

/**
 * Encrypt a string value
 * 
 * @param plaintext - The string to encrypt
 * @returns Base64-encoded encrypted string (iv:authTag:ciphertext)
 * 
 * @example
 * const encrypted = encrypt('my secret token');
 * // Returns something like: "a1b2c3...:d4e5f6...:g7h8i9..."
 */
export const encrypt = (plaintext: string): string => {
  try {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    
    let encrypted = cipher.update(plaintext, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    
    const authTag = cipher.getAuthTag();
    
    // Format: iv:authTag:ciphertext (all base64)
    return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted}`;
  } catch (error: any) {
    logger.fail('Encryption failed', { error: error.message });
    throw new Error('Failed to encrypt data');
  }
};

/**
 * Decrypt a string value
 * 
 * @param encryptedData - The encrypted string (iv:authTag:ciphertext format)
 * @returns The original plaintext string
 * 
 * @example
 * const plaintext = decrypt(encryptedData);
 */
export const decrypt = (encryptedData: string): string => {
  try {
    const parts = encryptedData.split(':');
    
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted data format');
    }
    
    const [ivBase64, authTagBase64, ciphertext] = parts;
    
    const key = getEncryptionKey();
    const iv = Buffer.from(ivBase64, 'base64');
    const authTag = Buffer.from(authTagBase64, 'base64');
    
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(ciphertext, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error: any) {
    logger.fail('Decryption failed', { error: error.message });
    throw new Error('Failed to decrypt data');
  }
};

/**
 * Check if a string appears to be encrypted (in our format)
 * 
 * @param value - The string to check
 * @returns True if the string appears to be encrypted
 */
export const isEncrypted = (value: string): boolean => {
  if (!value) return false;
  
  const parts = value.split(':');
  if (parts.length !== 3) return false;
  
  // Check if all parts are valid base64
  try {
    for (const part of parts) {
      Buffer.from(part, 'base64');
    }
    return true;
  } catch {
    return false;
  }
};

/**
 * Hash a value (one-way, for comparison)
 * 
 * @param value - The string to hash
 * @returns SHA-256 hash as hex string
 */
export const hash = (value: string): string => {
  return crypto.createHash('sha256').update(value).digest('hex');
};

export default {
  encrypt,
  decrypt,
  isEncrypted,
  hash
};
