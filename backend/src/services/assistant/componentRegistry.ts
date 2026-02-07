/**
 * Component Knowledge Base (Component KB)
 *
 * A lightweight registry of reusable UI component schemas. Each entry describes
 * a card type's rendering capabilities — layout options, sort fields, display modes.
 * The assistant can reference this registry to produce render hints that tell the
 * frontend exactly how to present structured data.
 *
 * This is a pragmatic alternative to a full RAG-based component search pipeline.
 * The registry is static and small enough to include in LLM context when needed.
 */

// =============================================================================
// TYPES
// =============================================================================

export interface ComponentSchema {
  /** Card type discriminator (matches StructuredCard.type) */
  cardType: string;
  /** Human-readable name for this component */
  displayName: string;
  /** Available layout modes */
  layouts: LayoutMode[];
  /** Default layout */
  defaultLayout: LayoutMode;
  /** Fields available for sorting */
  sortableFields: string[];
  /** Default sort field and direction */
  defaultSort?: { field: string; direction: 'asc' | 'desc' };
  /** Max items to show before "show more" */
  defaultPageSize: number;
  /** Whether this card type supports image thumbnails */
  supportsImages: boolean;
  /** Action links this card can render */
  actionLinks: string[];
}

export type LayoutMode = 'grid' | 'list' | 'compact';

export interface RenderHints {
  /** Layout mode to use for rendering */
  layout: LayoutMode;
  /** Field to sort cards by */
  sortBy?: string;
  /** Sort direction */
  sortDirection?: 'asc' | 'desc';
  /** Maximum cards to display (frontend can add "show more") */
  maxDisplay?: number;
  /** Whether to show images (if available) */
  showImages?: boolean;
  /** Group label override */
  groupLabel?: string;
}

export interface CardGroupRenderHints {
  [cardType: string]: RenderHints;
}

// =============================================================================
// COMPONENT REGISTRY
// =============================================================================

const COMPONENT_REGISTRY: Record<string, ComponentSchema> = {
  job: {
    cardType: 'job',
    displayName: 'Job Listing',
    layouts: ['grid', 'list', 'compact'],
    defaultLayout: 'grid',
    sortableFields: ['matchScore', 'title', 'company'],
    defaultSort: { field: 'matchScore', direction: 'desc' },
    defaultPageSize: 6,
    supportsImages: false,
    actionLinks: ['apply']
  },
  recipe: {
    cardType: 'recipe',
    displayName: 'Recipe',
    layouts: ['grid', 'list'],
    defaultLayout: 'grid',
    sortableFields: ['matchPercentage', 'title', 'servings'],
    defaultSort: { field: 'matchPercentage', direction: 'desc' },
    defaultPageSize: 4,
    supportsImages: true,
    actionLinks: ['viewRecipe', 'orderIngredients']
  },
  flight: {
    cardType: 'flight',
    displayName: 'Flight',
    layouts: ['list', 'compact'],
    defaultLayout: 'list',
    sortableFields: ['price', 'stops', 'departTime'],
    defaultSort: { field: 'price', direction: 'asc' },
    defaultPageSize: 5,
    supportsImages: false,
    actionLinks: ['book']
  },
  task: {
    cardType: 'task',
    displayName: 'Task',
    layouts: ['list', 'compact'],
    defaultLayout: 'list',
    sortableFields: ['priority', 'dueDate', 'title'],
    defaultSort: { field: 'priority', direction: 'desc' },
    defaultPageSize: 10,
    supportsImages: false,
    actionLinks: ['complete', 'edit']
  },
  product: {
    cardType: 'product',
    displayName: 'Product',
    layouts: ['grid', 'list'],
    defaultLayout: 'grid',
    sortableFields: ['price', 'name'],
    defaultSort: { field: 'price', direction: 'asc' },
    defaultPageSize: 6,
    supportsImages: true,
    actionLinks: ['viewDeal', 'addToCart']
  }
};

// =============================================================================
// PUBLIC API
// =============================================================================

/**
 * Get the component schema for a card type.
 */
export function getComponentSchema(cardType: string): ComponentSchema | undefined {
  return COMPONENT_REGISTRY[cardType];
}

/**
 * Get all registered component schemas.
 */
export function getAllComponentSchemas(): ComponentSchema[] {
  return Object.values(COMPONENT_REGISTRY);
}

/**
 * Build a capabilities prompt describing available UI components for LLM context.
 */
export function buildComponentKBPrompt(): string {
  let prompt = 'Available UI card components for rendering results:\n\n';

  for (const schema of Object.values(COMPONENT_REGISTRY)) {
    prompt += `- **${schema.displayName}** (${schema.cardType}): `;
    prompt += `layouts=[${schema.layouts.join(', ')}], `;
    prompt += `sort by [${schema.sortableFields.join(', ')}], `;
    prompt += `default: ${schema.defaultLayout} sorted by ${schema.defaultSort?.field || 'none'}\n`;
  }

  return prompt;
}

/**
 * Generate default render hints for a set of card types based on the registry.
 * Applies intelligent defaults: compact layout for large sets (>8), list for small (<=3), default otherwise.
 */
export function generateRenderHints(
  cardCounts: Record<string, number>
): CardGroupRenderHints {
  const hints: CardGroupRenderHints = {};

  for (const [cardType, count] of Object.entries(cardCounts)) {
    const schema = COMPONENT_REGISTRY[cardType];
    if (!schema) continue;

    // Pick layout based on count: compact for many, grid for moderate, list for few
    let layout: LayoutMode = schema.defaultLayout;
    if (count > 8 && schema.layouts.includes('compact')) {
      layout = 'compact';
    } else if (count <= 3 && schema.layouts.includes('list')) {
      layout = 'list';
    }

    hints[cardType] = {
      layout,
      sortBy: schema.defaultSort?.field,
      sortDirection: schema.defaultSort?.direction,
      maxDisplay: Math.min(count, schema.defaultPageSize),
      showImages: schema.supportsImages
    };
  }

  return hints;
}
