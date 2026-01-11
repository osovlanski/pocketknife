/**
 * DIY Agent
 * 
 * AI-powered DIY project generator that provides:
 * - Step-by-step instructions for any DIY task
 * - Materials and tools lists with purchase links
 * - Integration with Shopping Agent for material purchasing
 * - Project tracking and completion feedback
 * - Templates and inspiration for common projects
 */

import { AbstractAgent } from './AbstractAgent';
import { AgentMetadata, AgentResult, AgentParams } from './types';
import { diyService, DIYProject, DIYProjectRequest, DIYMaterial } from '../services/diy';
import { configService } from '../services/core/configService';

// =============================================================================
// TYPES
// =============================================================================

interface DIYAgentParams extends AgentParams {
  action: 
    | 'generate'
    | 'get-project'
    | 'get-projects'
    | 'save-project'
    | 'update-status'
    | 'get-materials-links'
    | 'create-shopping-list'
    | 'search-ideas'
    | 'get-templates'
    | 'add-feedback'
    | 'get-categories'
    | 'get-featured-ideas'
    | 'get-inspiration';
  
  // Generate params
  description?: string;
  category?: string;
  budget?: number;
  currency?: string;
  skillLevel?: 'beginner' | 'intermediate' | 'advanced';
  timeAvailable?: number;
  existingTools?: string[];
  
  // Project params
  projectId?: string;
  project?: DIYProject;
  
  // Status params
  status?: 'planning' | 'shopping' | 'in_progress' | 'completed' | 'paused' | 'abandoned';
  startedAt?: Date;
  completedAt?: Date;
  actualTime?: number;
  actualCost?: number;
  
  // Materials params
  materials?: DIYMaterial[];
  location?: string;
  
  // Search params
  query?: string;
  
  // Feedback params
  rating?: number;
  notes?: string;
  lessonsLearned?: string[];
  
  // Filters
  limit?: number;
  count?: number;
  
  // Featured ideas params
  difficulty?: 'easy' | 'medium' | 'hard';
  excludeCategories?: string[];
}

interface DIYAgentResult {
  project?: DIYProject;
  projects?: any[];
  materials?: DIYMaterial[];
  shoppingListId?: string;
  ideas?: any[];
  templates?: any[];
  categories?: string[];
  difficultyInfo?: Record<string, string>;
  success?: boolean;
  inspiration?: any;
}

// =============================================================================
// DIY AGENT
// =============================================================================

export class DIYAgent extends AbstractAgent {
  readonly metadata: AgentMetadata = {
    id: 'diy',
    name: 'DIY Agent',
    description: 'AI-powered DIY project generator with step-by-step instructions and shopping integration',
    icon: '🔧',
    color: '#F59E0B' // Amber
  };

  protected async run(params: DIYAgentParams): Promise<AgentResult<DIYAgentResult>> {
    const { action } = params;

    switch (action) {
      case 'generate':
        return this.generateProject(params);
      case 'get-project':
        return this.getProject(params);
      case 'get-projects':
        return this.getProjects(params);
      case 'save-project':
        return this.saveProject(params);
      case 'update-status':
        return this.updateStatus(params);
      case 'get-materials-links':
        return this.getMaterialsWithLinks(params);
      case 'create-shopping-list':
        return this.createShoppingList(params);
      case 'search-ideas':
        return this.searchIdeas(params);
      case 'get-featured-ideas':
        return this.getFeaturedIdeas(params);
      case 'get-inspiration':
        return this.getInspiration(params);
      case 'get-templates':
        return this.getTemplates(params);
      case 'add-feedback':
        return this.addFeedback(params);
      case 'get-categories':
        return this.getCategories();
      default:
        return { success: false, error: `Unknown action: ${action}` };
    }
  }

