/**
 * Services Index
 * 
 * Central export point for all services organized by agent/domain.
 * 
 * Structure:
 * - email/      - Email Agent services (Gmail, Drive, notifications)
 * - jobs/       - Job Search Agent services (job sources, matching, CV)
 * - travel/     - Travel Agent services (flights, hotels, trips)
 * - learning/   - Learning Agent services (resources, summaries)
 * - problemSolving/ - Problem Solving Agent services (coding problems)
 * - notifications/  - Cross-cutting notification services
 * - core/       - Shared core services (AI client, process control)
 */

// Email Agent
export * from './email';

// Job Search Agent
export * from './jobs';

// Travel Agent
export * from './travel';

// Learning Agent
export * from './learning';

// Problem Solving Agent
export * from './problemSolving';

// Notification Services
export * from './notifications';

// Core Services
export * from './core';





