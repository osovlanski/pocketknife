/**
 * Assistant Service
 * 
 * AI-powered service for interpreting user messages, planning workflows,
 * and generating responses. Uses Claude to understand user intent and
 * coordinate actions across multiple agents.
 * 
 * Enhanced with multi-source aggregation:
 * - Agent-based data (primary)
 * - Web search (fallback/enrichment)
 * - AI knowledge (synthesis/fallback)
 */

import axios from 'axios';
import { getAnthropicClient, parseClaudeJSON } from '../../utils/anthropicClient';
import { configService } from '../core/configService';
import { cacheService } from '../core/cacheService';
import { agentOrchestratorService, WorkflowStep, WorkflowResult } from './agentOrchestratorService';
import logger from '../../utils/logger';
import type { AgentId } from '../../agents/types';

// =============================================================================
// TYPES
// =============================================================================

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  workflowSteps?: WorkflowStep[];
}

export interface IntentAnalysis {
  intent: string;
  confidence: number;
  requiresAgents: AgentId[];
  extractedParams: Record<string, unknown>;
  isMultiStep: boolean;
  clarificationNeeded?: string;
}

export interface ExecutionPlan {
  steps: WorkflowStep[];
  explanation: string;
  estimatedDuration?: number;
}

export interface AssistantResponse {
  message: string;
  workflowResult?: WorkflowResult;
  suggestions?: string[];
  sources?: string[];
}

export interface WebSearchResult {
  title: string;
  url: string;
  snippet: string;
}

export interface AggregatedData {
  agentData: Record<string, unknown> | null;
  webResults: WebSearchResult[];
  aiKnowledge: string | null;
  sources: string[];
}

// =============================================================================
// ASSISTANT SERVICE
// =============================================================================

class AssistantService {
  private readonly model: string;
  private readonly maxTokens: number;
  private readonly googleSearchApiKey: string;
  private readonly googleSearchCx: string;

  constructor() {
    this.model = configService.get('ai.claude.defaultModel', 'claude-sonnet-4-20250514');
    this.maxTokens = configService.get('assistant.ai.maxTokens', 4000);
    // Use GOOGLE_CSE_API_KEY and GOOGLE_CSE_ID from .env
    this.googleSearchApiKey = process.env.GOOGLE_CSE_API_KEY || '';
    this.googleSearchCx = process.env.GOOGLE_CSE_ID || '';
  }

  // ===========================================================================
  // WEB SEARCH
  // ===========================================================================

  /**
   * Search the web using Google Custom Search API
   */
  async searchWeb(query: string, maxResults: number = 5): Promise<WebSearchResult[]> {
    if (!this.googleSearchApiKey || !this.googleSearchCx) {
      logger.warn('Google Search API not configured - skipping web search');
      return [];
    }

    try {
      logger.search('Web search', { query });
      
      const response = await axios.get('https://www.googleapis.com/customsearch/v1', {
        params: {
          key: this.googleSearchApiKey,
          cx: this.googleSearchCx,
          q: query,
          num: maxResults
        },
        timeout: configService.get('assistant.webSearch.timeoutMs', 10000)
      });

      const items = response.data?.items || [];
      const results: WebSearchResult[] = items.map((item: any) => ({
        title: item.title || '',
        url: item.link || '',
        snippet: item.snippet || ''
      }));

      logger.found(`Web search returned ${results.length} results`);
      return results;
    } catch (error: any) {
      logger.fail('Web search failed', { error: error.message });
      return [];
    }
  }

  /**
   * Perform a recipe-specific web search
   */
  async searchRecipesWeb(recipeName: string): Promise<WebSearchResult[]> {
    const query = `${recipeName} recipe ingredients instructions`;
    return this.searchWeb(query, 3);
  }

  // ===========================================================================
  // AI KNOWLEDGE
  // ===========================================================================

  /**
   * Use Claude's knowledge to directly answer a question
   */
  async getAIKnowledge(
    query: string,
    context?: string
  ): Promise<string | null> {
    const client = getAnthropicClient();
    if (!client) return null;

    const prompt = `You are a knowledgeable assistant. Answer the following request directly and helpfully.

${context ? `Context: ${context}\n\n` : ''}Request: ${query}

Provide a complete, helpful answer. If this is about a recipe, include:
- Full list of ingredients with amounts
- Step-by-step cooking instructions
- Any helpful tips

Keep your response well-organized and practical.`;

    try {
      logger.agent('Getting AI knowledge', { query: query.slice(0, 100) });

      const response = await client.messages.create({
        model: this.model,
        max_tokens: configService.get('assistant.ai.knowledgeMaxTokens', 2000),
        messages: [{ role: 'user', content: prompt }]
      });

      const text = response.content[0].type === 'text' ? response.content[0].text : '';
      logger.success('AI knowledge retrieved');
      return text.trim();
    } catch (error: any) {
      logger.fail('Failed to get AI knowledge', { error: error.message });
      return null;
    }
  }

