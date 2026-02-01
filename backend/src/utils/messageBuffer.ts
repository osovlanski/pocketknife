/**
 * Message Buffer Utility
 *
 * Provides efficient message accumulation and pagination for large conversation histories.
 * Uses a ring buffer pattern to avoid O(n) array reconstruction.
 */

import logger from './logger';

// =============================================================================
// TYPES
// =============================================================================

export interface BufferedMessage<T> {
  id: string;
  data: T;
  timestamp: number;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// =============================================================================
// MESSAGE BUFFER
// =============================================================================

/**
 * Efficient ring buffer for message accumulation
 * Avoids O(n) array reconstruction when adding messages
 */
export class MessageBuffer<T> {
  private buffer: Array<BufferedMessage<T> | null>;
  private head = 0;
  private tail = 0;
  private count = 0;

  constructor(private readonly capacity: number) {
    this.buffer = new Array(capacity).fill(null);
  }

  /**
   * Add a message to the buffer (O(1))
   */
  push(id: string, data: T): void {
    this.buffer[this.tail] = {
      id,
      data,
      timestamp: Date.now()
    };

    this.tail = (this.tail + 1) % this.capacity;

    if (this.count < this.capacity) {
      this.count++;
    } else {
      // Buffer is full, advance head (oldest message discarded)
      this.head = (this.head + 1) % this.capacity;
    }
  }

  /**
   * Get all messages in order (oldest to newest)
   */
  getAll(): T[] {
    const result: T[] = [];

    for (let i = 0; i < this.count; i++) {
      const index = (this.head + i) % this.capacity;
      const item = this.buffer[index];
      if (item) {
        result.push(item.data);
      }
    }

    return result;
  }

  /**
   * Get the most recent N messages
   */
  getRecent(n: number): T[] {
    const count = Math.min(n, this.count);
    const result: T[] = [];

    for (let i = 0; i < count; i++) {
      const index = (this.tail - 1 - i + this.capacity) % this.capacity;
      const item = this.buffer[index];
      if (item) {
        result.unshift(item.data);
      }
    }

    return result;
  }

  /**
   * Get paginated messages
   */
  getPaginated(page: number, pageSize: number): PaginatedResult<T> {
    const allMessages = this.getAll();
    const start = page * pageSize;
    const end = start + pageSize;

    return {
      items: allMessages.slice(start, end),
      total: this.count,
      page,
      pageSize,
      hasMore: end < this.count
    };
  }

  /**
   * Clear the buffer
   */
  clear(): void {
    this.buffer = new Array(this.capacity).fill(null);
    this.head = 0;
    this.tail = 0;
    this.count = 0;
  }

  get length(): number {
    return this.count;
  }

  get isEmpty(): boolean {
    return this.count === 0;
  }
}

// =============================================================================
// CONVERSATION HISTORY MANAGER
// =============================================================================

interface HistoryMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  toolCalls?: unknown[];
}

/**
 * Manages conversation history with efficient operations
 */
export class ConversationHistoryManager {
  private buffers: Map<string, MessageBuffer<HistoryMessage>> = new Map();
  private readonly defaultCapacity: number;

  constructor(defaultCapacity = 100) {
    this.defaultCapacity = defaultCapacity;
  }

  /**
   * Get or create buffer for a conversation
   */
  private getBuffer(conversationId: string): MessageBuffer<HistoryMessage> {
    if (!this.buffers.has(conversationId)) {
      this.buffers.set(conversationId, new MessageBuffer(this.defaultCapacity));
    }
    return this.buffers.get(conversationId)!;
  }

  /**
   * Add a message to a conversation
   */
  addMessage(conversationId: string, message: HistoryMessage): void {
    const buffer = this.getBuffer(conversationId);
    buffer.push(message.id, message);
  }

  /**
   * Get messages for Claude API (most recent N)
   */
  getMessagesForApi(conversationId: string, maxMessages: number): HistoryMessage[] {
    const buffer = this.getBuffer(conversationId);
    return buffer.getRecent(maxMessages);
  }

  /**
   * Get paginated history for UI
   */
  getPaginatedHistory(
    conversationId: string,
    page: number,
    pageSize: number
  ): PaginatedResult<HistoryMessage> {
    const buffer = this.getBuffer(conversationId);
    return buffer.getPaginated(page, pageSize);
  }

  /**
   * Load messages from external source (e.g., database)
   */
  loadMessages(conversationId: string, messages: HistoryMessage[]): void {
    const buffer = this.getBuffer(conversationId);
    buffer.clear();

    for (const message of messages) {
      buffer.push(message.id, message);
    }

    logger.debug('Loaded conversation history', {
      conversationId,
      messageCount: messages.length
    });
  }

  /**
   * Clear a conversation's history
   */
  clearConversation(conversationId: string): void {
    this.buffers.delete(conversationId);
  }

  /**
   * Get conversation count
   */
  getConversationCount(): number {
    return this.buffers.size;
  }

  /**
   * Prune old/inactive conversations from memory
   */
  pruneInactive(maxConversations: number): number {
    if (this.buffers.size <= maxConversations) {
      return 0;
    }

    // Get conversations sorted by buffer activity (not directly available, so use size as proxy)
    const entries = Array.from(this.buffers.entries());
    const toPrune = entries.slice(0, entries.length - maxConversations);

    for (const [id] of toPrune) {
      this.buffers.delete(id);
    }

    logger.debug('Pruned inactive conversations', { pruned: toPrune.length });
    return toPrune.length;
  }
}

// =============================================================================
// EXPORTS
// =============================================================================

// Singleton instance for global conversation management
export const conversationHistoryManager = new ConversationHistoryManager();

export default {
  MessageBuffer,
  ConversationHistoryManager,
  conversationHistoryManager
};
