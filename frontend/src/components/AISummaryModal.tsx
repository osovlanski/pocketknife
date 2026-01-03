import React, { useState, useMemo } from 'react';
import { 
  X, Copy, Check, Sparkles, BookOpen, Lightbulb, AlertTriangle, 
  Code, Layers, Workflow, Target, Wrench, ChevronDown, ChevronRight,
  Box, ArrowRight, Zap, Shield, Cloud, Database, Server, Globe,
  GitBranch, Settings, CheckCircle, XCircle, Maximize2, Minimize2,
  Download, Share2
} from 'lucide-react';

interface AISummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  topic: string;
  summary: string;
  onCopy: (text: string) => void;
  isCopied: boolean;
}

interface ParsedSection {
  id: string;
  type: 'overview' | 'concepts' | 'architecture' | 'benefits' | 'usage' | 'workflow' | 'warnings' | 'tools' | 'comparison' | 'code' | 'other';
  title: string;
  icon: React.ReactNode;
  content: string[];
  isExpanded: boolean;
}

const AISummaryModal: React.FC<AISummaryModalProps> = ({
  isOpen,
  onClose,
  topic,
  summary,
  onCopy,
  isCopied
}) => {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['overview', 'concepts', 'architecture']));
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeTab, setActiveTab] = useState<'summary' | 'diagram' | 'notes'>('summary');

  // Parse the summary into structured sections
  const parsedSections = useMemo((): ParsedSection[] => {
    if (!summary) return [];

    const sections: ParsedSection[] = [];
    const lines = summary.split('\n');
    let currentSection: ParsedSection | null = null;
    let contentBuffer: string[] = [];

    const getSectionType = (title: string): ParsedSection['type'] => {
      const lower = title.toLowerCase();
      if (lower.includes('overview') || lower.includes('introduction') || lower.includes('what is')) return 'overview';
      if (lower.includes('concept') || lower.includes('core') || lower.includes('fundamental')) return 'concepts';
      if (lower.includes('architect') || lower.includes('design') || lower.includes('structure') || lower.includes('component')) return 'architecture';
      if (lower.includes('benefit') || lower.includes('advantage') || lower.includes('pro')) return 'benefits';
      if (lower.includes('usage') || lower.includes('use case') || lower.includes('example') || lower.includes('how to')) return 'usage';
      if (lower.includes('workflow') || lower.includes('process') || lower.includes('flow') || lower.includes('step')) return 'workflow';
      if (lower.includes('warning') || lower.includes('caution') || lower.includes('cons') || lower.includes('challenge')) return 'warnings';
      if (lower.includes('tool') || lower.includes('resource') || lower.includes('library')) return 'tools';
      if (lower.includes('compare') || lower.includes('vs') || lower.includes('difference')) return 'comparison';
      if (lower.includes('code') || lower.includes('syntax') || lower.includes('implementation')) return 'code';
      return 'other';
    };

    const getIconForType = (type: ParsedSection['type']): React.ReactNode => {
      const iconClass = "w-5 h-5";
      switch (type) {
        case 'overview': return <BookOpen className={iconClass} />;
        case 'concepts': return <Lightbulb className={iconClass} />;
        case 'architecture': return <Layers className={iconClass} />;
        case 'benefits': return <Zap className={iconClass} />;
        case 'usage': return <Target className={iconClass} />;
        case 'workflow': return <Workflow className={iconClass} />;
        case 'warnings': return <AlertTriangle className={iconClass} />;
        case 'tools': return <Wrench className={iconClass} />;
        case 'comparison': return <GitBranch className={iconClass} />;
        case 'code': return <Code className={iconClass} />;
        default: return <Box className={iconClass} />;
      }
    };

    const saveSection = () => {
      if (currentSection && contentBuffer.length > 0) {
        currentSection.content = contentBuffer.filter(l => l.trim());
        sections.push(currentSection);
        contentBuffer = [];
      }
    };

    lines.forEach((line, idx) => {
      // Detect section headers
      const isHeader = /^#{1,3}\s|^\*\*.*\*\*$|^[🔑📋💡⚠️📚📊🎯🔧✨]/.test(line.trim());
      
      if (isHeader) {
        saveSection();
        const title = line.replace(/^#{1,3}\s/, '').replace(/\*\*/g, '').replace(/^[🔑📋💡⚠️📚📊🎯🔧✨]\s*/, '').trim();
        const type = getSectionType(title);
        currentSection = {
          id: `section-${idx}`,
          type,
          title,
          icon: getIconForType(type),
          content: [],
          isExpanded: true
        };
      } else if (line.trim()) {
        contentBuffer.push(line);
      }
    });

    saveSection();

    // If no sections were parsed, create a single "Overview" section
    if (sections.length === 0 && summary.trim()) {
      sections.push({
        id: 'section-0',
        type: 'overview',
        title: 'Overview',
        icon: <BookOpen className="w-5 h-5" />,
        content: summary.split('\n').filter(l => l.trim()),
        isExpanded: true
      });
    }

    return sections;
  }, [summary]);

  // Extract key terms for a visual diagram
  const keyTerms = useMemo(() => {
    const techTerms = [
      'kubernetes', 'k8s', 'docker', 'container', 'pod', 'node', 'cluster', 
      'service', 'deployment', 'ingress', 'namespace', 'config', 'secret',
      'volume', 'persistent', 'replica', 'scale', 'helm', 'yaml', 'api',
      'controller', 'scheduler', 'etcd', 'kubelet', 'proxy', 'dashboard'
    ];
    
    const found = techTerms.filter(term => 
      summary.toLowerCase().includes(term)
    );
    
    return found.slice(0, 12);
  }, [summary]);

  const toggleSection = (id: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const renderContent = (content: string[]) => {
    return content.map((line, idx) => {
      // Bullet points
      if (line.trim().startsWith('•') || line.trim().startsWith('-') || line.trim().startsWith('*')) {
        const text = line.replace(/^[\s•\-*]+/, '').trim();
        return (
          <div key={idx} className="flex items-start gap-3 my-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-2 flex-shrink-0"></span>
            <span className="text-slate-300 leading-relaxed">{text}</span>
          </div>
        );
      }
      
      // Numbered items
      if (/^\d+\./.test(line.trim())) {
        const match = line.match(/^(\d+)\.\s*(.*)$/);
        if (match) {
          return (
            <div key={idx} className="flex items-start gap-3 my-1.5">
              <span className="w-6 h-6 rounded-full bg-gradient-to-br from-amber-500/30 to-orange-500/30 text-amber-300 text-xs flex items-center justify-center flex-shrink-0 font-semibold">
                {match[1]}
              </span>
              <span className="text-slate-300 leading-relaxed">{match[2]}</span>
            </div>
          );
        }
      }
      
      // Regular text
      return (
        <p key={idx} className="text-slate-300 leading-relaxed my-1.5">{line}</p>
      );
    });
  };

  const getSectionColor = (type: ParsedSection['type']) => {
    switch (type) {
      case 'overview': return 'from-blue-500/20 to-cyan-500/20 border-blue-500/30';
      case 'concepts': return 'from-amber-500/20 to-yellow-500/20 border-amber-500/30';
      case 'architecture': return 'from-purple-500/20 to-pink-500/20 border-purple-500/30';
      case 'benefits': return 'from-green-500/20 to-emerald-500/20 border-green-500/30';
      case 'usage': return 'from-cyan-500/20 to-blue-500/20 border-cyan-500/30';
      case 'workflow': return 'from-indigo-500/20 to-purple-500/20 border-indigo-500/30';
      case 'warnings': return 'from-red-500/20 to-orange-500/20 border-red-500/30';
      case 'tools': return 'from-slate-500/20 to-gray-500/20 border-slate-500/30';
      default: return 'from-slate-500/20 to-gray-500/20 border-slate-500/30';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div 
        className={`bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl border border-slate-700/50 shadow-2xl flex flex-col transition-all duration-300 ${
          isFullscreen ? 'w-full h-full' : 'w-full max-w-5xl h-[90vh]'
        }`}
      >
        {/* Header */}
        <div className="flex-shrink-0 bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-red-500/10 px-6 py-4 border-b border-slate-700/50 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 via-orange-500 to-red-500 flex items-center justify-center shadow-lg">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">AI Topic Summary</h2>
                <p className="text-sm text-slate-400 max-w-lg truncate">{topic}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {/* Tab Switcher */}
              <div className="flex bg-slate-800/50 rounded-lg p-1 mr-4">
                {(['summary', 'diagram', 'notes'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                      activeTab === tab
                        ? 'bg-amber-500/20 text-amber-300'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </button>
                ))}
              </div>
              
              <button
                onClick={() => onCopy(summary)}
                className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 px-3 py-2 rounded-lg transition-all"
              >
                {isCopied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                {isCopied ? 'Copied!' : 'Copy'}
              </button>
              <button
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-white/10 transition-all"
              >
                {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
              <button
                onClick={onClose}
                className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-white/10 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'summary' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {parsedSections.map((section) => (
                <div
                  key={section.id}
                  className={`bg-gradient-to-br ${getSectionColor(section.type)} backdrop-blur-sm rounded-xl border overflow-hidden ${
                    section.type === 'overview' || section.type === 'architecture' ? 'lg:col-span-2' : ''
                  }`}
                >
                  {/* Section Header */}
                  <button
                    onClick={() => toggleSection(section.id)}
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/5 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-amber-400">{section.icon}</span>
                      <h3 className="font-semibold text-white">{section.title}</h3>
                      <span className="text-xs text-slate-500 bg-slate-700/50 px-2 py-0.5 rounded-full">
                        {section.content.length} items
                      </span>
                    </div>
                    {expandedSections.has(section.id) ? (
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    )}
                  </button>
                  
                  {/* Section Content */}
                  {expandedSections.has(section.id) && (
                    <div className="px-4 pb-4 text-sm">
                      {renderContent(section.content)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {activeTab === 'diagram' && (
            <div className="space-y-6">
              {/* Architecture Diagram */}
              <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Layers className="w-5 h-5 text-purple-400" />
                  Architecture Overview
                </h3>
                
                {/* Visual Diagram */}
                <div className="relative bg-slate-900/50 rounded-xl p-8 min-h-[400px]">
                  {/* Central Node */}
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-xl shadow-amber-500/20">
                      <Cloud className="w-10 h-10 text-white" />
                    </div>
                    <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
                      <span className="text-sm font-semibold text-amber-300">Core System</span>
                    </div>
                  </div>
                  
                  {/* Surrounding Nodes */}
                  {keyTerms.slice(0, 8).map((term, idx) => {
                    const angle = (idx * 45) * (Math.PI / 180);
                    const radius = 140;
                    const x = Math.cos(angle) * radius;
                    const y = Math.sin(angle) * radius;
                    
                    const colors = [
                      'from-blue-500 to-cyan-500',
                      'from-purple-500 to-pink-500',
                      'from-green-500 to-emerald-500',
                      'from-red-500 to-orange-500',
                      'from-indigo-500 to-blue-500',
                      'from-yellow-500 to-amber-500',
                      'from-pink-500 to-rose-500',
                      'from-teal-500 to-cyan-500'
                    ];
                    
                    return (
                      <div
                        key={term}
                        className="absolute transform -translate-x-1/2 -translate-y-1/2"
                        style={{
                          top: `calc(50% + ${y}px)`,
                          left: `calc(50% + ${x}px)`
                        }}
                      >
                        {/* Connection Line */}
                        <div 
                          className="absolute bg-gradient-to-r from-amber-500/30 to-transparent h-0.5"
                          style={{
                            width: `${radius - 50}px`,
                            transformOrigin: 'left center',
                            transform: `rotate(${180 + (idx * 45)}deg)`,
                            left: '50%',
                            top: '50%'
                          }}
                        />
                        
                        <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${colors[idx]} flex items-center justify-center shadow-lg`}>
                          {idx % 4 === 0 ? <Server className="w-7 h-7 text-white" /> :
                           idx % 4 === 1 ? <Database className="w-7 h-7 text-white" /> :
                           idx % 4 === 2 ? <Shield className="w-7 h-7 text-white" /> :
                           <Settings className="w-7 h-7 text-white" />}
                        </div>
                        <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
                          <span className="text-xs text-slate-400 capitalize">{term}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Flow Diagram */}
              <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Workflow className="w-5 h-5 text-indigo-400" />
                  Workflow Process
                </h3>
                
                <div className="flex items-center justify-between gap-4 overflow-x-auto py-4">
                  {['Input', 'Process', 'Validate', 'Transform', 'Output'].map((step, idx, arr) => (
                    <React.Fragment key={step}>
                      <div className="flex flex-col items-center gap-2 flex-shrink-0">
                        <div className={`w-16 h-16 rounded-xl flex items-center justify-center ${
                          idx === 0 ? 'bg-green-500/20 border border-green-500/50' :
                          idx === arr.length - 1 ? 'bg-blue-500/20 border border-blue-500/50' :
                          'bg-slate-700/50 border border-slate-600/50'
                        }`}>
                          <span className="text-2xl font-bold text-white">{idx + 1}</span>
                        </div>
                        <span className="text-sm text-slate-300 font-medium">{step}</span>
                      </div>
                      {idx < arr.length - 1 && (
                        <ArrowRight className="w-6 h-6 text-slate-500 flex-shrink-0" />
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </div>

              {/* Key Concepts Grid */}
              {keyTerms.length > 0 && (
                <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <Box className="w-5 h-5 text-cyan-400" />
                    Key Components
                  </h3>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {keyTerms.map((term, idx) => (
                      <div 
                        key={term}
                        className="bg-gradient-to-br from-slate-700/50 to-slate-800/50 rounded-lg p-3 border border-slate-600/30 hover:border-amber-500/30 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-green-400" />
                          <span className="text-sm text-white capitalize font-medium">{term}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'notes' && (
            <div className="space-y-4">
              <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-amber-400" />
                  Study Notes
                </h3>
                
                {/* Quick Reference Card */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4">
                    <h4 className="text-sm font-semibold text-green-400 mb-2 flex items-center gap-2">
                      <CheckCircle className="w-4 h-4" />
                      Key Takeaways
                    </h4>
                    <ul className="space-y-1 text-sm text-slate-300">
                      {parsedSections.slice(0, 3).map((section, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="text-green-400 mt-1">✓</span>
                          <span>{section.title}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
                    <h4 className="text-sm font-semibold text-amber-400 mb-2 flex items-center gap-2">
                      <Lightbulb className="w-4 h-4" />
                      Remember
                    </h4>
                    <ul className="space-y-1 text-sm text-slate-300">
                      {keyTerms.slice(0, 4).map((term, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="text-amber-400 mt-1">★</span>
                          <span className="capitalize">{term}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
                
                {/* Full Summary Text */}
                <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-700/30">
                  <h4 className="text-sm font-semibold text-slate-400 mb-3">Full Summary</h4>
                  <div className="prose prose-sm prose-invert max-w-none text-slate-300 leading-relaxed whitespace-pre-wrap">
                    {summary}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 px-6 py-3 bg-slate-800/50 border-t border-slate-700/50 rounded-b-2xl">
          <div className="flex items-center justify-between text-sm text-slate-500">
            <span>Generated by AI • {parsedSections.length} sections • {summary.split(' ').length} words</span>
            <div className="flex items-center gap-2">
              <button className="flex items-center gap-1 hover:text-slate-300 transition-colors">
                <Download className="w-4 h-4" />
                Export
              </button>
              <button className="flex items-center gap-1 hover:text-slate-300 transition-colors">
                <Share2 className="w-4 h-4" />
                Share
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AISummaryModal;

