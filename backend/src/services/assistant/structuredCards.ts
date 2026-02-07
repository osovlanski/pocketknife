/**
 * Structured Card Types
 *
 * Typed card representations for agent results (jobs, recipes, flights, tasks, products).
 * Used to pass structured data alongside markdown responses so the frontend
 * can render rich card components instead of plain text.
 */

import type { WorkflowStep } from './agentOrchestratorService';
import { generateRenderHints, type CardGroupRenderHints } from './componentRegistry';

// =============================================================================
// CARD TYPES
// =============================================================================

export interface JobCard {
  type: 'job';
  title: string;
  company: string;
  location?: string;
  matchScore?: number;
  url?: string;
  salary?: string;
  source?: string;
}

export interface RecipeCard {
  type: 'recipe';
  title: string;
  prepTime?: string;
  cookTime?: string;
  servings?: number;
  matchPercentage?: number;
  missingIngredients?: string[];
  imageUrl?: string;
  sourceUrl?: string;
}

export interface FlightCard {
  type: 'flight';
  airline: string;
  origin: string;
  destination: string;
  price?: string;
  stops?: number;
  departTime?: string;
  arriveTime?: string;
  bookingUrl?: string;
}

export interface TaskCard {
  type: 'task';
  title: string;
  completed: boolean;
  priority?: 'low' | 'medium' | 'high';
  dueDate?: string;
  taskId?: string;
}

export interface ProductCard {
  type: 'product';
  name: string;
  price?: string;
  originalPrice?: string;
  source?: string;
  url?: string;
  imageUrl?: string;
}

export type StructuredCard = JobCard | RecipeCard | FlightCard | TaskCard | ProductCard;

export { type CardGroupRenderHints } from './componentRegistry';

export interface StructuredDataResult {
  cards: StructuredCard[];
  renderHints: CardGroupRenderHints;
}

/**
 * Compute card counts by type and generate render hints from the component registry.
 */
export function buildRenderHints(cards: StructuredCard[]): CardGroupRenderHints {
  const counts: Record<string, number> = {};
  for (const card of cards) {
    counts[card.type] = (counts[card.type] || 0) + 1;
  }
  return generateRenderHints(counts);
}

// =============================================================================
// EXTRACTION LOGIC
// =============================================================================

/**
 * Extract structured cards from workflow step results.
 * Inspects the data shape returned by each agent and maps to typed cards.
 */
export function extractStructuredData(steps: WorkflowStep[]): StructuredCard[] {
  const cards: StructuredCard[] = [];

  for (const step of steps) {
    if (step.status !== 'completed' || !step.result?.data) continue;

    const data = step.result.data as Record<string, unknown>;

    switch (step.agentId) {
      case 'jobs':
        cards.push(...extractJobCards(data));
        break;
      case 'cooking':
        cards.push(...extractRecipeCards(data));
        break;
      case 'travel':
        cards.push(...extractFlightCards(data));
        break;
      case 'todo':
        cards.push(...extractTaskCards(data));
        break;
      case 'shopping':
        cards.push(...extractProductCards(data));
        break;
    }
  }

  return cards;
}

function extractJobCards(data: Record<string, unknown>): JobCard[] {
  const items = findArray(data, ['jobs', 'results', 'listings']);
  return items.map((item: Record<string, unknown>) => ({
    type: 'job' as const,
    title: String(item.title || item.jobTitle || ''),
    company: String(item.company || item.companyName || ''),
    location: item.location ? String(item.location) : undefined,
    matchScore: typeof item.matchScore === 'number' ? item.matchScore : undefined,
    url: item.url ? String(item.url) : item.link ? String(item.link) : undefined,
    salary: item.salary ? String(item.salary) : undefined,
    source: item.source ? String(item.source) : undefined,
  })).filter(card => card.title && card.company);
}

function extractRecipeCards(data: Record<string, unknown>): RecipeCard[] {
  const items = findArray(data, ['recipes', 'results']);
  return items.map((item: Record<string, unknown>) => ({
    type: 'recipe' as const,
    title: String(item.title || item.name || ''),
    prepTime: item.prepTime ? String(item.prepTime) : item.readyInMinutes ? `${item.readyInMinutes} min` : undefined,
    cookTime: item.cookTime ? String(item.cookTime) : undefined,
    servings: typeof item.servings === 'number' ? item.servings : undefined,
    matchPercentage: typeof item.usedIngredientCount === 'number' && typeof item.missedIngredientCount === 'number'
      ? Math.round((item.usedIngredientCount as number) / ((item.usedIngredientCount as number) + (item.missedIngredientCount as number)) * 100)
      : undefined,
    missingIngredients: Array.isArray(item.missedIngredients)
      ? (item.missedIngredients as Array<Record<string, unknown>>).map(i => String(i.name || i))
      : undefined,
    imageUrl: item.image ? String(item.image) : undefined,
    sourceUrl: item.sourceUrl ? String(item.sourceUrl) : undefined,
  })).filter(card => card.title);
}

