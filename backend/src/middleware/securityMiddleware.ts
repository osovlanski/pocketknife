/**
 * Security Middleware
 *
 * Provides security headers and protections using Helmet.js
 * Configures CSP, HSTS, X-Frame-Options, and other security measures.
 */

import helmet from 'helmet';
import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';

/**
 * Helmet configuration for security headers
 */
export const securityHeaders = helmet({
  // Content Security Policy
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"], // Needed for some frontend frameworks
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:', 'https:', 'blob:'],
      connectSrc: [
        "'self'",
        'https://api.anthropic.com',
        'https://leetcode.com',
        'https://codeforces.com',
        'https://api.amadeus.com',
        'https://*.google.com',
        'https://*.googleapis.com',
        'wss://*', // WebSocket connections
        'ws://*'
      ],
      frameSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      workerSrc: ["'self'", 'blob:']
    }
  },
  // Cross-Origin settings
  crossOriginEmbedderPolicy: false, // Allow embedding external resources
  crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  // DNS Prefetch Control
  dnsPrefetchControl: { allow: true },
  // Expect-CT (deprecated but harmless)
  // expectCt: { maxAge: 86400, enforce: true },
  // Frameguard - prevent clickjacking
  frameguard: { action: 'sameorigin' },
  // Hide X-Powered-By
  hidePoweredBy: true,
  // HSTS - force HTTPS
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true
  },
  // IE No Open
  ieNoOpen: true,
  // No Sniff - prevent MIME type sniffing
  noSniff: true,
  // Origin Agent Cluster
  originAgentCluster: true,
  // Permitted Cross-Domain Policies
  permittedCrossDomainPolicies: { permittedPolicies: 'none' },
  // Referrer Policy
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  // XSS Filter
  xssFilter: true
});

/**
 * Additional security middleware for request validation
 */
export const requestValidator = (req: Request, res: Response, next: NextFunction): void => {
  // Check for suspicious patterns in request body
  if (req.body && typeof req.body === 'object') {
    const bodyStr = JSON.stringify(req.body);

    // Check for potential NoSQL injection patterns
    if (bodyStr.includes('$where') || bodyStr.includes('$regex') || bodyStr.includes('$ne')) {
      logger.warn('Potential NoSQL injection detected', {
        ip: req.ip,
        path: req.path,
        pattern: 'mongodb-operator'
      });
      // Allow through but log - Prisma/PostgreSQL isn't vulnerable to these
    }

    // Check for extremely large payloads (should be handled by body-parser, but double-check)
    if (bodyStr.length > 1000000) { // 1MB
      logger.warn('Large request body detected', {
        ip: req.ip,
        path: req.path,
        size: bodyStr.length
      });
      res.status(413).json({
        success: false,
        error: 'Request body too large',
        code: 'PAYLOAD_TOO_LARGE'
      });
      return;
    }
  }

  next();
};

/**
 * Request ID middleware - adds unique ID to each request for tracking
 */
export const requestId = (req: Request, res: Response, next: NextFunction): void => {
  const id = req.headers['x-request-id'] as string ||
             `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  (req as any).requestId = id;
  res.setHeader('X-Request-ID', id);
  next();
};

/**
 * Response time tracking
 */
export const responseTime = (req: Request, res: Response, next: NextFunction): void => {
  const start = process.hrtime();

  res.on('finish', () => {
    const [seconds, nanoseconds] = process.hrtime(start);
    const duration = seconds * 1000 + nanoseconds / 1000000;

    // Log slow requests
    if (duration > 5000) {
      logger.warn('Slow request detected', {
        path: req.path,
        method: req.method,
        duration: `${duration.toFixed(2)}ms`,
        status: res.statusCode
      });
    }
  });

  next();
};

/**
 * Combined security middleware stack
 */
export const securityMiddleware = [
  requestId,
  responseTime,
  securityHeaders,
  requestValidator
];

export default securityMiddleware;