  // ===========================================================================
  // MULTI-SOURCE AGGREGATION
  // ===========================================================================

  /**
   * Aggregate data from multiple sources for a query
   */
  async aggregateData(
    query: string,
    intent: IntentAnalysis,
    agentResult: WorkflowResult | null,
    userId: string
  ): Promise<AggregatedData> {
    const sources: string[] = [];
    let agentData: Record<string, unknown> | null = null;
    let webResults: WebSearchResult[] = [];
    let aiKnowledge: string | null = null;

    // 1. Check agent results
    if (agentResult?.success) {
      const completedSteps = agentResult.steps.filter(s => s.status === 'completed');
      for (const step of completedSteps) {
        if (step.result?.data && this.hasValidData(step.result.data)) {
          agentData = step.result.data as Record<string, unknown>;
          sources.push(`${step.agentId} agent`);
        }
      }
    }

    // 2. If agent data is empty/insufficient, use web search
    const needsFallback = !agentData || this.isEmptyResult(agentData);
    
    if (needsFallback) {
      logger.agent('Agent results insufficient, fetching from web', { query });
      
      // Determine search query based on intent
      const searchQuery = this.buildSearchQuery(query, intent);
      webResults = await this.searchWeb(searchQuery);
      
      if (webResults.length > 0) {
        sources.push('web search');
      }
    }

    // 3. Use AI knowledge to synthesize or as fallback
    if (needsFallback || this.shouldEnhanceWithAI(intent)) {
      const webContext = webResults.length > 0
        ? `Web search found: ${webResults.map(r => `${r.title}: ${r.snippet}`).join('\n')}`
        : '';
      
      aiKnowledge = await this.getAIKnowledge(query, webContext);
      
      if (aiKnowledge) {
        sources.push('AI knowledge');
      }
    }

    return { agentData, webResults, aiKnowledge, sources };
  }

  /**
   * Check if result data is valid/non-empty
   */
  private hasValidData(data: unknown): boolean {
    if (!data) return false;
    if (Array.isArray(data)) return data.length > 0;
    if (typeof data === 'object') {
      const values = Object.values(data as Record<string, unknown>);
      return values.some(v => {
        if (Array.isArray(v)) return v.length > 0;
        if (v !== null && v !== undefined) return true;
        return false;
      });
    }
    return true;
  }

  /**
   * Check if result is empty
   */
  private isEmptyResult(data: Record<string, unknown>): boolean {
    // Check for common empty patterns
    if ('recipes' in data && Array.isArray(data.recipes) && data.recipes.length === 0) {
      return true;
    }
    if ('results' in data && Array.isArray(data.results) && data.results.length === 0) {
      return true;
    }
    if ('items' in data && Array.isArray(data.items) && data.items.length === 0) {
      return true;
    }
    return false;
  }

  /**
   * Build search query based on intent
   */
  private buildSearchQuery(originalQuery: string, intent: IntentAnalysis): string {
    const intentLower = intent.intent.toLowerCase();
    
    if (intentLower.includes('recipe') || intentLower.includes('cook')) {
      return `${originalQuery} recipe ingredients instructions`;
    }
    if (intentLower.includes('job')) {
      return `${originalQuery} job listing remote`;
    }
    if (intentLower.includes('flight') || intentLower.includes('travel')) {
      return `${originalQuery} travel guide tips`;
    }
    
    return originalQuery;
  }

  /**
   * Check if we should enhance with AI
   */
  private shouldEnhanceWithAI(intent: IntentAnalysis): boolean {
    // Always enhance recipe queries with AI for complete instructions
    const intentLower = intent.intent.toLowerCase();
    return intentLower.includes('recipe') || 
           intentLower.includes('how to') || 
           intentLower.includes('explain') ||
           intentLower.includes('tutorial');
  }

