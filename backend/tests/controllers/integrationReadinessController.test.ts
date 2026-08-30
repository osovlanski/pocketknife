import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { integrationReadiness } from '../../src/controllers/integrationReadinessController';

describe('integration readiness', () => {
  const original = { ...process.env };

  beforeEach(() => {
    process.env = { ...original, NODE_ENV: 'test' };
    delete process.env.DATABASE_URL;
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.GOOGLE_CLIENT_ID;
    delete process.env.GOOGLE_CLIENT_SECRET;
    delete process.env.ENCRYPTION_KEY;
  });

  afterEach(() => {
    process.env = original;
  });

  it('reports missing required integrations without exposing secret values', () => {
    let body: any;
    const res = { status: () => res, json: (value: unknown) => { body = value; } } as any;
    integrationReadiness({} as any, res);
    expect(body.status).toBe('degraded');
    expect(body.missingRequired).toEqual(['database', 'anthropic', 'googleOAuth']);
    expect(JSON.stringify(body)).not.toContain('API_KEY');
  });

  it('reports configured readiness using booleans only', () => {
    process.env.DATABASE_URL = 'postgresql://example.invalid/db';
    process.env.ANTHROPIC_API_KEY = 'test-secret';
    process.env.GOOGLE_CLIENT_ID = 'client';
    process.env.GOOGLE_CLIENT_SECRET = 'secret';
    let body: any;
    const res = { status: () => res, json: (value: unknown) => { body = value; } } as any;
    integrationReadiness({} as any, res);
    expect(body.status).toBe('ready');
    expect(body.checks.database).toEqual({ configured: true, required: true });
    expect(JSON.stringify(body)).not.toContain('test-secret');
  });
});
