/**
 * MockInterviewPanel Component
 * 
 * Provides an interactive mock interview experience:
 * - Upload images with interview questions (Hebrew/English)
 * - Get AI-generated answers
 * - Practice and receive feedback
 */

import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import {
  Upload,
  ImagePlus,
  MessageCircle,
  Lightbulb,
  Target,
  Award,
  ChevronDown,
  ChevronUp,
  Send,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Languages,
  BookOpen,
  Building2,
  Briefcase,
  Code,
  Users,
  Sparkles,
  Layers,
  Play,
  ExternalLink,
  Brain,
  Trophy,
  Clock,
  Edit3,
  Filter
} from 'lucide-react';
import * as mockInterviewApi from '../services/mockInterviewApi';
import logger from '../services/logger';
import type { 
  InterviewQuestion, 
  InterviewAnswer, 
  AnswerEvaluation,
  ExampleQuestion,
  CompanyQuestionBank,
  SystemDesignQuestion,
  SystemDesignEvaluation,
  CodeEvaluationResult
} from '../services/mockInterviewApi';
import type { ApiError } from '../types';
import CodeEditorModal, { CodeQuestion, CodeSubmission } from './shared/CodeEditorModal';
import SystemDesignWhiteboard, { DiagramSubmission } from './shared/SystemDesignWhiteboard';
import ProblemSolvingAgent from './ProblemSolvingAgent';

// System Design Question Status
type QuestionStatus = 'not-started' | 'in-progress' | 'completed' | 'success';

interface QuestionStatusData {
  status: QuestionStatus;
  score?: number;
  lastAttempt?: string;
  evaluationCount: number;
  // Persist the design elements and prompt
  elements?: any[];
  prompt?: string;
  summary?: string;
  // Persist code for coding questions
  code?: string;
  lastSubmissionTime?: string;
}

// Local storage keys for persisting data
const SYSTEM_DESIGN_STATUS_KEY = 'system_design_question_status';
const SYSTEM_DESIGN_ELEMENTS_KEY = 'system_design_elements';

// Load status from local storage
const loadQuestionStatus = (): Map<string, QuestionStatusData> => {
  try {
    const stored = localStorage.getItem(SYSTEM_DESIGN_STATUS_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return new Map(Object.entries(parsed));
    }
  } catch (e) {
    console.error('Failed to load question status:', e);
  }
  return new Map();
};

// Load elements from local storage (separate key due to size)
const loadSavedElements = (): Map<string, any[]> => {
  try {
    const stored = localStorage.getItem(SYSTEM_DESIGN_ELEMENTS_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return new Map(Object.entries(parsed));
    }
  } catch (e) {
    console.error('Failed to load saved elements:', e);
  }
  return new Map();
};

// Save status to local storage
const saveQuestionStatus = (status: Map<string, QuestionStatusData>) => {
  try {
    const obj = Object.fromEntries(status);
    localStorage.setItem(SYSTEM_DESIGN_STATUS_KEY, JSON.stringify(obj));
  } catch (e) {
    console.error('Failed to save question status:', e);
  }
};

// Save elements to local storage
const saveSavedElements = (elements: Map<string, any[]>) => {
  try {
    const obj = Object.fromEntries(elements);
    localStorage.setItem(SYSTEM_DESIGN_ELEMENTS_KEY, JSON.stringify(obj));
  } catch (e) {
    console.error('Failed to save elements:', e);
  }
};

interface MockInterviewPanelProps {
  className?: string;
}

