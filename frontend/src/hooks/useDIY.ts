/**
 * useDIY Hook
 * 
 * State management for DIY Agent functionality.
 */

import { useState, useEffect, useCallback } from 'react';
import * as diyApi from '../services/diyApi';
import logger from '../services/logger';
import type { 
  DIYProject, 
  DIYProjectRequest, 
  DIYIdea,
  DIYMaterial 
} from '../services/diyApi';

export interface UseDIYReturn {
  // State
  currentProject: DIYProject | null;
  projects: DIYProject[];
  ideas: DIYIdea[];
  featuredIdeas: DIYIdea[];
  inspiration: DIYIdea | null;
  templates: DIYIdea[];
  categories: string[];
  loading: boolean;
  generating: boolean;
  loadingFeatured: boolean;
  loadingInspiration: boolean;
  error: string | null;
  
  // Actions
  handleGenerate: (request: DIYProjectRequest) => Promise<DIYProject | null>;
  handleCancelGenerate: () => void;
  handleGetProject: (id: string) => Promise<void>;
  handleGetProjects: (options?: { status?: string; category?: string }) => Promise<void>;
  handleSaveProject: (project: DIYProject) => Promise<string | null>;
  handleUpdateStatus: (
    id: string, 
    status: 'planning' | 'shopping' | 'in_progress' | 'completed' | 'paused' | 'abandoned',
    metadata?: { actualTime?: number; actualCost?: number }
  ) => Promise<void>;
  handleAddFeedback: (id: string, rating: number, notes?: string) => Promise<void>;
  handleGetMaterialsLinks: (materials: DIYMaterial[], location?: string) => Promise<DIYMaterial[]>;
  handleCreateShoppingList: (projectId: string, materials: DIYMaterial[]) => Promise<string | null>;
  handleSearchIdeas: (query: string) => Promise<void>;
  handleGetFeaturedIdeas: (options?: {
    category?: string;
    difficulty?: 'easy' | 'medium' | 'hard';
    skillLevel?: 'beginner' | 'intermediate' | 'advanced';
    timeAvailable?: number;
  }) => Promise<void>;
  handleGetInspiration: (options?: {
    skillLevel?: 'beginner' | 'intermediate' | 'advanced';
  }) => Promise<void>;
  handleGetTemplates: (category?: string) => Promise<void>;
  setCurrentProject: (project: DIYProject | null) => void;
  clearError: () => void;
}

