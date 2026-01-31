/**
 * Conversation Memory Service
 *
 * Provides long-term memory for conversations by storing summaries
 * and extracted entities. Enables context continuity across sessions.
 */

import { getPrisma } from '../core/databaseService';
import { cacheService } from '../core/cacheService';
import { getAnthropicClient } from '../../utils/anthropicClient';
import { configService } from '../core/configService';
import logger from '../../utils/logger';

// =============================================================================
// TYPES
// =============================================================================

export interface ConversationSummary {
  id: string;
  userId: string;
  conversationId: string;
  summary: string;
  entities: ExtractedEntities;
  messageCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ExtractedEntities {
  // People mentioned
  people: Array<{
    name: string;
    relationship?: string;
  }>;
  // Places discussed
  places: string[];
  // Dates/times mentioned
  dates: Array<{
    date: string;
    context: string;
  }>;
  // User preferences learned
  preferences: Array<{
    category: string;
    preference: string;
  }>;
  // Tasks or action items
  actionItems: Array<{
    task: string;
    status: 'pending' | 'completed';
  }>;
  // Topics discussed
  topics: string[];
  // Custom entities
  custom: Record<string, unknown>;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: Date;
}

// =============================================================================
// SERVICE
// =============================================================================

class ConversationMemoryService {
  private readonly maxMessagesBeforeSummary = 20;
  private readonly summaryTokenLimit = 500;

  /**
   * Get recent conversation memory for a user
   */
  async getRecentMemories(
    userId: string,
    limit: number = 5
  ): Promise<ConversationSummary[]> {
    const cacheKey = `memory:recent:${userId}`;
    const cached = await cacheService.get<ConversationSummary[]>(cacheKey);
    if (cached) return cached;

    const prisma = getPrisma();
    if (!prisma) return [];

    try {
      const memories = await (prisma as any).conversationMemory?.findMany({
        where: { userId },
        orderBy: { updatedAt: 'desc' },
        take: limit
      });

      if (!memories) return [];

      const result = memories.map((m: any) => ({
        id: m.id,
        userId: m.userId,
        conversationId: m.conversationId,
        summary: m.summary,
        entities: JSON.parse(m.entities || '{}'),
        messageCount: m.messageCount,
        createdAt: m.createdAt,
        updatedAt: m.updatedAt
      }));

      await cacheService.set(cacheKey, result, { ttl: 300 });
      return result;
    } catch {
      // Table might not exist yet
      return [];
    }
  }

  /**
   * Get memory context string for prompts
   */
  async getMemoryContext(userId: string): Promise<string> {
    const memories = await this.getRecentMemories(userId, 3);

    if (memories.length === 0) {
      return '';
    }

    const contextParts: string[] = [
      '## Previous Conversations Context',
      ''
    ];

    for (const memory of memories) {
      contextParts.push(`### Conversation from ${memory.updatedAt.toLocaleDateString()}`);
      contextParts.push(memory.summary);

      // Add relevant entities
      if (memory.entities.preferences?.length > 0) {
        contextParts.push(`User preferences: ${memory.entities.preferences.map(p => p.preference).join(', ')}`);
      }

      if (memory.entities.actionItems?.filter(a => a.status === 'pending').length > 0) {
        const pending = memory.entities.actionItems.filter(a => a.status === 'pending');
        contextParts.push(`Pending items: ${pending.map(a => a.task).join(', ')}`);
      }

      contextParts.push('');
    }

    return contextParts.join('\n');
  }

  /**
   * Store a conversation summary
   */
  async storeMemory(
    userId: string,
    conversationId: string,
    messages: ChatMessage[]
  ): Promise<void> {
    if (messages.length < 2) return; // Need at least one exchange

    const prisma = getPrisma();
    if (!prisma) return;

    try {
      // Generate summary using Claude
      const { summary, entities } = await this.generateSummary(messages);

      await (prisma as any).conversationMemory?.upsert({
        where: {
          conversationId
        },
        update: {
          summary,
          entities: JSON.stringify(entities),
          messageCount: messages.length,
          updatedAt: new Date()
        },
        create: {
          userId,
          conversationId,
          summary,
          entities: JSON.stringify(entities),
          messageCount: messages.length
        }
      });

      // Invalidate cache
      await cacheService.delete(`memory:recent:${userId}`);

      logger.success('Conversation memory stored', { conversationId, messageCount: messages.length });
    } catch (error: any) {
      logger.warn('Failed to store conversation memory', { error: error.message });
    }
  }

