import { Request, Response } from 'express';

type IntegrationCheck = {
  configured: boolean;
  required: boolean;
};

const configured = (name: string): boolean => Boolean(process.env[name]?.trim());

/**
 * Exposes configuration readiness without returning credential values.
 * This is intentionally a configuration check, not a live provider probe.
 */
export const integrationReadiness = (_req: Request, res: Response): void => {
  const checks: Record<string, IntegrationCheck> = {
    database: { configured: configured('DATABASE_URL'), required: true },
    anthropic: { configured: configured('ANTHROPIC_API_KEY'), required: true },
    googleOAuth: {
      configured: configured('GOOGLE_CLIENT_ID') && configured('GOOGLE_CLIENT_SECRET'),
      required: true,
    },
    encryption: {
      configured: configured('ENCRYPTION_KEY'),
      required: process.env.NODE_ENV === 'production',
    },
    notion: { configured: configured('NOTION_TOKEN'), required: false },
    telegram: { configured: configured('TELEGRAM_BOT_TOKEN'), required: false },
    discord: { configured: configured('DISCORD_WEBHOOK_URL'), required: false },
    rapidApi: { configured: configured('RAPIDAPI_KEY'), required: false },
    amadeus: {
      configured: configured('AMADEUS_API_KEY') && configured('AMADEUS_API_SECRET'),
      required: false,
    },
  };

  const missingRequired = Object.entries(checks)
    .filter(([, check]) => check.required && !check.configured)
    .map(([name]) => name);

  res.status(missingRequired.length > 0 ? 503 : 200).json({
    status: missingRequired.length > 0 ? 'degraded' : 'ready',
    timestamp: new Date().toISOString(),
    checks,
    missingRequired,
  });
};