const MockInterviewPanel: React.FC<MockInterviewPanelProps> = ({ className }) => {
  // Tab state
  const [activeTab, setActiveTab] = useState<'upload' | 'examples' | 'system-design' | 'coding-practice'>('examples');
  
  // State
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [questions, setQuestions] = useState<InterviewQuestion[]>([]);
  const [answers, setAnswers] = useState<Map<number, InterviewAnswer>>(new Map());
  const [evaluations, setEvaluations] = useState<Map<number, AnswerEvaluation>>(new Map());
  const [userAnswers, setUserAnswers] = useState<Map<number, string>>(new Map());
  const [expandedQuestions, setExpandedQuestions] = useState<Set<number>>(new Set());
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  
  // Example questions state
  const [exampleQuestions, setExampleQuestions] = useState<ExampleQuestion[]>([]);
  const [exampleTips, setExampleTips] = useState<string[]>([]);
  const [popularCompanies, setPopularCompanies] = useState<CompanyQuestionBank[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  
  // Code Editor Modal state
  const [codeEditorOpen, setCodeEditorOpen] = useState(false);
  const [currentCodeQuestion, setCurrentCodeQuestion] = useState<CodeQuestion | null>(null);
  const [codeEvaluation, setCodeEvaluation] = useState<CodeEvaluationResult | null>(null);
  
  // System Design Whiteboard state
  const [whiteboardOpen, setWhiteboardOpen] = useState(false);
  const [currentDesignQuestion, setCurrentDesignQuestion] = useState<SystemDesignQuestion | null>(null);
  const [systemDesignQuestions, setSystemDesignQuestions] = useState<SystemDesignQuestion[]>([]);
  const [designEvaluation, setDesignEvaluation] = useState<SystemDesignEvaluation | null>(null);
  
  // Persist whiteboard elements per question (key: question title)
  const [whiteboardElements, setWhiteboardElements] = useState<Map<string, any[]>>(() => loadSavedElements());
  
  // Question status tracking
  const [questionStatus, setQuestionStatus] = useState<Map<string, QuestionStatusData>>(() => loadQuestionStatus());
  const [statusFilter, setStatusFilter] = useState<'all' | QuestionStatus>('all');
  
  // Persist question status to localStorage when it changes
  useEffect(() => {
    saveQuestionStatus(questionStatus);
  }, [questionStatus]);
  
  // Persist whiteboard elements to localStorage when they change
  useEffect(() => {
    saveSavedElements(whiteboardElements);
  }, [whiteboardElements]);
  
  
  // Context for answer generation
  const [role, setRole] = useState('Software Developer');
  const [experience, setExperience] = useState('Mid-level');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load popular companies and system design questions on mount
  useEffect(() => {
    const loadPopularCompanies = async () => {
      try {
        const result = await mockInterviewApi.getPopularCompanyQuestions();
        if (result.success) {
          setPopularCompanies(result.companies);
        }
      } catch (err) {
        logger.error('Failed to load popular companies', { error: err });
      }
    };
    
    const loadSystemDesignQuestions = async () => {
      try {
        const result = await mockInterviewApi.getSystemDesignQuestions();
        if (result.success) {
          setSystemDesignQuestions(result.questions);
        }
      } catch (err) {
        logger.error('Failed to load system design questions', { error: err });
      }
    };
    
    loadPopularCompanies();
    loadSystemDesignQuestions();
  }, []);

  // Handle opening code editor for coding questions
  const handleOpenCodeEditor = useCallback((question: ExampleQuestion | InterviewQuestion) => {
    // Both InterviewQuestion and ExampleQuestion have 'original'
    const title = question.original;
    // Only ExampleQuestion has 'reasoning' and 'keyPoints'
    const exQuestion = question as ExampleQuestion;
    const description = exQuestion.reasoning || 'Solve the coding problem';
    const hints = exQuestion.keyPoints || [];
    
    // Get saved code from question status if available
    const savedStatus = questionStatus.get(title);
    const savedCode = savedStatus?.code || '';
    
    const codeQ: CodeQuestion = {
      title,
      description,
      starterCode: savedCode, // Use saved code if available
      language: 'javascript',
      hints,
      difficulty: 'Medium',
      category: 'coding'
    };
    setCurrentCodeQuestion(codeQ);
    setCodeEditorOpen(true);
    
    // Update status to in-progress if not already completed/success
    if (!savedStatus || savedStatus.status === 'not-started') {
      setQuestionStatus(prev => {
        const updated = new Map(prev);
        updated.set(title, {
          status: 'in-progress',
          evaluationCount: 0
        });
        return updated;
      });
    }
  }, [questionStatus]);

  // Handle code submission
  const handleCodeSubmit = useCallback(async (submission: CodeSubmission) => {
    // Update question status based on submission result
    if (currentCodeQuestion) {
      const newStatus: QuestionStatus = submission.passed ? 'success' : 'completed';
      setQuestionStatus(prev => {
        const updated = new Map(prev);
        const currentStatusData = updated.get(currentCodeQuestion.title) || { 
          status: 'not-started' as QuestionStatus, 
          evaluationCount: 0 
        };
        updated.set(currentCodeQuestion.title, {
          ...currentStatusData,
          status: newStatus,
          evaluationCount: currentStatusData.evaluationCount + 1,
          code: submission.code, // Preserve submitted code
          lastSubmissionTime: new Date().toISOString()
        });
        return updated;
      });
    }
    
    setCodeEditorOpen(false);
    setCodeEvaluation({
      passed: submission.passed,
      code: submission.code,
      executionTime: submission.executionTime
    });
  }, [currentCodeQuestion]);

  // Handle opening system design whiteboard
  const handleOpenWhiteboard = useCallback((question: SystemDesignQuestion) => {
    setCurrentDesignQuestion(question);
    setWhiteboardOpen(true);
    
    // Update status to in-progress if not already completed/success
    const currentStatus = questionStatus.get(question.title);
    if (!currentStatus || currentStatus.status === 'not-started') {
      setQuestionStatus(prev => {
        const updated = new Map(prev);
        updated.set(question.title, {
          status: 'in-progress',
          evaluationCount: currentStatus?.evaluationCount || 0
        });
        return updated;
      });
    }
  }, [questionStatus]);

  // Handle system design submission
  const handleDesignSubmit = useCallback(async (submission: DiagramSubmission) => {
    if (!currentDesignQuestion) return;
    
    setIsLoading(true);
    try {
      const result = await mockInterviewApi.evaluateSystemDesign(
        submission.imageBase64,
        submission.jsonData,
        submission.textAnnotations,
        currentDesignQuestion,
        submission.elapsedTime
      );
      
      if (result.success) {
        setDesignEvaluation(result.evaluation);
        
        // Update question status based on score
        const score = result.evaluation.score;
        const currentStatus = questionStatus.get(currentDesignQuestion.title);
        const newStatus: QuestionStatus = score >= 90 ? 'success' : 'completed';
        
        setQuestionStatus(prev => {
          const updated = new Map(prev);
          updated.set(currentDesignQuestion.title, {
            status: newStatus,
            score,
            lastAttempt: new Date().toISOString(),
            evaluationCount: (currentStatus?.evaluationCount || 0) + 1
          });
          return updated;
        });
      }
    } catch (err) {
      logger.error('Failed to evaluate system design', { error: err });
      setError('Failed to evaluate system design');
    } finally {
      setIsLoading(false);
      setWhiteboardOpen(false);
    }
  }, [currentDesignQuestion, questionStatus]);

  // Generate example questions
  const handleGenerateExamples = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await mockInterviewApi.getExampleQuestions({
        company: selectedCompany || undefined,
        role,
        category: selectedCategory as any || undefined,
        experienceLevel: experience.toLowerCase().includes('junior') ? 'junior' : 
                        experience.toLowerCase().includes('senior') ? 'senior' : 'mid',
        count: 10
      });

      if (result.success) {
        setExampleQuestions(result.questions);
        setExampleTips(result.tips || []);
        setExpandedQuestions(new Set([0]));
      } else {
        setError('Failed to generate example questions');
      }
    } catch (err) {
      const error = err as ApiError;
      setError(error.response?.data?.error || 'Failed to generate example questions');
    } finally {
      setIsLoading(false);
    }
  }, [selectedCompany, selectedCategory, role, experience]);

  // Use example question in main practice mode
  const handleUseQuestion = useCallback((question: ExampleQuestion) => {
    const newQuestion: InterviewQuestion = {
      original: question.original,
      category: question.category,
      language: 'english'
    };
    setQuestions(prev => [...prev, newQuestion]);
    setActiveTab('upload'); // Switch to main practice mode
  }, []);

  // Handle image selection
  const handleImageSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      setImagePreview(URL.createObjectURL(file));
      setError(null);
    }
  }, []);

  // Handle image upload and question extraction
  const handleExtractQuestions = useCallback(async () => {
    if (!selectedImage) {
      setError('Please select an image first');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await mockInterviewApi.extractQuestionsFromImage(selectedImage);
      
      if (result.questions.length === 0) {
        setError('No interview questions found in the image. Try a clearer image or different content.');
      } else {
        setQuestions(result.questions);
        // Expand the first question by default
        setExpandedQuestions(new Set([0]));
      }
    } catch (err) {
      const error = err as ApiError;
      setError(error.response?.data?.error || 'Failed to extract questions from image');
    } finally {
      setIsLoading(false);
    }
  }, [selectedImage]);

  // Generate AI answer for a question
  const handleGenerateAnswer = useCallback(async (index: number) => {
    const question = questions[index];
    if (!question) return;

    setIsLoading(true);
    setError(null);

    try {
      const questionText = question.translated || question.original;
      // Default skills used for answer generation - CV integration can enhance this
      const defaultSkills = ['JavaScript', 'TypeScript', 'React'];
      const result = await mockInterviewApi.generateAnswer(questionText, {
        role,
        experience,
        skills: defaultSkills
      });

      setAnswers(prev => new Map(prev).set(index, result.answer));
    } catch (err) {
      const error = err as ApiError;
      setError(error.response?.data?.error || 'Failed to generate answer');
    } finally {
      setIsLoading(false);
    }
  }, [questions, role, experience]);

  // Evaluate user's answer
  const handleEvaluateAnswer = useCallback(async (index: number) => {
    const question = questions[index];
    const userAnswer = userAnswers.get(index);
    
    if (!question || !userAnswer?.trim()) {
      setError('Please provide your answer first');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const questionText = question.translated || question.original;
      const result = await mockInterviewApi.evaluateAnswer(questionText, userAnswer, {
        role,
        experience
      });

      setEvaluations(prev => new Map(prev).set(index, result.evaluation));
    } catch (err) {
      const error = err as ApiError;
      setError(error.response?.data?.error || 'Failed to evaluate answer');
    } finally {
      setIsLoading(false);
    }
  }, [questions, userAnswers, role, experience]);

  // Toggle question expansion
  const toggleQuestion = useCallback((index: number) => {
    setExpandedQuestions(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }, []);

  // Update user answer
  const handleUserAnswerChange = useCallback((index: number, value: string) => {
    setUserAnswers(prev => new Map(prev).set(index, value));
  }, []);

  // Clear all data
  const handleReset = useCallback(() => {
    setQuestions([]);
    setAnswers(new Map());
    setEvaluations(new Map());
    setUserAnswers(new Map());
    setExpandedQuestions(new Set());
    setSelectedImage(null);
    setImagePreview(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  // Get category color
  const getCategoryColor = (category?: string) => {
    switch (category) {
      case 'technical': return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      case 'behavioral': return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
      case 'situational': return 'bg-orange-500/20 text-orange-300 border-orange-500/30';
      default: return 'bg-slate-500/20 text-slate-300 border-slate-500/30';
    }
  };

  // Get score color
  const getScoreColor = (score: number) => {
    if (score >= 8) return 'text-emerald-400';
    if (score >= 6) return 'text-yellow-400';
    return 'text-red-400';
  };
  
  // Get status for a question
  const getQuestionStatus = useCallback((title: string): QuestionStatusData => {
    return questionStatus.get(title) || { status: 'not-started', evaluationCount: 0 };
  }, [questionStatus]);
  
  // Filtered system design questions based on status filter
  const filteredSystemDesignQuestions = useMemo(() => {
    if (statusFilter === 'all') return systemDesignQuestions;
    return systemDesignQuestions.filter(q => {
      const status = getQuestionStatus(q.title);
      return status.status === statusFilter;
    });
  }, [systemDesignQuestions, statusFilter, getQuestionStatus]);
  
  // Status counts for filter badges
  const statusCounts = useMemo(() => {
    const counts = { 
      'all': systemDesignQuestions.length,
      'not-started': 0, 
      'in-progress': 0, 
      'completed': 0, 
      'success': 0 
    };
    systemDesignQuestions.forEach(q => {
      const status = getQuestionStatus(q.title).status;
      counts[status]++;
    });
    return counts;
  }, [systemDesignQuestions, getQuestionStatus]);
  
  // Get status badge styling
  const getStatusBadge = (status: QuestionStatus, score?: number) => {
    switch (status) {
      case 'success':
        return { bg: 'bg-emerald-500/20', text: 'text-emerald-400', icon: Trophy, label: score ? `${score}%` : 'Success' };
      case 'completed':
        return { bg: 'bg-yellow-500/20', text: 'text-yellow-400', icon: CheckCircle2, label: score ? `${score}%` : 'Done' };
      case 'in-progress':
        return { bg: 'bg-blue-500/20', text: 'text-blue-400', icon: Clock, label: 'In Progress' };
      default:
        return null;
    }
  };

  return (
    <div className={`space-y-6 ${className || ''}`}>
      {/* Header */}
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-white mb-2 flex items-center justify-center gap-2">
          <MessageCircle className="w-6 h-6 text-purple-400" />
          Mock Interview Prep
        </h2>
        <p className="text-slate-400">
          Practice with AI-powered interview questions and feedback
        </p>
      </div>

      {/* Tab Switcher */}
      <div className="flex justify-center gap-2 mb-4">
        <button
          onClick={() => setActiveTab('examples')}
          className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-all ${
            activeTab === 'examples'
              ? 'bg-purple-500 text-white'
              : 'bg-white/10 text-slate-300 hover:bg-white/20'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          Example Questions
        </button>
        <button
          onClick={() => setActiveTab('upload')}
          className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-all ${
            activeTab === 'upload'
              ? 'bg-purple-500 text-white'
              : 'bg-white/10 text-slate-300 hover:bg-white/20'
          }`}
        >
          <Upload className="w-4 h-4" />
          Upload Questions
        </button>
        <button
          onClick={() => setActiveTab('system-design')}
          className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-all ${
            activeTab === 'system-design'
              ? 'bg-cyan-500 text-white'
              : 'bg-white/10 text-slate-300 hover:bg-white/20'
          }`}
        >
          <Layers className="w-4 h-4" />
          System Design
        </button>
        <button
          onClick={() => setActiveTab('coding-practice')}
          className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-all ${
            activeTab === 'coding-practice'
              ? 'bg-green-500 text-white'
              : 'bg-white/10 text-slate-300 hover:bg-white/20'
          }`}
        >
          <Brain className="w-4 h-4" />
          Coding Practice
        </button>
      </div>

      {/* Context Settings */}
      <div className="bg-white/5 rounded-xl p-4 border border-white/10">
        <h3 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
          <Target className="w-4 h-4" />
          Interview Context
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Target Role</label>
            <input
              type="text"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder="e.g., Senior Developer"
              className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white 
                       placeholder:text-slate-500 focus:outline-none focus:border-purple-500/50"
            />
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Experience Level</label>
            <select
              value={experience}
              onChange={(e) => setExperience(e.target.value)}
              className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white 
                       focus:outline-none focus:border-purple-500/50"
            >
              <option value="Entry-level">Entry-level (0-2 years)</option>
              <option value="Mid-level">Mid-level (3-5 years)</option>
              <option value="Senior">Senior (5-8 years)</option>
              <option value="Lead">Lead/Principal (8+ years)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Example Questions Tab */}
      {activeTab === 'examples' && (
        <div className="space-y-4">
          {/* Example Questions Generator */}
          <div className="bg-white/5 rounded-xl p-6 border border-white/10">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-yellow-400" />
              Generate Example Questions
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              {/* Company Selection */}
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Company (Optional)</label>
                <select
                  value={selectedCompany}
                  onChange={(e) => setSelectedCompany(e.target.value)}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white 
                           focus:outline-none focus:border-purple-500/50"
                >
                  <option value="">Any Company</option>
                  {popularCompanies.map(c => (
                    <option key={c.company} value={c.company}>{c.company}</option>
                  ))}
                </select>
              </div>
              
              {/* Category Selection */}
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Question Type</label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white 
                           focus:outline-none focus:border-purple-500/50"
                >
                  <option value="">All Types</option>
                  <option value="technical">Technical</option>
                  <option value="behavioral">Behavioral</option>
                  <option value="situational">Situational</option>
                  <option value="system-design">System Design</option>
                  <option value="coding">Coding</option>
                </select>
              </div>
            </div>
            
            <button
              onClick={handleGenerateExamples}
              disabled={isLoading}
              className="w-full py-3 px-4 bg-gradient-to-r from-purple-600 to-pink-600 
                       text-white font-semibold rounded-lg flex items-center justify-center gap-2
                       hover:from-purple-500 hover:to-pink-500 transition-all disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Generating Questions...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  Generate Example Questions
                </>
              )}
            </button>
          </div>

          {/* Popular Companies Quick Access */}
          {popularCompanies.length > 0 && exampleQuestions.length === 0 && (
            <div className="bg-white/5 rounded-xl p-6 border border-white/10">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-blue-400" />
                Popular Company Questions
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {popularCompanies.map((company) => (
                  <div
                    key={company.company}
                    className="bg-white/5 rounded-lg p-4 border border-white/10 hover:border-purple-500/50 cursor-pointer transition-all"
                    onClick={() => {
                      setSelectedCompany(company.company);
                      handleGenerateExamples();
                    }}
                  >
                    <h4 className="text-white font-medium mb-2">{company.company}</h4>
                    <div className="flex flex-wrap gap-1 mb-3">
                      {company.categories.slice(0, 3).map((cat) => (
                        <span key={cat} className="text-xs px-2 py-0.5 bg-blue-500/20 text-blue-300 rounded-full">
                          {cat}
                        </span>
                      ))}
                    </div>
                    <p className="text-xs text-slate-400">
                      {company.sampleQuestions[0]?.substring(0, 50)}...
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Generated Example Questions */}
          {exampleQuestions.length > 0 && (
            <div className="space-y-4">
              {/* Tips Section */}
              {exampleTips.length > 0 && (
                <div className="bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 rounded-xl p-4 border border-emerald-500/20">
                  <h4 className="text-sm font-medium text-emerald-300 mb-2 flex items-center gap-2">
                    <Lightbulb className="w-4 h-4" />
                    Interview Tips
                  </h4>
                  <ul className="space-y-1">
                    {exampleTips.map((tip, i) => (
                      <li key={i} className="text-sm text-slate-300 flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                        {tip}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-purple-400" />
                Example Questions ({exampleQuestions.length})
              </h3>

              {exampleQuestions.map((question, index) => (
                <div
                  key={index}
                  className="bg-white/5 rounded-xl p-4 border border-white/10 hover:border-purple-500/30 transition-all"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="w-6 h-6 rounded-full bg-purple-500/20 text-purple-300 
                                       flex items-center justify-center text-xs font-bold">
                          {index + 1}
                        </span>
                        {question.category && (
                          <span className={`px-2 py-0.5 text-xs rounded-full border ${getCategoryColor(question.category)}`}>
                            {question.category}
                          </span>
                        )}
                      </div>
                      <p className="text-white font-medium mb-2">{question.original}</p>
                      {(question as any).reasoning && (
                        <p className="text-xs text-slate-400 mb-2">
                          💡 {(question as any).reasoning}
                        </p>
                      )}
                      {(question as any).keyPoints && (
                        <div className="flex flex-wrap gap-1">
                          {(question as any).keyPoints.map((point: string, i: number) => (
                            <span key={i} className="text-xs px-2 py-0.5 bg-slate-500/20 text-slate-300 rounded">
                              {point}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col gap-2">
                      {question.category === 'coding' && (
                        <button
                          onClick={() => handleOpenCodeEditor(question)}
                          className="px-3 py-1.5 bg-green-500/20 text-green-300 rounded-lg 
                                   hover:bg-green-500/30 transition-all text-sm flex items-center gap-1"
                        >
                          <Code className="w-3 h-3" />
                          Open IDE
                        </button>
                      )}
                      {question.category === 'system-design' && (
                        <button
                          onClick={() => {
                            // Find a matching system design question or create one
                            const designQ: SystemDesignQuestion = {
                              title: question.original,
                              description: question.reasoning || 'Design the system architecture',
                              requirements: question.keyPoints || ['Design the core components', 'Consider scalability', 'Handle data storage'],
                              hints: [],
                              category: 'system-design'
                            };
                            setCurrentDesignQuestion(designQ);
                            setWhiteboardOpen(true);
                          }}
                          className="px-3 py-1.5 bg-cyan-500/20 text-cyan-300 rounded-lg 
                                   hover:bg-cyan-500/30 transition-all text-sm flex items-center gap-1"
                        >
                          <Layers className="w-3 h-3" />
                          Whiteboard
                        </button>
                      )}
                      <button
                        onClick={() => handleUseQuestion(question)}
                        className="px-3 py-1.5 bg-purple-500/20 text-purple-300 rounded-lg 
                                 hover:bg-purple-500/30 transition-all text-sm flex items-center gap-1"
                      >
                        <Send className="w-3 h-3" />
                        Practice
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Upload Questions Tab */}
      {activeTab === 'upload' && (
        <>
          {/* Image Upload Section */}
          <div className="bg-white/5 rounded-xl p-6 border border-white/10">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <ImagePlus className="w-5 h-5 text-cyan-400" />
          Upload Interview Questions
        </h3>
        
        <div className="flex flex-col md:flex-row gap-4 items-start">
          {/* Upload Area */}
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="flex-1 border-2 border-dashed border-white/20 rounded-xl p-8 text-center 
                     cursor-pointer transition-all hover:border-purple-500/50 hover:bg-white/5"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              className="hidden"
            />
            <Upload className="w-12 h-12 mx-auto text-slate-500 mb-3" />
            <p className="text-slate-300">Click to upload an image</p>
            <p className="text-sm text-slate-500 mt-1">
              Supports Hebrew & English text extraction
            </p>
          </div>

          {/* Image Preview */}
          {imagePreview && (
            <div className="flex-1 relative">
              <img 
                src={imagePreview} 
                alt="Selected" 
                className="w-full max-h-48 object-contain rounded-xl border border-white/20"
              />
              <button
                onClick={handleReset}
                className="absolute top-2 right-2 bg-red-500/80 text-white px-2 py-1 rounded text-xs
                         hover:bg-red-600"
              >
                Clear
              </button>
            </div>
          )}
        </div>

        {/* Extract Button */}
        <button
          onClick={handleExtractQuestions}
          disabled={!selectedImage || isLoading}
          className="mt-4 w-full py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white 
                   rounded-xl font-semibold transition-all hover:from-purple-500 hover:to-blue-500
                   disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Extracting Questions...
            </>
          ) : (
            <>
              <Languages className="w-5 h-5" />
              Extract Questions (Hebrew/English)
            </>
          )}
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-red-300">{error}</p>
        </div>
      )}

      {/* Questions List */}
      {questions.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-emerald-400" />
            Extracted Questions ({questions.length})
          </h3>

          {questions.map((question, index) => (
            <div 
              key={index}
              className="bg-white/5 rounded-xl border border-white/10 overflow-hidden"
            >
              {/* Question Header */}
              <button
                onClick={() => toggleQuestion(index)}
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-white/5 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-full bg-purple-500/20 text-purple-300 
                                 flex items-center justify-center text-sm font-bold">
                    {index + 1}
                  </span>
                  <div className="text-left">
                    <p className="text-white font-medium line-clamp-1">
                      {question.translated || question.original}
                    </p>
                    {question.translated && (
                      <p className="text-xs text-slate-500 line-clamp-1">
                        Original: {question.original}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {question.category && (
                    <span className={`px-2 py-0.5 text-xs rounded-full border ${getCategoryColor(question.category)}`}>
                      {question.category}
                    </span>
                  )}
                  {question.language === 'hebrew' && (
                    <span className="px-2 py-0.5 text-xs rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                      🇮🇱 Hebrew
                    </span>
                  )}
                  {expandedQuestions.has(index) ? (
                    <ChevronUp className="w-5 h-5 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-slate-400" />
                  )}
                </div>
              </button>

              {/* Expanded Content */}
              {expandedQuestions.has(index) && (
                <div className="px-4 pb-4 space-y-4 border-t border-white/10">
                  {/* Generate Answer Button */}
                  <div className="pt-4">
                    <button
                      onClick={() => handleGenerateAnswer(index)}
                      disabled={isLoading}
                      className="w-full py-2 bg-emerald-600/20 text-emerald-300 border border-emerald-500/30
                               rounded-lg font-medium transition-all hover:bg-emerald-600/30
                               disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {isLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Lightbulb className="w-4 h-4" />
                      )}
                      Generate AI Answer
                    </button>
                  </div>

                  {/* AI Generated Answer */}
                  {answers.has(index) && (
                    <div className="bg-emerald-500/10 rounded-lg p-4 border border-emerald-500/20">
                      <h4 className="text-sm font-semibold text-emerald-300 mb-2 flex items-center gap-2">
                        <Lightbulb className="w-4 h-4" />
                        Suggested Answer
                      </h4>
                      <p className="text-white whitespace-pre-wrap">
                        {answers.get(index)?.answer}
                      </p>
                      
                      {answers.get(index)?.tips && answers.get(index)!.tips.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-emerald-500/20">
                          <h5 className="text-xs font-medium text-emerald-400 mb-1">Tips:</h5>
                          <ul className="text-sm text-slate-300 space-y-1">
                            {answers.get(index)?.tips.map((tip, i) => (
                              <li key={i} className="flex items-start gap-2">
                                <span className="text-emerald-400">•</span>
                                {tip}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Practice Section */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                      <MessageCircle className="w-4 h-4" />
                      Practice Your Answer
                    </h4>
                    <textarea
                      value={userAnswers.get(index) || ''}
                      onChange={(e) => handleUserAnswerChange(index, e.target.value)}
                      placeholder="Type your answer here and get AI feedback..."
                      className="w-full min-h-[120px] px-4 py-3 bg-white/10 border border-white/20 rounded-lg
                               text-white placeholder:text-slate-500 focus:outline-none focus:border-purple-500/50
                               resize-none"
                    />
                    <button
                      onClick={() => handleEvaluateAnswer(index)}
                      disabled={isLoading || !userAnswers.get(index)?.trim()}
                      className="w-full py-2 bg-blue-600/20 text-blue-300 border border-blue-500/30
                               rounded-lg font-medium transition-all hover:bg-blue-600/30
                               disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {isLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                      Evaluate My Answer
                    </button>
                  </div>

                  {/* Evaluation Results */}
                  {evaluations.has(index) && (
                    <div className="bg-blue-500/10 rounded-lg p-4 border border-blue-500/20">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-semibold text-blue-300 flex items-center gap-2">
                          <Award className="w-4 h-4" />
                          Evaluation
                        </h4>
                        <span className={`text-2xl font-bold ${getScoreColor(evaluations.get(index)!.score)}`}>
                          {evaluations.get(index)?.score}/10
                        </span>
                      </div>
                      
                      <p className="text-white mb-3">
                        {evaluations.get(index)?.feedback}
                      </p>

                      <div className="grid md:grid-cols-2 gap-3">
                        {/* Strengths */}
                        {evaluations.get(index)?.strengths && evaluations.get(index)!.strengths.length > 0 && (
                          <div className="bg-emerald-500/10 rounded-lg p-3">
                            <h5 className="text-xs font-medium text-emerald-400 mb-2 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              Strengths
                            </h5>
                            <ul className="text-sm text-slate-300 space-y-1">
                              {evaluations.get(index)?.strengths.map((s, i) => (
                                <li key={i}>• {s}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Improvements */}
                        {evaluations.get(index)?.improvements && evaluations.get(index)!.improvements.length > 0 && (
                          <div className="bg-orange-500/10 rounded-lg p-3">
                            <h5 className="text-xs font-medium text-orange-400 mb-2 flex items-center gap-1">
                              <Target className="w-3 h-3" />
                              Improvements
                            </h5>
                            <ul className="text-sm text-slate-300 space-y-1">
                              {evaluations.get(index)?.improvements.map((s, i) => (
                                <li key={i}>• {s}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      </>
      )}

      {/* System Design Tab */}
      {activeTab === 'system-design' && (
        <div className="space-y-6">
          <div className="bg-white/5 rounded-xl p-6 border border-white/10">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Layers className="w-5 h-5 text-cyan-400" />
              System Design Practice
            </h3>
            <p className="text-slate-400 text-sm mb-4">
              Practice system design interviews with our interactive whiteboard. 
              Draw your architecture and get AI-powered feedback.
            </p>

            {/* Status Filter Buttons */}
            <div className="flex flex-wrap gap-2 mb-6">
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-colors ${
                  statusFilter === 'all'
                    ? 'bg-cyan-600 text-white'
                    : 'bg-white/10 text-slate-300 hover:bg-white/20'
                }`}
              >
                <Filter className="w-3.5 h-3.5" />
                All ({statusCounts.all})
              </button>
              <button
                onClick={() => setStatusFilter('not-started')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-colors ${
                  statusFilter === 'not-started'
                    ? 'bg-slate-600 text-white'
                    : 'bg-white/10 text-slate-300 hover:bg-white/20'
                }`}
              >
                Not Started ({statusCounts['not-started']})
              </button>
              <button
                onClick={() => setStatusFilter('in-progress')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-colors ${
                  statusFilter === 'in-progress'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white/10 text-slate-300 hover:bg-white/20'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                In Progress ({statusCounts['in-progress']})
              </button>
              <button
                onClick={() => setStatusFilter('completed')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-colors ${
                  statusFilter === 'completed'
                    ? 'bg-yellow-600 text-white'
                    : 'bg-white/10 text-slate-300 hover:bg-white/20'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Completed ({statusCounts.completed})
              </button>
              <button
                onClick={() => setStatusFilter('success')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-colors ${
                  statusFilter === 'success'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-white/10 text-slate-300 hover:bg-white/20'
                }`}
              >
                <Trophy className="w-3.5 h-3.5" />
                Success 90%+ ({statusCounts.success})
              </button>
            </div>

            {/* System Design Questions Grid */}
            <div className="grid gap-4 md:grid-cols-2">
              {filteredSystemDesignQuestions.map((question, index) => {
                const statusData = getQuestionStatus(question.title);
                const badge = getStatusBadge(statusData.status, statusData.score);
                const hasSavedDesign = whiteboardElements.has(question.title) && (whiteboardElements.get(question.title)?.length || 0) > 0;
                
                return (
                  <div 
                    key={index}
                    className={`bg-white/5 rounded-lg p-4 border transition-colors ${
                      statusData.status === 'success' 
                        ? 'border-emerald-500/30 hover:border-emerald-500/50' 
                        : 'border-white/10 hover:bg-white/10'
                    }`}
                  >
                    {/* Header with title and status badge */}
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h4 className="text-white font-medium flex-1">{question.title}</h4>
                      {badge && (
                        <span className={`px-2 py-0.5 text-xs rounded-full flex items-center gap-1 ${badge.bg} ${badge.text}`}>
                          <badge.icon className="w-3 h-3" />
                          {badge.label}
                        </span>
                      )}
                    </div>
                    
                    <p className="text-slate-400 text-sm mb-3 line-clamp-2">{question.description}</p>
                    
                    {/* Requirements tags */}
                    <div className="flex flex-wrap gap-1 mb-3">
                      {question.requirements.slice(0, 3).map((req, i) => (
                        <span key={i} className="text-xs px-2 py-0.5 bg-cyan-500/20 text-cyan-300 rounded">
                          {req.slice(0, 30)}...
                        </span>
                      ))}
                    </div>
                    
                    {/* Attempt info */}
                    {statusData.evaluationCount > 0 && (
                      <p className="text-xs text-slate-500 mb-2">
                        {statusData.evaluationCount} attempt{statusData.evaluationCount > 1 ? 's' : ''} 
                        {statusData.lastAttempt && ` • Last: ${new Date(statusData.lastAttempt).toLocaleDateString()}`}
                      </p>
                    )}
                    
                    {/* Action buttons */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleOpenWhiteboard(question)}
                        className={`flex-1 py-2 px-4 rounded-lg flex items-center justify-center gap-2
                                  transition-colors text-sm font-medium ${
                          hasSavedDesign 
                            ? 'bg-purple-600 hover:bg-purple-500 text-white'
                            : 'bg-cyan-600 hover:bg-cyan-500 text-white'
                        }`}
                      >
                        {hasSavedDesign ? (
                          <>
                            <Edit3 className="w-4 h-4" />
                            Continue Design
                          </>
                        ) : (
                          <>
                            <Layers className="w-4 h-4" />
                            Start Design
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {filteredSystemDesignQuestions.length === 0 && systemDesignQuestions.length > 0 && (
              <div className="text-center py-12 text-slate-400">
                <Filter className="w-8 h-8 mx-auto mb-4 opacity-50" />
                <p>No questions match the selected filter.</p>
                <button 
                  onClick={() => setStatusFilter('all')}
                  className="mt-2 text-cyan-400 hover:underline text-sm"
                >
                  Show all questions
                </button>
              </div>
            )}

            {systemDesignQuestions.length === 0 && (
              <div className="text-center py-12 text-slate-400">
                <Loader2 className="w-8 h-8 mx-auto animate-spin mb-4" />
                <p>Loading system design questions...</p>
              </div>
            )}
          </div>

          {/* System Design Evaluation Results */}
          {designEvaluation && (
            <div className="bg-white/5 rounded-xl p-6 border border-white/10">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <Award className="w-5 h-5 text-yellow-400" />
                  Design Evaluation
                </h3>
                <span className={`text-3xl font-bold ${
                  designEvaluation.score >= 80 ? 'text-green-400' :
                  designEvaluation.score >= 60 ? 'text-yellow-400' : 'text-red-400'
                }`}>
                  {designEvaluation.score}/100
                </span>
              </div>

              <p className="text-slate-300 mb-4">{designEvaluation.feedback}</p>

              <div className="grid md:grid-cols-3 gap-4 mb-4">
                <div className="bg-blue-500/10 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-blue-400">{designEvaluation.scalabilityScore}</div>
                  <div className="text-xs text-slate-400">Scalability</div>
                </div>
                <div className="bg-green-500/10 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-green-400">{designEvaluation.reliabilityScore}</div>
                  <div className="text-xs text-slate-400">Reliability</div>
                </div>
                <div className="bg-purple-500/10 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-purple-400">{designEvaluation.costEfficiencyScore}</div>
                  <div className="text-xs text-slate-400">Cost Efficiency</div>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                {designEvaluation.strengths.length > 0 && (
                  <div className="bg-emerald-500/10 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-emerald-400 mb-2 flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" />
                      Strengths
                    </h4>
                    <ul className="text-sm text-slate-300 space-y-1">
                      {designEvaluation.strengths.map((s, i) => (
                        <li key={i}>• {s}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {designEvaluation.improvements.length > 0 && (
                  <div className="bg-orange-500/10 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-orange-400 mb-2 flex items-center gap-1">
                      <Target className="w-4 h-4" />
                      Improvements
                    </h4>
                    <ul className="text-sm text-slate-300 space-y-1">
                      {designEvaluation.improvements.map((s, i) => (
                        <li key={i}>• {s}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {designEvaluation.missingComponents.length > 0 && (
                <div className="mt-4 bg-red-500/10 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-red-400 mb-2">Missing Components</h4>
                  <div className="flex flex-wrap gap-2">
                    {designEvaluation.missingComponents.map((c, i) => (
                      <span key={i} className="text-xs px-2 py-1 bg-red-500/20 text-red-300 rounded">
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Coding Practice Tab - Embeds full Problem Solving Agent */}
      {activeTab === 'coding-practice' && (
        <div className="-mx-4 -mt-4">
          {/* Full Problem Solving Agent with all features: 
              - Problem search with filters
              - Left sidebar with problem list  
              - Monaco code editor with multiple languages (JS, Python, C#, Go, etc.)
              - Signature generation
              - Local tests
              - Code evaluation
              - Hints system
              - Curated lists (Top 75, Blind 75, etc.)
          */}
          <ProblemSolvingAgent />
        </div>
      )}


      {/* Code Editor Modal */}
      {currentCodeQuestion && (
        <CodeEditorModal
          isOpen={codeEditorOpen}
          onClose={() => setCodeEditorOpen(false)}
          question={currentCodeQuestion}
          onSubmit={handleCodeSubmit}
          mode="interview"
          showHints={true}
          showTestRunner={true}
        />
      )}

      {/* System Design Whiteboard Modal */}
      {currentDesignQuestion && (
        <SystemDesignWhiteboard
          isOpen={whiteboardOpen}
          onClose={() => setWhiteboardOpen(false)}
          question={currentDesignQuestion}
          onSubmit={handleDesignSubmit}
          mode="system-design"
          initialElements={whiteboardElements.get(currentDesignQuestion.title) || []}
          initialPrompt={questionStatus.get(currentDesignQuestion.title)?.prompt || ''}
          initialSummary={questionStatus.get(currentDesignQuestion.title)?.summary || ''}
          onSave={(elements, _name, prompt, summary) => {
            // Persist elements when closing/saving
            setWhiteboardElements(prev => {
              const updated = new Map(prev);
              updated.set(currentDesignQuestion.title, elements);
              return updated;
            });
            
            // Also save prompt and summary to question status
            if (prompt || summary) {
              setQuestionStatus(prev => {
                const updated = new Map(prev);
                const current = updated.get(currentDesignQuestion.title) || {
                  status: 'in-progress' as QuestionStatus,
                  evaluationCount: 0
                };
                updated.set(currentDesignQuestion.title, {
                  ...current,
                  prompt: prompt || current.prompt,
                  summary: summary || current.summary
                });
                return updated;
              });
            }
          }}
        />
      )}
    </div>
  );
};

export default MockInterviewPanel;