  /**
   * Generate a DIY project with AI
   */
  private async generateProject(params: DIYAgentParams): Promise<AgentResult<DIYAgentResult>> {
    const { description, category, budget, currency, skillLevel, timeAvailable, existingTools, userId } = params;

    if (!description) {
      return { success: false, error: 'Project description is required' };
    }

    this.emitLog(`🔧 Generating DIY instructions for: "${description}"`, 'info');
    this.emitProgress(10);

    try {
      const request: DIYProjectRequest = {
        description,
        category,
        budget,
        currency,
        skillLevel,
        timeAvailable,
        existingTools
      };

      this.emitProgress(30);
      this.emitLog('🤖 AI is creating detailed instructions...', 'info');

      const project = await diyService.generateProject(request);

      this.emitProgress(80);
      this.emitLog(`📝 Generated ${project.instructions.length} step instructions`, 'info');
      this.emitLog(`🛠️ Required tools: ${project.tools.length}, Materials: ${project.materials.length}`, 'info');

      this.emitProgress(100);
      this.emitLog('✅ DIY project generated successfully', 'success');

      // Log activity
      await this.saveUserActivity(userId, 'generate', {
        description: description.slice(0, 100),
        category: project.category,
        difficulty: project.difficulty
      });

      return {
        success: true,
        data: { project }
      };
    } catch (error: any) {
      this.emitLog(`❌ Failed to generate project: ${error.message}`, 'error');
      return { success: false, error: error.message };
    }
  }