  /**
   * Generate a summary of the conversation using Claude
   */
  private async generateSummary(
    messages: ChatMessage[]
  ): Promise<{ summary: string; entities: ExtractedEntities }> {
    const client = getAnthropicClient();

    // Format messages for the prompt
    const conversationText = messages
      .map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
      .join('\n\n');

    const prompt = `Analyze this conversation and provide:
1. A brief summary (2-3 sentences) of what was discussed and accomplished
2. Extract key entities (people, places, dates, preferences, action items, topics)

Conversation:
${conversationText}

Respond with JSON in this exact format:
{
  "summary": "Brief summary here",
  "entities": {
    "people": [{"name": "...", "relationship": "..."}],
    "places": ["..."],
    "dates": [{"date": "...", "context": "..."}],
    "preferences": [{"category": "...", "preference": "..."}],
    "actionItems": [{"task": "...", "status": "pending"}],
    "topics": ["..."],
    "custom": {}
  }
}`;

    try {
      const response = await client.messages.create({
        model: configService.get('ai.claude.defaultModel', 'claude-sonnet-4-20250514'),
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }]
      });

      const text = response.content[0].type === 'text' ? response.content[0].text : '';
      const cleanText = text.replace(/```json|```/g, '').trim();

      const result = JSON.parse(cleanText);
      return {
        summary: result.summary || 'Conversation summary unavailable.',
        entities: {
          people: result.entities?.people || [],
          places: result.entities?.places || [],
          dates: result.entities?.dates || [],
          preferences: result.entities?.preferences || [],
          actionItems: result.entities?.actionItems || [],
          topics: result.entities?.topics || [],
          custom: result.entities?.custom || {}
        }
      };
    } catch (error) {
      // Fallback to simple summary
      const lastUserMessage = messages.filter(m => m.role === 'user').pop();
      return {
        summary: lastUserMessage
          ? `User asked about: ${lastUserMessage.content.slice(0, 100)}...`
          : 'Conversation occurred.',
        entities: {
          people: [],
          places: [],
          dates: [],
          preferences: [],
          actionItems: [],
          topics: [],
          custom: {}
        }
      };
    }
  }

  /**
   * Search memories for relevant context
   */
  async searchMemories(
    userId: string,
    query: string
  ): Promise<ConversationSummary[]> {
    const prisma = getPrisma();
    if (!prisma) return [];

    try {
      // Simple keyword search for now
      // Could be enhanced with vector embeddings for semantic search
      const memories = await (prisma as any).conversationMemory?.findMany({
        where: {
          userId,
          OR: [
            { summary: { contains: query, mode: 'insensitive' } },
            { entities: { contains: query, mode: 'insensitive' } }
          ]
        },
        orderBy: { updatedAt: 'desc' },
        take: 5
      });

      if (!memories) return [];

      return memories.map((m: any) => ({
        id: m.id,
        userId: m.userId,
        conversationId: m.conversationId,
        summary: m.summary,
        entities: JSON.parse(m.entities || '{}'),
        messageCount: m.messageCount,
        createdAt: m.createdAt,
        updatedAt: m.updatedAt
      }));
    } catch {
      return [];
    }
  }

  /**
   * Delete old memories to manage storage
   */
  async cleanupOldMemories(
    userId: string,
    maxAge: number = 30 * 24 * 60 * 60 * 1000 // 30 days
  ): Promise<number> {
    const prisma = getPrisma();
    if (!prisma) return 0;

    try {
      const cutoffDate = new Date(Date.now() - maxAge);

      const result = await (prisma as any).conversationMemory?.deleteMany({
        where: {
          userId,
          updatedAt: { lt: cutoffDate }
        }
      });

      if (result?.count > 0) {
        logger.info('Cleaned up old conversation memories', { userId, count: result.count });
      }

      return result?.count || 0;
    } catch {
      return 0;
    }
  }

  /**
   * Get user preferences from memory
   */
  async getUserPreferences(userId: string): Promise<Array<{ category: string; preference: string }>> {
    const memories = await this.getRecentMemories(userId, 10);

    const allPreferences: Array<{ category: string; preference: string }> = [];

    for (const memory of memories) {
      if (memory.entities.preferences) {
        allPreferences.push(...memory.entities.preferences);
      }
    }

    // Deduplicate by category, keeping the most recent
    const uniquePrefs = new Map<string, { category: string; preference: string }>();
    for (const pref of allPreferences) {
      uniquePrefs.set(pref.category, pref);
    }

    return Array.from(uniquePrefs.values());
  }

  /**
   * Get pending action items from memory
   */
  async getPendingActionItems(userId: string): Promise<Array<{ task: string; conversationId: string }>> {
    const memories = await this.getRecentMemories(userId, 10);

    const actionItems: Array<{ task: string; conversationId: string }> = [];

    for (const memory of memories) {
      const pending = memory.entities.actionItems?.filter(a => a.status === 'pending') || [];
      for (const item of pending) {
        actionItems.push({
          task: item.task,
          conversationId: memory.conversationId
        });
      }
    }

    return actionItems;
  }
}

export const conversationMemoryService = new ConversationMemoryService();
export default conversationMemoryService;
