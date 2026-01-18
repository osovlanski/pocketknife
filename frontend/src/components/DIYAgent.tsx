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
  Clock, DollarSign, Star, ExternalLink, Play, Pause, X, Image as ImageIcon
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
  const [skillLevel, setSkillLevel] = useState<'beginner' | 'intermediate' | 'advanced' | ''>('');
  const [budgetMin, setBudgetMin] = useState<number | undefined>();
  const [budgetMax, setBudgetMax] = useState<number | undefined>();
  const [timeAvailable, setTimeAvailable] = useState<number | undefined>();
  const [selectedTimePreset, setSelectedTimePreset] = useState<string | null>(null);
  const [expandedSteps, setExpandedSteps] = useState<Set<number>>(new Set([1]));
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [ideaQuery, setIdeaQuery] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState<'easy' | 'medium' | 'hard' | null>(null);
  
  // Time presets for quick selection
  const TIME_PRESETS = [
    { id: '1h', label: '~1 hour', value: 1 },
    { id: '2-4h', label: '2-4 hours', value: 3 },
    { id: 'half-day', label: 'Half day', value: 5 },
    { id: 'full-day', label: 'Full day', value: 8 },
    { id: 'weekend', label: 'Weekend', value: 16 },
    { id: 'multi-day', label: 'Multi-day', value: 24 },
  ];

  const handleTimePresetClick = (presetId: string, value: number) => {
    if (selectedTimePreset === presetId) {
      setSelectedTimePreset(null);
      setTimeAvailable(undefined);
    } else {
      setSelectedTimePreset(presetId);
      setTimeAvailable(value);
    }
  };

  // Handlers
  const handleGenerate = useCallback(async () => {
    if (!description.trim()) return;
    
    // Use budgetMax as the budget constraint if set, otherwise budgetMin
    const effectiveBudget = budgetMax || budgetMin;
    
    await diy.handleGenerate({
      description,
      category: category || undefined,
      skillLevel: skillLevel || undefined,
      budget: effectiveBudget,
      budgetMin,
      budgetMax,
      timeAvailable,
      currency: 'USD'
    });
    
    // Reset step states for new project
    setExpandedSteps(new Set([1]));
    setCompletedSteps(new Set());
  }, [diy, description, category, skillLevel, budgetMin, budgetMax, timeAvailable]);

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
                    <option value="">Auto-detect</option>
                    {SKILL_LEVELS.map(level => (
                      <option key={level.id} value={level.id}>
                        {level.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.inputGroup}>
                  <label>Budget Range (USD)</label>
                  <div className={styles.rangeInputs}>
                    <input
                      id="budgetMin"
                      type="number"
                      placeholder="Min"
                      min="0"
                      value={budgetMin || ''}
                      onChange={(e) => setBudgetMin(e.target.value ? Number(e.target.value) : undefined)}
                      className={styles.rangeInput}
                      aria-label="Minimum budget"
                    />
                    <span className={styles.rangeSeparator}>to</span>
                    <input
                      id="budgetMax"
                      type="number"
                      placeholder="Max"
                      min="0"
                      value={budgetMax || ''}
                      onChange={(e) => setBudgetMax(e.target.value ? Number(e.target.value) : undefined)}
                      className={styles.rangeInput}
                      aria-label="Maximum budget"
                    />
                  </div>
                </div>

                <div className={styles.inputGroup}>
                  <label>Time Available</label>
                  <div className={styles.timePresets}>
                    {TIME_PRESETS.map(preset => (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => handleTimePresetClick(preset.id, preset.value)}
                        className={`${styles.timePresetButton} ${selectedTimePreset === preset.id ? styles.active : ''}`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                  <div className={styles.customTimeInput}>
                    <input
                      id="time"
                      type="number"
                      placeholder="Or enter custom hours"
                      min="0.5"
                      step="0.5"
                      value={selectedTimePreset ? '' : (timeAvailable || '')}
                      onChange={(e) => {
                        setSelectedTimePreset(null);
                        setTimeAvailable(e.target.value ? Number(e.target.value) : undefined);
                      }}
                      className={styles.numberInput}
                      aria-label="Custom time in hours"
                    />
                  </div>
                </div>
              </div>

              <div className={styles.buttonRow}>
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
                
                {diy.generating && (
                  <button
                    onClick={diy.handleCancelGenerate}
                    className={styles.cancelButton}
                    aria-label="Cancel generation"
                  >
                    <X className="w-5 h-5" />
                    Cancel
                  </button>
                )}
              </div>
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
            {/* Inspire Me Section */}
            <div className={styles.inspireSection}>
              <div className={styles.inspireHeader}>
                <h3>🎲 Need Inspiration?</h3>
                <p>Let AI suggest a creative project for you!</p>
              </div>
              <div className={styles.inspireControls}>
                <select
                  value={skillLevel}
                  onChange={(e) => setSkillLevel(e.target.value as any)}
                  className={styles.inspireSelect}
                  aria-label="Skill level"
                >
                  {SKILL_LEVELS.map(level => (
                    <option key={level.id} value={level.id}>
                      {level.label}
                    </option>
                  ))}
                </select>
                <button 
                  onClick={() => diy.handleGetInspiration({ skillLevel })}
                  disabled={diy.loadingInspiration}
                  className={styles.inspireButton}
                >
                  {diy.loadingInspiration ? (
                    <><Loader2 className="w-5 h-5 animate-spin" /> Finding...</>
                  ) : (
                    <><Lightbulb className="w-5 h-5" /> Inspire Me!</>
                  )}
                </button>
              </div>
              
              {diy.inspiration && (
                <div className={styles.inspirationCard}>
                  <div className={styles.inspirationBadge}>✨ Suggested for you</div>
                  <h4>{diy.inspiration.title}</h4>
                  <p>{diy.inspiration.description}</p>
                  {diy.inspiration.whyItsAwesome && (
                    <p className={styles.whyAwesome}>💡 {diy.inspiration.whyItsAwesome}</p>
                  )}
                  <div className={styles.inspirationMeta}>
                    <span 
                      className={styles.difficultyBadge}
                      style={{ background: DIFFICULTY_COLORS[diy.inspiration.difficulty] || '#666' }}
                    >
                      {diy.inspiration.difficulty}
                    </span>
                    <span><Clock className="w-4 h-4" /> {formatDuration(diy.inspiration.estimatedTime)}</span>
                    {diy.inspiration.estimatedCostMin && (
                      <span><DollarSign className="w-4 h-4" /> ${diy.inspiration.estimatedCostMin} - ${diy.inspiration.estimatedCostMax}</span>
                    )}
                  </div>
                  {diy.inspiration.tags && diy.inspiration.tags.length > 0 && (
                    <div className={styles.tags}>
                      {diy.inspiration.tags.map((tag, i) => (
                        <span key={i} className={styles.tag}>#{tag}</span>
                      ))}
                    </div>
                  )}
                  <button 
                    onClick={() => handleSelectIdea(diy.inspiration!)}
                    className={styles.startButton}
                  >
                    Start This Project →
                  </button>
                </div>
              )}
            </div>

            {/* Filter Section */}
            <div className={styles.filterSection}>
              <h3>🔥 Trending Ideas</h3>
              <div className={styles.filterControls}>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className={styles.filterSelect}
                  aria-label="Category filter"
                >
                  <option value="">All Categories</option>
                  {DIY_CATEGORIES.map(cat => (
                    <option key={cat.id} value={cat.id}>
                      {cat.icon} {cat.label}
                    </option>
                  ))}
                </select>
                <div className={styles.difficultyFilters}>
                  {(['easy', 'medium', 'hard'] as const).map(diff => (
                    <button
                      key={diff}
                      onClick={() => setDifficultyFilter(prev => prev === diff ? null : diff)}
                      className={`${styles.difficultyFilter} ${difficultyFilter === diff ? styles.active : ''}`}
                      style={{ '--filter-color': DIFFICULTY_COLORS[diff] } as any}
                    >
                      {diff.charAt(0).toUpperCase() + diff.slice(1)}
                    </button>
                  ))}
                </div>
                <button 
                  onClick={() => diy.handleGetFeaturedIdeas({ 
                    category: category || undefined, 
                    difficulty: difficultyFilter || undefined,
                    skillLevel 
                  })}
                  disabled={diy.loadingFeatured}
                  className={styles.loadButton}
                >
                  {diy.loadingFeatured ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Search className="w-4 h-4" />
                  )}
                  {diy.loadingFeatured ? 'Loading...' : 'Find Ideas'}
                </button>
              </div>
            </div>

            {/* Featured Ideas Grid */}
            {diy.featuredIdeas.length > 0 && (
              <div className={styles.featuredGrid}>
                {diy.featuredIdeas.map(idea => (
                  <div 
                    key={idea.id} 
                    className={styles.featuredCard}
                    onClick={() => handleSelectIdea(idea)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSelectIdea(idea)}
                    tabIndex={0}
                    role="button"
                  >
                    {/* Idea Image */}
                    <div className={styles.ideaImageContainer}>
                      {idea.imageUrl ? (
                        <img 
                          src={idea.imageUrl} 
                          alt={idea.title}
                          className={styles.ideaImage}
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                            (e.target as HTMLImageElement).nextElementSibling?.classList.remove(styles.hidden);
                          }}
                        />
                      ) : null}
                      <div className={`${styles.ideaImagePlaceholder} ${idea.imageUrl ? styles.hidden : ''}`}>
                        <ImageIcon className="w-8 h-8" />
                      </div>
                    </div>
                    <div className={styles.cardHeader}>
                      <span 
                        className={styles.difficultyBadge}
                        style={{ background: DIFFICULTY_COLORS[idea.difficulty] || '#666' }}
                      >
                        {idea.difficulty}
                      </span>
                      {idea.popularity && idea.popularity >= 80 && (
                        <span className={styles.popularBadge}>
                          <Star className="w-3 h-3" /> Popular
                        </span>
                      )}
                    </div>
                    <h5>{idea.title}</h5>
                    <p>{idea.description}</p>
                    <div className={styles.cardMeta}>
                      <span><Clock className="w-3 h-3" /> {formatDuration(idea.estimatedTime)}</span>
                      {idea.estimatedCostMin && (
                        <span><DollarSign className="w-3 h-3" /> ${idea.estimatedCostMin}-${idea.estimatedCostMax}</span>
                      )}
                    </div>
                    {idea.tags && idea.tags.length > 0 && (
                      <div className={styles.cardTags}>
                        {idea.tags.slice(0, 3).map((tag, i) => (
                          <span key={i}>#{tag}</span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Quick Search */}
            <div className={styles.quickSearch}>
              <h4>🔍 Custom Search</h4>
              <div className={styles.searchBox}>
                <Search className="w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search for specific DIY ideas..."
                  value={ideaQuery}
                  onChange={(e) => setIdeaQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearchIdeas()}
                  className={styles.searchInput}
                />
                <button onClick={handleSearchIdeas} className={styles.searchButton}>
                  Search
                </button>
              </div>
              
              {diy.ideas.length > 0 && (
                <div className={styles.searchResults}>
                  {diy.ideas.map(idea => (
                    <div 
                      key={idea.id} 
                      className={styles.searchResultCard}
                      onClick={() => handleSelectIdea(idea)}
                    >
                      <h5>{idea.title}</h5>
                      <p>{idea.description}</p>
                      <div className={styles.ideaMeta}>
                        <span 
                          className={styles.difficultyBadge}
                          style={{ background: DIFFICULTY_COLORS[idea.difficulty] || '#666' }}
                        >
                          {idea.difficulty}
                        </span>
                        <span>{formatDuration(idea.estimatedTime)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Categories Grid */}
            <div className={styles.categoriesSection}>
              <h4>📁 Browse by Category</h4>
              <div className={styles.categoriesGrid}>
                {DIY_CATEGORIES.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => {
                      setCategory(cat.id);
                      diy.handleGetFeaturedIdeas({ category: cat.id, skillLevel });
                    }}
                    className={styles.categoryCard}
                  >
                    <span className={styles.categoryIcon}>{cat.icon}</span>
                    <span>{cat.label}</span>
                  </button>
                ))}
              </div>
            </div>
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

