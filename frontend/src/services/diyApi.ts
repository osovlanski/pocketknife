/**
 * DIY Agent API Service
 */

import axios from 'axios';
import { getStoredEmail } from './authApi';
import { API_BASE_URL } from '../config';

const api = axios.create({ baseURL: API_BASE_URL });
api.interceptors.request.use((config) => {
  const email = getStoredEmail();
  if (email) {
    config.headers['X-User-Email'] = email;
  }
  return config;
});

// =============================================================================
// TYPES
// =============================================================================

export interface DIYMaterial {
  name: string;
  quantity: number;
  unit: string;
  estimatedPrice?: number;
  currency?: string;
  purchaseUrl?: string;
  alternatives?: string[];
  notes?: string;
}

export interface DIYTool {
  name: string;
  required: boolean;
  alternatives?: string[];
  rentalOption?: string;
  notes?: string;
}

export interface DIYStep {
  step: number;
  title: string;
  description: string;
  tips?: string[];
  warnings?: string[];
  imageUrl?: string;
  duration?: number;
}

export interface DIYProject {
  id?: string;
  title: string;
  description: string;
  category: string;
  difficulty: 'easy' | 'medium' | 'hard' | 'expert';
  estimatedTime: number;
  estimatedCost: {
    min: number;
    max: number;
    currency: string;
  };
  instructions: DIYStep[];
  materials: DIYMaterial[];
  tools: DIYTool[];
  tips: string[];
  warnings: string[];
  videoUrl?: string;
  sourceUrl?: string;
  status?: string;
  createdAt?: string;
}

export interface DIYIdea {
  id: string;
  title: string;
  description: string;
  category: string;
  difficulty: string;
  estimatedTime: number;
  estimatedCostMin?: number;
  estimatedCostMax?: number;
  popularity?: number;
  whyItsAwesome?: string;
  tags?: string[];
  source: string;
}

export interface DIYProjectRequest {
  description: string;
  category?: string;
  budget?: number;
  currency?: string;
  skillLevel?: 'beginner' | 'intermediate' | 'advanced';
  timeAvailable?: number;
  existingTools?: string[];
}

// =============================================================================
// API CALLS
// =============================================================================

/**
 * Generate DIY project instructions
 */
export const generateProject = async (request: DIYProjectRequest): Promise<{ project: DIYProject }> => {
  const response = await api.post('/diy/generate', request);
  return response.data;
};

/**
 * Get a specific project
 */
export const getProject = async (id: string): Promise<{ project: DIYProject }> => {
  const response = await api.get(`/diy/projects/${id}`);
  return response.data;
};

/**
 * Get user's projects
 */
export const getProjects = async (options?: {
  status?: string;
  category?: string;
  limit?: number;
}): Promise<{ projects: DIYProject[] }> => {
  const response = await api.get('/diy/projects', { params: options });
  return response.data;
};

/**
 * Save a project
 */
export const saveProject = async (project: DIYProject): Promise<{ project: DIYProject }> => {
  const response = await api.post('/diy/projects', { project });
  return response.data;
};

/**
 * Update project status
 */
export const updateProjectStatus = async (
  id: string,
  status: 'planning' | 'shopping' | 'in_progress' | 'completed' | 'paused' | 'abandoned',
  metadata?: {
    startedAt?: Date;
    completedAt?: Date;
    actualTime?: number;
    actualCost?: number;
  }
): Promise<{ success: boolean }> => {
  const response = await api.patch(`/diy/projects/${id}/status`, { status, ...metadata });
  return response.data;
};

/**
 * Add project feedback
 */
export const addFeedback = async (
  id: string,
  feedback: {
    rating: number;
    notes?: string;
    lessonsLearned?: string[];
  }
): Promise<{ success: boolean }> => {
  const response = await api.post(`/diy/projects/${id}/feedback`, feedback);
  return response.data;
};

/**
 * Get materials with purchase links
 */
export const getMaterialsWithLinks = async (
  materials: DIYMaterial[],
  location?: string
): Promise<{ materials: DIYMaterial[] }> => {
  const response = await api.post('/diy/materials/links', { materials, location });
  return response.data;
};

/**
 * Create shopping list from materials
 */
export const createShoppingList = async (
  projectId: string,
  materials: DIYMaterial[]
): Promise<{ shoppingListId: string }> => {
  const response = await api.post('/diy/shopping-list', { projectId, materials });
  return response.data;
};

/**
 * Search for DIY ideas
 */
export const searchIdeas = async (query: string): Promise<{ ideas: DIYIdea[] }> => {
  const response = await api.get('/diy/ideas', { params: { query } });
  return response.data;
};

/**
 * Get featured/trending DIY ideas with filters
 */
export const getFeaturedIdeas = async (options?: {
  category?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  skillLevel?: 'beginner' | 'intermediate' | 'advanced';
  timeAvailable?: number;
  count?: number;
}): Promise<{ ideas: DIYIdea[] }> => {
  const response = await api.get('/diy/ideas/featured', { params: options });
  return response.data;
};

/**
 * Get a random inspiration project
 */
export const getInspiration = async (options?: {
  skillLevel?: 'beginner' | 'intermediate' | 'advanced';
  excludeCategories?: string[];
}): Promise<{ inspiration: DIYIdea }> => {
  const response = await api.get('/diy/ideas/inspire', { 
    params: {
      ...options,
      excludeCategories: options?.excludeCategories?.join(',')
    }
  });
  return response.data;
};

/**
 * Get DIY templates
 */
export const getTemplates = async (category?: string): Promise<{ templates: DIYIdea[] }> => {
  const response = await api.get('/diy/templates', { params: { category } });
  return response.data;
};

/**
 * Get categories and difficulty info
 */
export const getCategories = async (): Promise<{
  categories: string[];
  difficultyInfo: Record<string, string>;
}> => {
  const response = await api.get('/diy/categories');
  return response.data;
};

// =============================================================================
// CONSTANTS
// =============================================================================

export const DIY_CATEGORIES = [
  { id: 'home_improvement', label: 'Home Improvement', icon: '🏠' },
  { id: 'electronics', label: 'Electronics', icon: '⚡' },
  { id: 'crafts', label: 'Crafts', icon: '🎨' },
  { id: 'automotive', label: 'Automotive', icon: '🚗' },
  { id: 'gardening', label: 'Gardening', icon: '🌱' },
  { id: 'furniture', label: 'Furniture', icon: '🪑' },
  { id: 'plumbing', label: 'Plumbing', icon: '🔧' },
  { id: 'electrical', label: 'Electrical', icon: '💡' },
  { id: 'painting', label: 'Painting', icon: '🎨' },
  { id: 'flooring', label: 'Flooring', icon: '🏗️' },
  { id: 'woodworking', label: 'Woodworking', icon: '🪵' },
  { id: 'metalworking', label: 'Metalworking', icon: '⚙️' },
  { id: 'sewing', label: 'Sewing', icon: '🧵' },
  { id: 'jewelry', label: 'Jewelry', icon: '💎' }
];

export const SKILL_LEVELS = [
  { id: 'beginner', label: 'Beginner', description: 'New to DIY, basic tools' },
  { id: 'intermediate', label: 'Intermediate', description: 'Some experience, standard tools' },
  { id: 'advanced', label: 'Advanced', description: 'Experienced, specialized tools' }
];

export const DIFFICULTY_COLORS: Record<string, string> = {
  easy: '#10B981',
  medium: '#F59E0B',
  hard: '#EF4444',
  expert: '#7C3AED'
};