  /**
   * Interpret user message and determine intent
   */
  async interpretUserMessage(
    message: string,
    conversationHistory: ChatMessage[] = []
  ): Promise<IntentAnalysis> {
    const client = getAnthropicClient();
    if (!client) {
      throw new Error('AI service not available');
    }

    const capabilitiesPrompt = agentOrchestratorService.buildCapabilitiesPrompt();
    const historyContext = conversationHistory
      .slice(-10)
      .map(m => `${m.role}: ${m.content}`)
      .join('\n');

    const prompt = `You are an AI assistant that helps users interact with a productivity platform called Pocketknife.

${capabilitiesPrompt}

Analyze the user's message and determine:
1. What they want to accomplish (intent)
2. Which agent(s) are needed
3. What parameters can be extracted from their message
4. Whether this requires multiple steps

${historyContext ? `\nConversation history:\n${historyContext}\n` : ''}

User message: "${message}"

Respond with a JSON object:
{
  "intent": "Brief description of what user wants",
  "confidence": 0.0-1.0,
  "requiresAgents": ["agentId1", "agentId2"],
  "extractedParams": {
    "agentId": {
      "param1": "value1"
    }
  },
  "isMultiStep": true/false,
  "clarificationNeeded": "Optional - if you need more info to proceed"
}

Respond ONLY with valid JSON (no markdown, no backticks):`;

    try {
      const response = await client.messages.create({
        model: this.model,
        max_tokens: configService.get('assistant.ai.planningMaxTokens', 2000),
        messages: [{ role: 'user', content: prompt }]
      });

      const text = response.content[0].type === 'text' ? response.content[0].text : '';
      const analysis = parseClaudeJSON<IntentAnalysis>(text);

      logger.agent('Intent analyzed', { 
        intent: analysis.intent, 
        agents: analysis.requiresAgents 
      });

      return analysis;
    } catch (error: any) {
      logger.fail('Failed to interpret message', { error: error.message });
      throw error;
    }
  }

  /**
   * Create an execution plan from intent analysis
   */
  async planWorkflow(
    intent: IntentAnalysis,
    userId: string
  ): Promise<ExecutionPlan> {
    const steps: WorkflowStep[] = [];
    let stepId = 1;

    // Create workflow steps based on the intent
    for (const agentId of intent.requiresAgents) {
      const capabilities = agentOrchestratorService.getAgentCapabilities(agentId);
      const agentParams = intent.extractedParams[agentId] || {};

      // Determine the best action based on intent
      const action = this.determineAction(agentId, intent.intent, capabilities);

      if (action) {
        steps.push({
          id: `step-${stepId}`,
          agentId,
          action,
          params: {
            userId,
            ...agentParams
          },
          dependsOn: stepId > 1 ? [`step-${stepId - 1}`] : undefined,
          status: 'pending'
        });
        stepId++;
      }
    }

    return {
      steps,
      explanation: `Executing ${steps.length} step(s) to: ${intent.intent}`,
      estimatedDuration: steps.length * 5000 // Rough estimate: 5s per step
    };
  }

  /**
   * Determine the best action for an agent based on intent
   */
  private determineAction(
    agentId: AgentId,
    intent: string,
    capabilities: { action: string; description: string }[]
  ): string | null {
    const intentLower = intent.toLowerCase();

    // Match intent keywords to actions
    const actionMatches: Record<string, string[]> = {
      'find': ['search', 'find-recipes', 'get-feed'],
      'search': ['search', 'find-recipes', 'get-feed'],
      'get': ['get-items', 'get-tasks', 'get-saved', 'get-feed'],
      'show': ['get-items', 'get-tasks', 'get-saved', 'get-feed'],
      'list': ['get-items', 'get-tasks', 'get-saved', 'get-lists'],
      'add': ['add-item', 'create-task', 'add-list-item'],
      'create': ['create-list', 'create-task', 'generate-project'],
      'order': ['order-groceries', 'order-shopping-list', 'create-recipe-order'],
      'buy': ['order-groceries', 'order-shopping-list'],
      'grocery': ['order-groceries', 'get-grocery-stores'],
      'groceries': ['order-groceries', 'get-grocery-stores'],
      'shopping': ['order-shopping-list', 'get-lists'],
      'cart': ['order-groceries', 'order-shopping-list'],
      'plan': ['plan-trip'],
      'generate': ['generate-project'],
      'process': ['process']
    };

    // Find matching action
    for (const [keyword, actions] of Object.entries(actionMatches)) {
      if (intentLower.includes(keyword)) {
        for (const action of actions) {
          if (capabilities.some(c => c.action === action)) {
            return action;
          }
        }
      }
    }

    // Default to first available action if no match
    return capabilities.length > 0 ? capabilities[0].action : null;
  }

