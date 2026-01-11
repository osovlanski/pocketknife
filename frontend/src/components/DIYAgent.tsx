/**
 * DIY Agent Component
 * 
 * AI-powered DIY project generator with step-by-step instructions.
 * Features project generation, materials lists, and shopping integration.
 */

import React, { useState, useCallback } from 'react';
import { 
  Wrench, Search, Lightbulb, FolderOpen, ShoppingCart,
  Loader2, ChevronDown, ChevronUp, AlertTriangle, Check,
  Clock, DollarSign, Star, ExternalLink, Play, Pause
} from 'lucide-react';
import useDIY from '../hooks/useDIY';
import { DIY_CATEGORIES, SKILL_LEVELS, DIFFICULTY_COLORS, DIYProject, DIYStep } from '../services/diyApi';
import MarkdownRenderer from './MarkdownRenderer';
import styles from '../styles/diy.module.css';

// =============================================================================
// SUBCOMPONENTS
// =============================================================================

interface StepCardProps {
  step: DIYStep;
  isExpanded: boolean;
  isCompleted: boolean;
  onToggle: () => void;
  onComplete: () => void;
}

const StepCard: React.FC<StepCardProps> = ({ 
  step, isExpanded, isCompleted, onToggle, onComplete 
}) => (
  <div className={`${styles.stepCard} ${isCompleted ? styles.completed : ''}`}>
    <div 
      className={styles.stepHeader}
      onClick={onToggle}
      onKeyDown={(e) => e.key === 'Enter' && onToggle()}
      tabIndex={0}
      role="button"
      aria-expanded={isExpanded}
    >
      <div className={styles.stepNumber}>
        {isCompleted ? <Check className="w-4 h-4" /> : step.step}
      </div>
      <div className={styles.stepTitle}>
        <h4>{step.title}</h4>
        {step.duration && (
          <span className={styles.stepDuration}>
            <Clock className="w-3 h-3" />
            {step.duration} min
          </span>
        )}
      </div>
      {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
    </div>
    
    {isExpanded && (
      <div className={styles.stepContent}>
        <MarkdownRenderer content={step.description} />
        
        {step.tips && step.tips.length > 0 && (
          <div className={styles.stepTips}>
            <h5>💡 Tips</h5>
            <ul>
              {step.tips.map((tip, i) => (
                <li key={i}>{tip}</li>
              ))}
            </ul>
          </div>
        )}
        
        {step.warnings && step.warnings.length > 0 && (
          <div className={styles.stepWarnings}>
            <h5>⚠️ Warnings</h5>
            <ul>
              {step.warnings.map((warning, i) => (
                <li key={i}>{warning}</li>
              ))}
            </ul>
          </div>
        )}
        
        <button onClick={onComplete} className={styles.completeButton}>
          {isCompleted ? 'Mark Incomplete' : 'Mark Complete'}
        </button>
      </div>
    )}
  </div>
);

// =============================================================================
// MAIN COMPONENT
// =============================================================================

const DIYAgent: React.FC = () => {
  // Hooks
  const diy = useDIY();

  // Local state
  const [activeTab, setActiveTab] = useState<'generate' | 'projects' | 'ideas'>('generate');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [skillLevel, setSkillLevel] = useState<'beginner' | 'intermediate' | 'advanced'>('intermediate');
  const [budget, setBudget] = useState<number | undefined>();
  const [timeAvailable, setTimeAvailable] = useState<number | undefined>();
  const [expandedSteps, setExpandedSteps] = useState<Set<number>>(new Set([1]));
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [ideaQuery, setIdeaQuery] = useState('');

  // Handlers
  const handleGenerate = useCallback(async () => {
    if (!description.trim()) return;
    
    await diy.handleGenerate({
      description,
      category: category || undefined,
      skillLevel,
      budget,
      timeAvailable,
      currency: 'USD'
    });
    
    // Reset step states for new project
    setExpandedSteps(new Set([1]));
    setCompletedSteps(new Set());
  }, [diy, description, category, skillLevel, budget, timeAvailable]);

  const handleToggleStep = (stepNum: number) => {
    setExpandedSteps(prev => {
      const next = new Set(prev);
      if (next.has(stepNum)) {
        next.delete(stepNum);
      } else {
        next.add(stepNum);
      }
      return next;
    });
  };

  const handleCompleteStep = (stepNum: number) => {
    setCompletedSteps(prev => {
      const next = new Set(prev);
      if (next.has(stepNum)) {
        next.delete(stepNum);
      } else {
        next.add(stepNum);
        // Auto-expand next step
        if (!expandedSteps.has(stepNum + 1)) {
          setExpandedSteps(p => new Set([...p, stepNum + 1]));
        }
      }
      return next;
    });
  };

  const handleSaveProject = useCallback(async () => {
    if (!diy.currentProject) return;
    await diy.handleSaveProject(diy.currentProject);
  }, [diy]);

  const handleSearchIdeas = useCallback(async () => {
    if (!ideaQuery.trim()) return;
    await diy.handleSearchIdeas(ideaQuery);
  }, [diy, ideaQuery]);

  const handleSelectIdea = useCallback((idea: any) => {
    setDescription(idea.description || idea.title);
    setCategory(idea.category);
    setActiveTab('generate');
  }, []);

  // Render tab content
  const renderTabContent = () => {
    switch (activeTab) {
      case 'generate':
        return (
          <div className={styles.generateContainer}>
            {/* Input Form */}
            <div className={styles.inputForm}>
              <div className={styles.inputGroup}>
                <label htmlFor="description">What do you want to make or fix?</label>
                <textarea
                  id="description"
                  placeholder="e.g., Build a floating shelf for my living room, Fix a leaky faucet, Create a custom phone stand..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className={styles.descriptionInput}
                  rows={3}
                />
              </div>

              <div className={styles.optionsRow}>
                <div className={styles.inputGroup}>
                  <label htmlFor="category">Category</label>
                  <select
                    id="category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className={styles.selectInput}
                  >
                    <option value="">Auto-detect</option>
                    {DIY_CATEGORIES.map(cat => (
                      <option key={cat.id} value={cat.id}>
                        {cat.icon} {cat.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.inputGroup}>
                  <label htmlFor="skillLevel">Skill Level</label>
                  <select
                    id="skillLevel"
                    value={skillLevel}
                    onChange={(e) => setSkillLevel(e.target.value as any)}
                    className={styles.selectInput}
                  >
                    {SKILL_LEVELS.map(level => (
                      <option key={level.id} value={level.id}>
                        {level.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.inputGroup}>
                  <label htmlFor="budget">Budget (USD)</label>
                  <input
                    id="budget"
                    type="number"
                    placeholder="Optional"
                    value={budget || ''}
                    onChange={(e) => setBudget(e.target.value ? Number(e.target.value) : undefined)}
                    className={styles.numberInput}
                  />
                </div>

                <div className={styles.inputGroup}>
                  <label htmlFor="time">Time Available (hours)</label>
                  <input
                    id="time"
                    type="number"
                    placeholder="Optional"
                    value={timeAvailable || ''}
                    onChange={(e) => setTimeAvailable(e.target.value ? Number(e.target.value) : undefined)}
                    className={styles.numberInput}
                  />
                </div>
              </div>

              <button
                onClick={handleGenerate}
                disabled={!description.trim() || diy.generating}
                className={styles.generateButton}
              >
                {diy.generating ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Generating Instructions...
                  </>
                ) : (
                  <>
                    <Wrench className="w-5 h-5" />
                    Generate DIY Instructions
                  </>
                )}
              </button>
            </div>

            {/* Generated Project */}
            {diy.currentProject && (
              <div className={styles.projectDisplay}>
                {/* Project Header */}
                <div className={styles.projectHeader}>
                  <div>
                    <h2>{diy.currentProject.title}</h2>
                    <p>{diy.currentProject.description}</p>
                  </div>
                  <button onClick={handleSaveProject} className={styles.saveButton}>
                    Save Project
                  </button>
                </div>

                {/* Project Stats */}
                <div className={styles.projectStats}>
                  <div className={styles.stat}>
                    <span 
                      className={styles.difficultyBadge}
                      style={{ background: DIFFICULTY_COLORS[diy.currentProject.difficulty] }}
                    >
                      {diy.currentProject.difficulty}
                    </span>
                  </div>
                  <div className={styles.stat}>
                    <Clock className="w-4 h-4" />
                    <span>{formatDuration(diy.currentProject.estimatedTime)}</span>
                  </div>
                  <div className={styles.stat}>
                    <DollarSign className="w-4 h-4" />
                    <span>
                      ${diy.currentProject.estimatedCost.min} - ${diy.currentProject.estimatedCost.max}
                    </span>
                  </div>
                  <div className={styles.stat}>
                    <span className={styles.categoryBadge}>
                      {DIY_CATEGORIES.find(c => c.id === diy.currentProject?.category)?.icon || '📦'} 
                      {' '}
                      {diy.currentProject.category}
                    </span>
                  </div>
                </div>

                {/* Warnings */}
                {diy.currentProject.warnings && diy.currentProject.warnings.length > 0 && (
                  <div className={styles.warningsSection}>
                    <h3><AlertTriangle className="w-5 h-5" /> Safety Warnings</h3>
                    <ul>
                      {diy.currentProject.warnings.map((warning, i) => (
                        <li key={i}>{warning}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Materials */}
                <div className={styles.materialsSection}>
                  <h3><ShoppingCart className="w-5 h-5" /> Materials Needed</h3>
                  <div className={styles.materialsList}>
                    {diy.currentProject.materials.map((material, i) => (
                      <div key={i} className={styles.materialItem}>
                        <span className={styles.materialName}>
                          {material.quantity} {material.unit} {material.name}
                        </span>
                        {material.estimatedPrice && (
                          <span className={styles.materialPrice}>
                            ~${material.estimatedPrice}
                          </span>
                        )}
                        {material.purchaseUrl && (
                          <a 
                            href={material.purchaseUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className={styles.purchaseLink}
                          >
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Tools */}
                <div className={styles.toolsSection}>
                  <h3><Wrench className="w-5 h-5" /> Tools Required</h3>
                  <div className={styles.toolsList}>
                    {diy.currentProject.tools.map((tool, i) => (
                      <div key={i} className={`${styles.toolItem} ${tool.required ? styles.required : ''}`}>
                        <span>{tool.name}</span>
                        {!tool.required && <span className={styles.optional}>(optional)</span>}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Steps */}
                <div className={styles.stepsSection}>
                  <h3>
                    <Play className="w-5 h-5" /> 
                    Step-by-Step Instructions
                    <span className={styles.progressBadge}>
                      {completedSteps.size}/{diy.currentProject.instructions.length} completed
                    </span>
                  </h3>
                  <div className={styles.stepsList}>
                    {diy.currentProject.instructions.map((step) => (
                      <StepCard
                        key={step.step}
                        step={step}
                        isExpanded={expandedSteps.has(step.step)}
                        isCompleted={completedSteps.has(step.step)}
                        onToggle={() => handleToggleStep(step.step)}
                        onComplete={() => handleCompleteStep(step.step)}
                      />
                    ))}
                  </div>
                </div>

                {/* Tips */}
                {diy.currentProject.tips && diy.currentProject.tips.length > 0 && (
                  <div className={styles.tipsSection}>
                    <h3>💡 Pro Tips</h3>
                    <ul>
                      {diy.currentProject.tips.map((tip, i) => (
                        <li key={i}>{tip}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        );

      case 'projects':
        return (
          <div className={styles.projectsContainer}>
            <h3>Your Projects</h3>
            {diy.projects.length === 0 ? (
              <div className={styles.emptyState}>
                <FolderOpen className="w-12 h-12" />
                <h4>No saved projects</h4>
                <p>Generate a project and save it to see it here.</p>
              </div>
            ) : (
              <div className={styles.projectsGrid}>
                {diy.projects.map(project => (
                  <div 
                    key={project.id} 
                    className={styles.projectCard}
                    onClick={() => diy.setCurrentProject(project)}
                  >
                    <h4>{project.title}</h4>
                    <div className={styles.projectCardMeta}>
                      <span 
                        className={styles.difficultyBadge}
                        style={{ background: DIFFICULTY_COLORS[project.difficulty] }}
                      >
                        {project.difficulty}
                      </span>
                      <span className={styles.statusBadge}>{project.status}</span>
                    </div>
                    <p>{project.description?.slice(0, 100)}...</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      case 'ideas':
        return (
          <div className={styles.ideasContainer}>
            <div className={styles.searchBox}>
              <Search className="w-5 h-5" />
              <input
                type="text"
                placeholder="Search for DIY ideas..."
                value={ideaQuery}
                onChange={(e) => setIdeaQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearchIdeas()}
                className={styles.searchInput}
              />
              <button onClick={handleSearchIdeas} className={styles.searchButton}>
                Search
              </button>
            </div>

            <h4>Categories</h4>
            <div className={styles.categoriesGrid}>
              {DIY_CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => {
                    setCategory(cat.id);
                    setActiveTab('generate');
                  }}
                  className={styles.categoryCard}
                >
                  <span className={styles.categoryIcon}>{cat.icon}</span>
                  <span>{cat.label}</span>
                </button>
              ))}
            </div>

            {diy.ideas.length > 0 && (
              <>
                <h4>Search Results</h4>
                <div className={styles.ideasGrid}>
                  {diy.ideas.map(idea => (
                    <div 
                      key={idea.id} 
                      className={styles.ideaCard}
                      onClick={() => handleSelectIdea(idea)}
                    >
                      <h5>{idea.title}</h5>
                      <p>{idea.description}</p>
                      <div className={styles.ideaMeta}>
                        <span>{idea.difficulty}</span>
                        <span>{formatDuration(idea.estimatedTime)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        );
    }
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.titleSection}>
          <h1>🔧 DIY Agent</h1>
          <p>AI-powered DIY instructions - just tell me what you want to make!</p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <nav className={styles.tabs}>
        {[
          { id: 'generate', label: 'Generate', icon: Wrench },
          { id: 'projects', label: 'My Projects', icon: FolderOpen },
          { id: 'ideas', label: 'Get Ideas', icon: Lightbulb }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id as any);
              if (tab.id === 'projects') diy.handleGetProjects();
            }}
            className={`${styles.tab} ${activeTab === tab.id ? styles.active : ''}`}
          >
            <tab.icon className="w-4 h-4" />
            <span>{tab.label}</span>
          </button>
        ))}
      </nav>

      {/* Error Display */}
      {diy.error && (
        <div className={styles.errorBanner}>
          <p>{diy.error}</p>
          <button onClick={diy.clearError}>Dismiss</button>
        </div>
      )}

      {/* Main Content */}
      <main className={styles.mainContent}>
        {renderTabContent()}
      </main>
    </div>
  );
};

// =============================================================================
// HELPERS
// =============================================================================

const formatDuration = (minutes: number): string => {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
};

export default DIYAgent;