  /**
   * Get a specific project
   */
  private async getProject(params: DIYAgentParams): Promise<AgentResult<DIYAgentResult>> {
    const { projectId } = params;

    if (!projectId) {
      return { success: false, error: 'Project ID is required' };
    }

    try {
      const project = await diyService.getProject(projectId);
      
      if (!project) {
        return { success: false, error: 'Project not found' };
      }

      return {
        success: true,
        data: { project }
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get user's projects
   */
  private async getProjects(params: DIYAgentParams): Promise<AgentResult<DIYAgentResult>> {
    const { userId, status, category, limit = 20 } = params;

    if (!userId) {
      return { success: false, error: 'User ID is required' };
    }

    try {
      const projects = await diyService.getUserProjects(userId, { status, category, limit });

      return {
        success: true,
        data: { projects }
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Save a project to user's collection
   */
  private async saveProject(params: DIYAgentParams): Promise<AgentResult<DIYAgentResult>> {
    const { userId, project } = params;

    if (!userId) {
      return { success: false, error: 'User ID is required' };
    }
    if (!project) {
      return { success: false, error: 'Project data is required' };
    }

    this.emitLog(`💾 Saving project: ${project.title}`, 'info');

    try {
      const projectId = await diyService.saveProject(userId, project);

      this.emitLog('✅ Project saved', 'success');

      return {
        success: true,
        data: { project: { ...project, id: projectId }, success: true }
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Update project status
   */
  private async updateStatus(params: DIYAgentParams): Promise<AgentResult<DIYAgentResult>> {
    const { projectId, status, startedAt, completedAt, actualTime, actualCost } = params;

    if (!projectId) {
      return { success: false, error: 'Project ID is required' };
    }
    if (!status) {
      return { success: false, error: 'Status is required' };
    }

    this.emitLog(`📊 Updating project status to: ${status}`, 'info');

    try {
      await diyService.updateProjectStatus(projectId, status, {
        startedAt,
        completedAt,
        actualTime,
        actualCost
      });

      this.emitLog('✅ Status updated', 'success');

      return {
        success: true,
        data: { success: true }
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get materials with purchase links from Shopping Agent
   */
  private async getMaterialsWithLinks(params: DIYAgentParams): Promise<AgentResult<DIYAgentResult>> {
    const { materials, location } = params;

    if (!materials || materials.length === 0) {
      return { success: false, error: 'Materials list is required' };
    }

    this.emitLog(`🛒 Finding purchase links for ${materials.length} materials...`, 'info');
    this.emitProgress(10);

    try {
      const materialsWithLinks = await diyService.getMaterialsWithPurchaseLinks(materials, location);

      this.emitProgress(100);
      this.emitLog('✅ Purchase links added', 'success');

      return {
        success: true,
        data: { materials: materialsWithLinks }
      };
    } catch (error: any) {
      this.emitLog(`❌ Failed to get purchase links: ${error.message}`, 'error');
      return { success: false, error: error.message };
    }
  }

  /**
   * Create a shopping list from project materials
   */
  private async createShoppingList(params: DIYAgentParams): Promise<AgentResult<DIYAgentResult>> {
    const { userId, projectId, materials } = params;

    if (!userId) {
      return { success: false, error: 'User ID is required' };
    }
    if (!projectId) {
      return { success: false, error: 'Project ID is required' };
    }
    if (!materials || materials.length === 0) {
      return { success: false, error: 'Materials list is required' };
    }

    this.emitLog('📋 Creating shopping list for project materials...', 'info');

    try {
      const shoppingListId = await diyService.createShoppingList(userId, projectId, materials);

      if (!shoppingListId) {
        return { success: false, error: 'Failed to create shopping list' };
      }

      this.emitLog('✅ Shopping list created', 'success');

      return {
        success: true,
        data: { shoppingListId, success: true }
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Search for DIY project ideas
   */
  private async searchIdeas(params: DIYAgentParams): Promise<AgentResult<DIYAgentResult>> {
    const { query } = params;

    if (!query) {
      return { success: false, error: 'Search query is required' };
    }

    this.emitLog(`💡 Searching for DIY ideas: "${query}"`, 'info');
    this.emitProgress(20);

    try {
      const ideas = await diyService.searchDIYIdeas(query);

      this.emitProgress(100);
      this.emitLog(`✅ Found ${ideas.length} project ideas`, 'success');

      return {
        success: true,
        data: { ideas }
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get DIY templates by category
   */
  private async getTemplates(params: DIYAgentParams): Promise<AgentResult<DIYAgentResult>> {
    const { category } = params;

    try {
      const templates = await diyService.getTemplates(category);

      return {
        success: true,
        data: { templates }
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Add project completion feedback
   */
  private async addFeedback(params: DIYAgentParams): Promise<AgentResult<DIYAgentResult>> {
    const { projectId, rating, notes, lessonsLearned } = params;

    if (!projectId) {
      return { success: false, error: 'Project ID is required' };
    }
    if (!rating) {
      return { success: false, error: 'Rating is required' };
    }

    try {
      await diyService.addProjectFeedback(projectId, {
        rating,
        notes,
        lessonsLearned
      });

      this.emitLog('✅ Feedback recorded', 'success');

      return {
        success: true,
        data: { success: true }
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get available categories and difficulty info
   */
  private async getCategories(): Promise<AgentResult<DIYAgentResult>> {
    return {
      success: true,
      data: {
        categories: diyService.getCategories(),
        difficultyInfo: diyService.getDifficultyInfo()
      }
    };
  }

  /**
   * Get featured/trending DIY ideas with smart filtering
   */
  private async getFeaturedIdeas(params: DIYAgentParams): Promise<AgentResult<DIYAgentResult>> {
    const { category, difficulty, skillLevel, timeAvailable, count } = params;

    this.emitLog('✨ Fetching featured DIY ideas...', 'info');
    this.emitProgress(20);

    try {
      const ideas = await diyService.getFeaturedIdeas({
        category,
        difficulty,
        skillLevel,
        timeAvailable,
        count
      });

      this.emitProgress(100);
      this.emitLog(`✅ Found ${ideas.length} featured ideas`, 'success');

      return {
        success: true,
        data: { ideas }
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get a random inspiration project
   */
  private async getInspiration(params: DIYAgentParams): Promise<AgentResult<DIYAgentResult>> {
    const { skillLevel, excludeCategories } = params;

    this.emitLog('🎲 Finding something inspiring for you...', 'info');
    this.emitProgress(30);

    try {
      const inspiration = await diyService.getRandomInspiration({
        skillLevel,
        excludeCategories
      });

      this.emitProgress(100);

      if (!inspiration) {
        return { success: false, error: 'Could not generate inspiration' };
      }

      this.emitLog('💡 Found something awesome!', 'success');

      return {
        success: true,
        data: { inspiration }
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
}

// Export singleton instance
export const diyAgent = new DIYAgent();
export default diyAgent;


