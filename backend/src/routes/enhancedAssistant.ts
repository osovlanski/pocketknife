/**
 * Enhanced Assistant Routes
 *
 * API routes for the enhanced AI assistant with streaming,
 * tool calling, plan preview, and memory features.
 */

import { Router } from 'express';
import { enhancedAssistantController } from '../controllers/enhancedAssistantController';

const router = Router();

// =============================================================================
// CHAT ENDPOINTS
// =============================================================================

/**
 * POST /api/assistant/v2/chat
 * Non-streaming chat endpoint
 */
router.post('/chat', (req, res) => enhancedAssistantController.chat(req, res));

/**
 * POST /api/assistant/v2/chat-with-image
 * Chat with image upload (base64 encoded)
 */
router.post('/chat-with-image', (req, res) => enhancedAssistantController.chatWithImage(req, res));

// =============================================================================
// PLAN ENDPOINTS
// =============================================================================

/**
 * POST /api/assistant/v2/generate-plan
 * Generate an execution plan without executing
 */
router.post('/generate-plan', (req, res) => enhancedAssistantController.generatePlan(req, res));

/**
 * POST /api/assistant/v2/execute-plan
 * Execute a previously generated plan
 */
router.post('/execute-plan', (req, res) => enhancedAssistantController.executePlan(req, res));

// =============================================================================
// MEMORY ENDPOINTS
// =============================================================================

/**
 * POST /api/assistant/v2/store-conversation
 * Store conversation in memory for future context
 */
router.post('/store-conversation', (req, res) => enhancedAssistantController.storeConversation(req, res));

/**
 * GET /api/assistant/v2/memory
 * Get recent conversation memories
 */
router.get('/memory', (req, res) => enhancedAssistantController.getMemory(req, res));

/**
 * GET /api/assistant/v2/preferences
 * Get user preferences learned from conversations
 */
router.get('/preferences', (req, res) => enhancedAssistantController.getPreferences(req, res));

/**
 * GET /api/assistant/v2/action-items
 * Get pending action items from conversations
 */
router.get('/action-items', (req, res) => enhancedAssistantController.getActionItems(req, res));

/**
 * DELETE /api/assistant/v2/memory
 * Clean up old memories
 */
router.delete('/memory', (req, res) => enhancedAssistantController.cleanupMemory(req, res));

export default router;