  /**
   * Execute a plan and generate a response
   */
  async executeAndRespond(
    plan: ExecutionPlan,
    userId: string,
    onProgress?: (step: WorkflowStep) => void
  ): Promise<AssistantResponse> {
    if (plan.steps.length === 0) {
      return {
        message: "I couldn't determine what action to take. Could you please rephrase your request?",
        suggestions: [
          "Find recipes with ingredients I have",
          "Show my tasks for today",
          "Search for flights to Barcelona"
        ]
      };
    }

    // Execute the workflow
    const result = await agentOrchestratorService.executeWorkflow(
      plan.steps,
      userId,
      onProgress
    );

    // Generate a natural language response
    const response = await this.generateResponse(plan, result);

    return {
      message: response,
      workflowResult: result,
      suggestions: this.generateSuggestions(result)
    };
  }

  /**
   * Generate a natural language response from workflow results
   */
  private async generateResponse(
    plan: ExecutionPlan,
    result: WorkflowResult
  ): Promise<string> {
    const client = getAnthropicClient();
    
    if (!client) {
      // Fallback response without AI
      if (result.success) {
        const completedSteps = result.steps.filter(s => s.status === 'completed');
        return `Completed ${completedSteps.length} action(s) successfully.`;
      }
      return 'Some actions failed. Please check the details.';
    }

    // Prepare results summary
    const stepsSummary = result.steps.map(step => ({
      agent: step.agentId,
      action: step.action,
      status: step.status,
      dataPreview: step.result?.data 
        ? JSON.stringify(step.result.data).slice(0, 500) 
        : null,
      error: step.error
    }));

    const prompt = `You are a helpful AI assistant. Generate a friendly, concise response based on these action results.

Plan: ${plan.explanation}

Results:
${JSON.stringify(stepsSummary, null, 2)}

Write a natural, helpful response that:
1. Summarizes what was done
2. Highlights key findings or data (counts, names, etc.)
3. Is conversational and friendly
4. If there were errors, explain what went wrong

Keep the response concise (2-4 sentences). Don't use JSON or code formatting.`;

    try {
      const response = await client.messages.create({
        model: this.model,
        max_tokens: configService.get('assistant.ai.responseMaxTokens', 500),
        messages: [{ role: 'user', content: prompt }]
      });

      const text = response.content[0].type === 'text' ? response.content[0].text : '';
      return text.trim();
    } catch (error: any) {
      logger.fail('Failed to generate response', { error: error.message });
      
      // Fallback
      if (result.success) {
        return `I've completed the requested actions successfully.`;
      }
      return `I encountered some issues while processing your request. Please try again.`;
    }
  }

  /**
   * Generate follow-up suggestions
   */
  private generateSuggestions(result: WorkflowResult): string[] {
    const suggestions: string[] = [];

    for (const step of result.steps) {
      if (step.status === 'completed') {
        switch (step.agentId) {
          case 'cooking':
            if (step.action === 'find-recipes') {
              suggestions.push('Save a recipe to wishlist');
              suggestions.push('Order ingredients for this recipe');
            }
            if (step.action === 'get-lists') {
              suggestions.push('Order items from my shopping list');
            }
            if (step.action === 'get-low-stock' || step.action === 'get-items') {
              suggestions.push('Order groceries to restock');
            }
            if (step.action === 'order-groceries' || step.action === 'order-shopping-list') {
              suggestions.push('Show available grocery stores');
              suggestions.push('Create a new shopping list');
            }
            break;
          case 'jobs':
            if (step.action === 'search') {
              suggestions.push('Save interesting jobs');
              suggestions.push('Prepare for an interview');
            }
            break;
          case 'travel':
            if (step.action === 'search-flights') {
              suggestions.push('Create a trip itinerary');
            }
            break;
        }
      }
    }

    return suggestions.slice(0, 3);
  }