function extractFlightCards(data: Record<string, unknown>): FlightCard[] {
  const items = findArray(data, ['flights', 'results', 'itineraries']);
  return items.map((item: Record<string, unknown>) => ({
    type: 'flight' as const,
    airline: String(item.airline || item.carrier || ''),
    origin: String(item.origin || item.departure || ''),
    destination: String(item.destination || item.arrival || ''),
    price: item.price ? String(item.price) : undefined,
    stops: typeof item.stops === 'number' ? item.stops : undefined,
    departTime: item.departTime ? String(item.departTime) : item.departureTime ? String(item.departureTime) : undefined,
    arriveTime: item.arriveTime ? String(item.arriveTime) : item.arrivalTime ? String(item.arrivalTime) : undefined,
    bookingUrl: item.bookingUrl ? String(item.bookingUrl) : item.url ? String(item.url) : undefined,
  })).filter(card => card.airline && card.origin && card.destination);
}

function extractTaskCards(data: Record<string, unknown>): TaskCard[] {
  const items = findArray(data, ['tasks', 'items', 'todos']);
  return items.map((item: Record<string, unknown>) => ({
    type: 'task' as const,
    title: String(item.title || item.name || item.text || ''),
    completed: Boolean(item.completed || item.done || item.status === 'completed'),
    priority: normalizePriority(item.priority),
    dueDate: item.dueDate ? String(item.dueDate) : item.due ? String(item.due) : undefined,
    taskId: item.id ? String(item.id) : item.taskId ? String(item.taskId) : undefined,
  })).filter(card => card.title);
}

function extractProductCards(data: Record<string, unknown>): ProductCard[] {
  const items = findArray(data, ['products', 'deals', 'results', 'items']);
  return items.map((item: Record<string, unknown>) => ({
    type: 'product' as const,
    name: String(item.name || item.title || ''),
    price: item.price ? String(item.price) : undefined,
    originalPrice: item.originalPrice ? String(item.originalPrice) : item.listPrice ? String(item.listPrice) : undefined,
    source: item.source ? String(item.source) : item.store ? String(item.store) : undefined,
    url: item.url ? String(item.url) : item.link ? String(item.link) : undefined,
    imageUrl: item.imageUrl ? String(item.imageUrl) : item.image ? String(item.image) : undefined,
  })).filter(card => card.name);
}

/**
 * Extract structured cards from enhanced assistant tool call results.
 * Tool names follow the pattern: agentId_action (e.g., "jobs_search", "cooking_find_recipes").
 */
export function extractStructuredDataFromToolCalls(
  toolResults: Map<string, { success: boolean; data?: unknown }>
): StructuredCard[] {
  const cards: StructuredCard[] = [];

  for (const [toolName, result] of toolResults.entries()) {
    if (!result.success || !result.data) continue;

    const data = (typeof result.data === 'object' && result.data !== null)
      ? result.data as Record<string, unknown>
      : {};

    const agentId = toolName.split('_')[0];

    switch (agentId) {
      case 'jobs':
        cards.push(...extractJobCards(data));
        break;
      case 'cooking':
        cards.push(...extractRecipeCards(data));
        break;
      case 'travel':
        cards.push(...extractFlightCards(data));
        break;
      case 'todo':
        cards.push(...extractTaskCards(data));
        break;
      case 'shopping':
        cards.push(...extractProductCards(data));
        break;
    }
  }

  return cards;
}

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Find the first array in data that matches one of the candidate keys.
 */
function findArray(data: Record<string, unknown>, candidateKeys: string[]): Array<Record<string, unknown>> {
  for (const key of candidateKeys) {
    if (Array.isArray(data[key]) && data[key].length > 0) {
      return data[key] as Array<Record<string, unknown>>;
    }
  }

  // If the data itself is wrapped in a single key containing an array
  const values = Object.values(data);
  for (const value of values) {
    if (Array.isArray(value) && value.length > 0) {
      return value as Array<Record<string, unknown>>;
    }
  }

  return [];
}

function normalizePriority(value: unknown): 'low' | 'medium' | 'high' | undefined {
  if (!value) return undefined;
  const normalized = String(value).toLowerCase();
  if (normalized === 'low' || normalized === 'medium' || normalized === 'high') {
    return normalized;
  }
  return undefined;
}