export const useDIY = (): UseDIYReturn => {
  // State
  const [currentProject, setCurrentProject] = useState<DIYProject | null>(null);
  const [projects, setProjects] = useState<DIYProject[]>([]);
  const [ideas, setIdeas] = useState<DIYIdea[]>([]);
  const [featuredIdeas, setFeaturedIdeas] = useState<DIYIdea[]>([]);
  const [inspiration, setInspiration] = useState<DIYIdea | null>(null);
  const [templates, setTemplates] = useState<DIYIdea[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generateCancelled, setGenerateCancelled] = useState(false);
  const [loadingFeatured, setLoadingFeatured] = useState(false);
  const [loadingInspiration, setLoadingInspiration] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load categories on mount
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const result = await diyApi.getCategories();
        setCategories(result.categories || []);
      } catch (err) {
        logger.error('Failed to load categories', { error: err });
      }
    };
    loadCategories();
  }, []);

  // Generate project
  const handleGenerate = useCallback(async (request: DIYProjectRequest): Promise<DIYProject | null> => {
    try {
      setGenerating(true);
      setGenerateCancelled(false);
      setError(null);
      const result = await diyApi.generateProject(request);
      
      // Check if cancelled during request
      if (generateCancelled) {
        return null;
      }
      
      const project = result.project;
      setCurrentProject(project);
      return project;
    } catch (err: any) {
      // Don't show error if cancelled
      if (!generateCancelled) {
        const errorMessage = err.response?.data?.error || err.message || 'Failed to generate project. Please try again.';
        setError(errorMessage);
        logger.error('Generate project failed', { error: err });
      }
      return null;
    } finally {
      setGenerating(false);
    }
  }, [generateCancelled]);

  // Cancel generation
  const handleCancelGenerate = useCallback(() => {
    setGenerateCancelled(true);
    setGenerating(false);
    setError(null);
  }, []);

  // Get specific project
  const handleGetProject = useCallback(async (id: string) => {
    try {
      setLoading(true);
      setError(null);
      const result = await diyApi.getProject(id);
      setCurrentProject(result.project);
    } catch (err: any) {
      setError(err.message || 'Failed to get project');
      logger.error('Get project failed', { error: err });
    } finally {
      setLoading(false);
    }
  }, []);

  // Get user's projects
  const handleGetProjects = useCallback(async (options?: { status?: string; category?: string }) => {
    try {
      setLoading(true);
      setError(null);
      const result = await diyApi.getProjects(options);
      setProjects(result.projects || []);
    } catch (err: any) {
      setError(err.message || 'Failed to get projects');
      logger.error('Get projects failed', { error: err });
    } finally {
      setLoading(false);
    }
  }, []);

  // Save project
  const handleSaveProject = useCallback(async (project: DIYProject): Promise<string | null> => {
    try {
      setLoading(true);
      const result = await diyApi.saveProject(project);
      // Refresh projects list
      const projectsResult = await diyApi.getProjects();
      setProjects(projectsResult.projects || []);
      return result.project?.id || null;
    } catch (err: any) {
      setError(err.message || 'Failed to save project');
      logger.error('Save project failed', { error: err });
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Update status
  const handleUpdateStatus = useCallback(async (
    id: string,
    status: 'planning' | 'shopping' | 'in_progress' | 'completed' | 'paused' | 'abandoned',
    metadata?: { actualTime?: number; actualCost?: number }
  ) => {
    try {
      await diyApi.updateProjectStatus(id, status, {
        ...(status === 'in_progress' ? { startedAt: new Date() } : {}),
        ...(status === 'completed' ? { completedAt: new Date() } : {}),
        ...metadata
      });
      // Refresh projects
      const result = await diyApi.getProjects();
      setProjects(result.projects || []);
    } catch (err: any) {
      setError(err.message || 'Failed to update status');
      logger.error('Update status failed', { error: err });
    }
  }, []);

  // Add feedback
  const handleAddFeedback = useCallback(async (id: string, rating: number, notes?: string) => {
    try {
      await diyApi.addFeedback(id, { rating, notes });
    } catch (err: any) {
      setError(err.message || 'Failed to add feedback');
      logger.error('Add feedback failed', { error: err });
    }
  }, []);

  // Get materials with links
  const handleGetMaterialsLinks = useCallback(async (
    materials: DIYMaterial[],
    location?: string
  ): Promise<DIYMaterial[]> => {
    try {
      setLoading(true);
      const result = await diyApi.getMaterialsWithLinks(materials, location);
      return result.materials || materials;
    } catch (err: any) {
      logger.error('Get materials links failed', { error: err });
      return materials;
    } finally {
      setLoading(false);
    }
  }, []);

  // Create shopping list
  const handleCreateShoppingList = useCallback(async (
    projectId: string,
    materials: DIYMaterial[]
  ): Promise<string | null> => {
    try {
      const result = await diyApi.createShoppingList(projectId, materials);
      return result.shoppingListId;
    } catch (err: any) {
      setError(err.message || 'Failed to create shopping list');
      logger.error('Create shopping list failed', { error: err });
      return null;
    }
  }, []);

  // Search ideas
  const handleSearchIdeas = useCallback(async (query: string) => {
    try {
      setLoading(true);
      const result = await diyApi.searchIdeas(query);
      setIdeas(result.ideas || []);
    } catch (err: any) {
      logger.error('Search ideas failed', { error: err });
    } finally {
      setLoading(false);
    }
  }, []);

  // Get featured ideas
  const handleGetFeaturedIdeas = useCallback(async (options?: {
    category?: string;
    difficulty?: 'easy' | 'medium' | 'hard';
    skillLevel?: 'beginner' | 'intermediate' | 'advanced';
    timeAvailable?: number;
  }) => {
    try {
      setLoadingFeatured(true);
      setError(null);
      const result = await diyApi.getFeaturedIdeas(options);
      setFeaturedIdeas(result.ideas || []);
    } catch (err: any) {
      logger.error('Get featured ideas failed', { error: err });
      setError(err.message || 'Failed to load featured ideas');
    } finally {
      setLoadingFeatured(false);
    }
  }, []);

  // Get random inspiration
  const handleGetInspiration = useCallback(async (options?: {
    skillLevel?: 'beginner' | 'intermediate' | 'advanced';
  }) => {
    try {
      setLoadingInspiration(true);
      setError(null);
      const result = await diyApi.getInspiration(options);
      setInspiration(result.inspiration || null);
    } catch (err: any) {
      logger.error('Get inspiration failed', { error: err });
      setError(err.message || 'Failed to get inspiration');
    } finally {
      setLoadingInspiration(false);
    }
  }, []);

  // Get templates
  const handleGetTemplates = useCallback(async (category?: string) => {
    try {
      setLoading(true);
      const result = await diyApi.getTemplates(category);
      setTemplates(result.templates || []);
    } catch (err: any) {
      logger.error('Get templates failed', { error: err });
    } finally {
      setLoading(false);
    }
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    currentProject,
    projects,
    ideas,
    featuredIdeas,
    inspiration,
    templates,
    categories,
    loading,
    generating,
    loadingFeatured,
    loadingInspiration,
    error,
    handleGenerate,
    handleCancelGenerate,
    handleGetProject,
    handleGetProjects,
    handleSaveProject,
    handleUpdateStatus,
    handleAddFeedback,
    handleGetMaterialsLinks,
    handleCreateShoppingList,
    handleSearchIdeas,
    handleGetFeaturedIdeas,
    handleGetInspiration,
    handleGetTemplates,
    setCurrentProject,
    clearError
  };
};

export default useDIY;


