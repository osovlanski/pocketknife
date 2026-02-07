/**
 * Cooking Agent Manifest
 *
 * Self-describing metadata for the Cooking Agent including identity,
 * trigger keywords, capabilities, and classification.
 */

import type { AgentMetadata } from '../types';

export const cookingManifest: AgentMetadata = {
  id: 'cooking',
  name: 'Cooking Agent',
  description: 'Manage kitchen inventory, find recipes, and track shopping lists',
  icon: '🍳',
  color: '#22C55E',
  agentType: 'deep',
  keywords: [
    '#recipe', '#cooking', '#food', '#ingredient', '#meal', '#kitchen',
    '#grocery', '#groceries', '#order', '#shopping', '#cart',
    '#ramilevy', '#rami-levy', 'רמי לוי'
  ],
  capabilities: [
    {
      action: 'find-recipes',
      description: 'Search for recipes based on ingredients, cuisine, or dietary preferences',
      parameters: [
        { name: 'query', type: 'string', required: false, description: 'Recipe search query', example: 'pasta' },
        { name: 'cuisine', type: 'string', required: false, description: 'Cuisine type', example: 'italian' },
        { name: 'useAvailableOnly', type: 'boolean', required: false, description: 'Only use ingredients from inventory' },
        { name: 'ingredients', type: 'array', required: false, description: 'Specific ingredients to use' }
      ],
      examples: ['Find me a pasta recipe', 'What can I cook with chicken and rice?']
    },
    {
      action: 'get-items',
      description: 'Get inventory items from the kitchen',
      parameters: [
        { name: 'category', type: 'string', required: false, description: 'Filter by category' }
      ],
      examples: ['What do I have in my kitchen?', 'Show me my dairy products']
    },
    {
      action: 'add-item',
      description: 'Add an item to the kitchen inventory',
      parameters: [
        { name: 'name', type: 'string', required: true, description: 'Item name', example: 'Milk' },
        { name: 'quantity', type: 'number', required: false, description: 'Quantity', example: 2 },
        { name: 'category', type: 'string', required: false, description: 'Category', example: 'dairy' }
      ],
      examples: ['Add milk to my inventory', 'I bought 2 dozen eggs']
    },
    {
      action: 'create-list',
      description: 'Create a new shopping list',
      parameters: [
        { name: 'listName', type: 'string', required: true, description: 'Name for the list', example: 'Weekly groceries' }
      ],
      examples: ['Create a shopping list for the weekend']
    },
    {
      action: 'add-list-item',
      description: 'Add an item to a shopping list',
      parameters: [
        { name: 'listId', type: 'string', required: true, description: 'Shopping list ID' },
        { name: 'name', type: 'string', required: true, description: 'Item name' },
        { name: 'quantity', type: 'number', required: false, description: 'Quantity' }
      ],
      examples: ['Add bread to my shopping list']
    },
    {
      action: 'create-recipe-order',
      description: 'Create a delivery order for recipe ingredients',
      parameters: [
        { name: 'spoonacularRecipeId', type: 'number', required: true, description: 'Recipe ID from Spoonacular' },
        { name: 'checkInventory', type: 'boolean', required: false, description: 'Check inventory for existing items' }
      ],
      examples: ['Order ingredients for this recipe']
    },
    {
      action: 'order-groceries',
      description: 'Order groceries from various stores with deep links. Gathers items from low stock, suggestions, and shopping lists.',
      parameters: [
        { name: 'preferredStores', type: 'array', required: false, description: 'Preferred store IDs (wolt, shufersal, rami-levy, victory, yochananof)' },
        { name: 'groceryItems', type: 'array', required: false, description: 'Specific items to order with name and quantity' }
      ],
      examples: ['Order my groceries', 'Buy groceries from Shufersal', 'I need to order eggs, milk, and bread']
    },
    {
      action: 'order-shopping-list',
      description: 'Order items from a specific shopping list via grocery store deep links',
      parameters: [
        { name: 'listId', type: 'string', required: true, description: 'Shopping list ID to order from' },
        { name: 'preferredStores', type: 'array', required: false, description: 'Preferred store IDs' }
      ],
      examples: ['Order items from my shopping list', 'Buy everything on my weekly groceries list']
    },
    {
      action: 'get-grocery-stores',
      description: 'Get list of available grocery stores for ordering',
      parameters: [],
      examples: ['What grocery stores are available?', 'Show me where I can order groceries']
    },
    {
      action: 'rami-levy-setup',
      description: 'Configure Rami Levy credentials for grocery ordering',
      parameters: [
        { name: 'apiKey', type: 'string', required: true, description: 'Authorization Bearer token from Rami Levy request headers' },
        { name: 'cookie', type: 'string', required: true, description: 'Cookie header value from Rami Levy request' },
        { name: 'ecomToken', type: 'string', required: false, description: 'Ecom token from login response (optional)' },
        { name: 'storeId', type: 'string', required: false, description: 'Preferred store ID (default: 331)' }
      ],
      examples: ['Setup my Rami Levy credentials', 'Configure Rami Levy with my API key and cookie']
    },
    {
      action: 'rami-levy-search',
      description: 'Search for products in Rami Levy grocery store',
      parameters: [
        { name: 'query', type: 'string', required: true, description: 'Product search query', example: 'חלב' },
        { name: 'limit', type: 'number', required: false, description: 'Maximum results to return (default: 20)' }
      ],
      examples: ['Search for milk in Rami Levy', 'Find חלב at Rami Levy']
    },
    {
      action: 'rami-levy-add-to-cart',
      description: 'Add a product to the Rami Levy shopping cart',
      parameters: [
        { name: 'productId', type: 'string', required: true, description: 'Product ID from search results' },
        { name: 'quantity', type: 'number', required: false, description: 'Quantity to add (default: 1)' }
      ],
      examples: ['Add this to my Rami Levy cart', 'Add 2 of this product to cart']
    },
    {
      action: 'rami-levy-get-cart',
      description: 'Get current Rami Levy shopping cart contents',
      parameters: [],
      examples: ['Show my Rami Levy cart', "What's in my Rami Levy cart?"]
    },
    {
      action: 'rami-levy-checkout',
      description: 'Get checkout link for Rami Levy cart',
      parameters: [],
      examples: ['Checkout my Rami Levy cart', 'Get Rami Levy checkout link']
    },
    {
      action: 'rami-levy-status',
      description: 'Check if Rami Levy integration is configured for the user',
      parameters: [],
      examples: ['Is Rami Levy configured?', 'Check Rami Levy status']
    }
  ]
};