  /**
   * Handle a complete chat message (interpret -> plan -> execute -> respond)
   * Uses multi-source aggregation for comprehensive answers
   */
  async handleMessage(
    message: string,
    userId: string,
    conversationHistory: ChatMessage[] = [],
    onProgress?: (step: WorkflowStep) => void
  ): Promise<AssistantResponse> {
    logger.agent('Processing assistant message', { message: message.slice(0, 100) });

    // 1. Interpret the message
    const intent = await this.interpretUserMessage(message, conversationHistory);

    // 2. Check if clarification is needed
    if (intent.clarificationNeeded) {
      return {
        message: intent.clarificationNeeded,
        suggestions: []
      };
    }

    // 3. Low confidence - still try to help with AI knowledge
    if (intent.confidence < 0.5 && intent.requiresAgents.length === 0) {
      // Try direct AI knowledge for simple questions
      const aiKnowledge = await this.getAIKnowledge(message);
      if (aiKnowledge) {
        return {
          message: aiKnowledge,
          sources: ['AI knowledge'],
          suggestions: this.generateGenericSuggestions()
        };
      }
      
      return {
        message: "I'm not quite sure what you're asking for. Could you please be more specific?",
        suggestions: [
          "Find pasta recipes",
          "Show my tasks",
          "Search for remote jobs"
        ]
      };
    }

    // 4. Plan the workflow
    const plan = await this.planWorkflow(intent, userId);

    // 5. Execute the workflow
    let workflowResult: WorkflowResult | null = null;
    if (plan.steps.length > 0) {
      workflowResult = await agentOrchestratorService.executeWorkflow(
        plan.steps,
        userId,
        onProgress
      );
    }

    // 6. Aggregate data from multiple sources
    const aggregatedData = await this.aggregateData(
      message,
      intent,
      workflowResult,
      userId
    );

    // 7. Generate comprehensive response
    const response = await this.generateAggregatedResponse(
      message,
      intent,
      aggregatedData,
      workflowResult
    );

    return {
      message: response,
      workflowResult: workflowResult || undefined,
      sources: aggregatedData.sources,
      suggestions: this.generateSuggestions(workflowResult || { success: true, steps: [] })
    };
  }

  /**
   * Generate a response from aggregated multi-source data
   */
  private async generateAggregatedResponse(
    originalQuery: string,
    intent: IntentAnalysis,
    aggregatedData: AggregatedData,
    workflowResult: WorkflowResult | null
  ): Promise<string> {
    const client = getAnthropicClient();
    
    // If we have AI knowledge as the primary source, use it directly
    if (aggregatedData.aiKnowledge && !aggregatedData.agentData) {
      return aggregatedData.aiKnowledge;
    }

    if (!client) {
      // Fallback without AI
      if (aggregatedData.aiKnowledge) {
        return aggregatedData.aiKnowledge;
      }
      if (workflowResult?.success) {
        return 'I completed the requested action successfully.';
      }
      return 'I encountered an issue processing your request.';
    }

    // Build context from all sources
    const contexts: string[] = [];

    if (aggregatedData.agentData) {
      contexts.push(`Agent data: ${JSON.stringify(aggregatedData.agentData).slice(0, 1000)}`);
    }

    if (aggregatedData.webResults.length > 0) {
      const webContext = aggregatedData.webResults
        .map(r => `- ${r.title}: ${r.snippet}`)
        .join('\n');
      contexts.push(`Web search results:\n${webContext}`);
    }

    if (aggregatedData.aiKnowledge) {
      contexts.push(`AI knowledge: ${aggregatedData.aiKnowledge.slice(0, 1500)}`);
    }

    const prompt = `You are a helpful AI assistant. The user asked: "${originalQuery}"

I gathered information from multiple sources:
${contexts.join('\n\n')}

Based on all available information, provide a comprehensive, helpful response that:
1. Directly answers the user's question
2. Combines the best information from all sources
3. Is well-organized and easy to follow
4. Includes specific details (ingredients, steps, numbers, etc.)

If this is about a recipe, include the full ingredients list and cooking instructions.
If some sources had no results but others did, focus on what we found.

Response:`;

    try {
      const response = await client.messages.create({
        model: this.model,
        max_tokens: configService.get('assistant.ai.responseMaxTokens', 2000),
        messages: [{ role: 'user', content: prompt }]
      });

      const text = response.content[0].type === 'text' ? response.content[0].text : '';
      return text.trim();
    } catch (error: any) {
      logger.fail('Failed to generate aggregated response', { error: error.message });
      
      // Return the best available data
      if (aggregatedData.aiKnowledge) {
        return aggregatedData.aiKnowledge;
      }
      return 'I found some information but had trouble formatting the response. Please try again.';
    }
  }

  /**
   * Generate generic suggestions
   */
  private generateGenericSuggestions(): string[] {
    return [
      "Search for recipes",
      "Show my tasks",
      "Find remote jobs",
      "Plan a trip"
    ];
  }
}

export const assistantService = new AssistantService();
export default assistantService;
