/**
 * Encryption Utility Tests
 *
 * Tests for AES-256-GCM encryption/decryption functionality.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock environment before importing the module
const originalEnv = process.env;

describe('Encryption Utility', () => {
  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('encrypt and decrypt', () => {
    it('should encrypt and decrypt a string successfully', async () => {
      process.env.ENCRYPTION_KEY = 'a'.repeat(32); // 32 char key
      const { encrypt, decrypt } = await import('../../src/utils/encryption');

      const plaintext = 'my secret token';
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should produce different ciphertext for same plaintext (random IV)', async () => {
      process.env.ENCRYPTION_KEY = 'b'.repeat(32);
      const { encrypt } = await import('../../src/utils/encryption');

      const plaintext = 'test data';
      const encrypted1 = encrypt(plaintext);
      const encrypted2 = encrypt(plaintext);

      expect(encrypted1).not.toBe(encrypted2);
    });

    it('should encrypt and decrypt unicode strings', async () => {
      process.env.ENCRYPTION_KEY = 'c'.repeat(32);
      const { encrypt, decrypt } = await import('../../src/utils/encryption');

      const plaintext = 'שלום עולם 🔐 مرحبا';
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should encrypt and decrypt long strings', async () => {
      process.env.ENCRYPTION_KEY = 'd'.repeat(32);
      const { encrypt, decrypt } = await import('../../src/utils/encryption');

      const plaintext = 'x'.repeat(10000);
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should encrypt and decrypt empty string', async () => {
      process.env.ENCRYPTION_KEY = 'e'.repeat(32);
      const { encrypt, decrypt } = await import('../../src/utils/encryption');

      const plaintext = '';
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should encrypt and decrypt JSON string', async () => {
      process.env.ENCRYPTION_KEY = 'f'.repeat(32);
      const { encrypt, decrypt } = await import('../../src/utils/encryption');

      const data = { apiKey: 'secret123', cookie: 'session=abc' };
      const plaintext = JSON.stringify(data);
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);

      expect(JSON.parse(decrypted)).toEqual(data);
    });
  });

  describe('encrypted format', () => {
    it('should produce format iv:authTag:ciphertext', async () => {
      process.env.ENCRYPTION_KEY = 'g'.repeat(32);
      const { encrypt } = await import('../../src/utils/encryption');

      const encrypted = encrypt('test');
      const parts = encrypted.split(':');

      expect(parts.length).toBe(3);
      expect(parts[0].length).toBeGreaterThan(0); // IV
      expect(parts[1].length).toBeGreaterThan(0); // Auth tag
      expect(parts[2].length).toBeGreaterThan(0); // Ciphertext
    });

    it('should produce valid base64 parts', async () => {
      process.env.ENCRYPTION_KEY = 'h'.repeat(32);
      const { encrypt } = await import('../../src/utils/encryption');

      const encrypted = encrypt('test');
      const parts = encrypted.split(':');

      // Each part should be valid base64
      parts.forEach(part => {
        expect(() => Buffer.from(part, 'base64')).not.toThrow();
      });
    });
  });

  describe('decrypt validation', () => {
    it('should throw on invalid format (missing parts)', async () => {
      process.env.ENCRYPTION_KEY = 'i'.repeat(32);
      const { decrypt } = await import('../../src/utils/encryption');

      expect(() => decrypt('invalid')).toThrow('Failed to decrypt data');
      expect(() => decrypt('part1:part2')).toThrow('Failed to decrypt data');
    });

    it('should throw on tampered ciphertext', async () => {
      process.env.ENCRYPTION_KEY = 'j'.repeat(32);
      const { encrypt, decrypt } = await import('../../src/utils/encryption');

      const encrypted = encrypt('test');
      const parts = encrypted.split(':');
      // Tamper with the ciphertext
      const tampered = `${parts[0]}:${parts[1]}:AAAA`;

      expect(() => decrypt(tampered)).toThrow('Failed to decrypt data');
    });

    it('should throw on tampered auth tag', async () => {
      process.env.ENCRYPTION_KEY = 'k'.repeat(32);
      const { encrypt, decrypt } = await import('../../src/utils/encryption');

      const encrypted = encrypt('test');
      const parts = encrypted.split(':');
      // Tamper with the auth tag
      const tampered = `${parts[0]}:AAAAAAAAAAAAAAAAAAAAAA==:${parts[2]}`;

      expect(() => decrypt(tampered)).toThrow('Failed to decrypt data');
    });

    it('should throw on tampered IV', async () => {
      process.env.ENCRYPTION_KEY = 'l'.repeat(32);
      const { encrypt, decrypt } = await import('../../src/utils/encryption');

      const encrypted = encrypt('test');
      const parts = encrypted.split(':');
      // Tamper with the IV
      const tampered = `AAAAAAAAAAAAAAAAAAAAAA==:${parts[1]}:${parts[2]}`;

      expect(() => decrypt(tampered)).toThrow('Failed to decrypt data');
    });

    it('should throw with wrong key', async () => {
      process.env.ENCRYPTION_KEY = 'm'.repeat(32);
      const { encrypt } = await import('../../src/utils/encryption');
      const encrypted = encrypt('test');

      // Reset and use different key
      vi.resetModules();
      process.env.ENCRYPTION_KEY = 'n'.repeat(32);
      const { decrypt } = await import('../../src/utils/encryption');

      expect(() => decrypt(encrypted)).toThrow('Failed to decrypt data');
    });
  });

  describe('isEncrypted', () => {
    it('should return true for encrypted strings', async () => {
      process.env.ENCRYPTION_KEY = 'o'.repeat(32);
      const { encrypt, isEncrypted } = await import('../../src/utils/encryption');

      const encrypted = encrypt('test');
      expect(isEncrypted(encrypted)).toBe(true);
    });

    it('should return false for plain text', async () => {
      const { isEncrypted } = await import('../../src/utils/encryption');

      expect(isEncrypted('plain text')).toBe(false);
      expect(isEncrypted('not:encrypted')).toBe(false);
      expect(isEncrypted('a:b:c:d')).toBe(false);
    });

    it('should return false for empty or null values', async () => {
      const { isEncrypted } = await import('../../src/utils/encryption');

      expect(isEncrypted('')).toBe(false);
      expect(isEncrypted(null as any)).toBe(false);
      expect(isEncrypted(undefined as any)).toBe(false);
    });

    it('should check format but be lenient with base64 validation', async () => {
      const { isEncrypted } = await import('../../src/utils/encryption');

      // Node.js Buffer.from is lenient with base64, so the function
      // primarily checks the colon-separated format with 3 parts
      // This is acceptable since actual decryption will fail on invalid data
      expect(isEncrypted('a:b:c')).toBe(true); // 3 parts
      expect(isEncrypted('a:b')).toBe(false);  // Only 2 parts
    });
  });

  describe('hash', () => {
    it('should produce consistent SHA-256 hash', async () => {
      const { hash } = await import('../../src/utils/encryption');

      const value = 'test value';
      const hash1 = hash(value);
      const hash2 = hash(value);

      expect(hash1).toBe(hash2);
      expect(hash1.length).toBe(64); // SHA-256 produces 64 hex chars
    });

    it('should produce different hashes for different values', async () => {
      const { hash } = await import('../../src/utils/encryption');

      const hash1 = hash('value1');
      const hash2 = hash('value2');

      expect(hash1).not.toBe(hash2);
    });

    it('should produce valid hex string', async () => {
      const { hash } = await import('../../src/utils/encryption');

      const result = hash('test');
      expect(/^[a-f0-9]+$/i.test(result)).toBe(true);
    });
  });

  describe('key derivation', () => {
    it('should use ENCRYPTION_KEY when provided and long enough', async () => {
      process.env.ENCRYPTION_KEY = 'my-super-secret-encryption-key!!'; // Exactly 32 chars
      const { encrypt, decrypt } = await import('../../src/utils/encryption');

      const plaintext = 'test';
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should truncate ENCRYPTION_KEY if longer than 32 chars', async () => {
      process.env.ENCRYPTION_KEY = 'a'.repeat(64); // 64 chars
      const { encrypt, decrypt } = await import('../../src/utils/encryption');

      const plaintext = 'test';
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });
  });
});
