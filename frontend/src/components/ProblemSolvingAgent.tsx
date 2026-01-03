import React, { useState, useRef } from 'react';
import { Code, Search, ExternalLink, Lightbulb, RefreshCw, Filter, FileCode, Building2, Send, Trophy, Clock, Database, Sparkles, CheckCircle, XCircle, AlertCircle, ChevronRight, List, PanelLeftClose, PanelLeft, RotateCcw, Check, X, GitCompare, Wand2 } from 'lucide-react';
import Editor, { DiffEditor } from '@monaco-editor/react';

interface CodingProblem {
  id: string;
  title: string;
  titleSlug?: string;
  description: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  source: 'LeetCode' | 'HackerRank' | 'Glassdoor' | 'Custom';
  url?: string;
  company?: string;
  tags: string[];
  hints?: string[];
  acceptanceRate?: string;
  needsFullDescription?: boolean;
}

interface CodeEvaluation {
  score: number;
  correctness: number;
  timeComplexity: { score: number; analysis: string };
  spaceComplexity: { score: number; analysis: string };
  codeQuality: { score: number; feedback: string[] };
  overallFeedback: string;
  suggestions: string[];
  suggestedCode?: string;
  testCases?: { input: string; expected: string; passed: boolean }[];
}

interface CodeHistory {
  problemId: string;
  language: string;
  code: string;
}

const ProblemSolvingAgent = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [problems, setProblems] = useState<CodingProblem[]>([]);
  const [selectedProblem, setSelectedProblem] = useState<CodingProblem | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [code, setCode] = useState<string>('// Write your solution here\nfunction solve() {\n  \n}');
  const [language, setLanguage] = useState<string>('javascript');
  const [hints, setHints] = useState<string[]>([]);
  const [showHints, setShowHints] = useState(false);
  const [isGeneratingHints, setIsGeneratingHints] = useState(false);
  const [difficulty, setDifficulty] = useState<string>('all');
  const [company, setCompany] = useState<string>('');
  const [evaluation, setEvaluation] = useState<CodeEvaluation | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [isPanelCollapsed, setIsPanelCollapsed] = useState(false);
  const [isLoadingDescription, setIsLoadingDescription] = useState(false);
  
  // Code preservation state
  const [codeHistory, setCodeHistory] = useState<Map<string, CodeHistory>>(new Map());
  const [showSwitchConfirm, setShowSwitchConfirm] = useState<{ type: 'problem' | 'language'; target: any } | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  // Code review state
  const [showDiffView, setShowDiffView] = useState(false);
  const [suggestedCode, setSuggestedCode] = useState<string>('');
  const [originalCode, setOriginalCode] = useState<string>('');
  const [isGeneratingSuggestion, setIsGeneratingSuggestion] = useState(false);
  
  // Method signature generation
  const [isGeneratingSignature, setIsGeneratingSignature] = useState(false);

  // Save status for DB persistence
  const [saveStatus, setSaveStatus] = useState<{ type: 'success' | 'warning' | 'error'; message: string } | null>(null);

  const [selectedList, setSelectedList] = useState<string>('');
  const [selectedSources, setSelectedSources] = useState<string[]>(['curated', 'leetcode', 'codeforces']);

  const suggestedQueries = [
    'two sum',
    'array problems',
    'dynamic programming',
    'binary search',
    'linked list',
    'binary tree',
    'graph algorithms',
    'sliding window'
  ];

  const topCompanies = [
    'Google', 'Microsoft', 'Amazon', 'Apple', 'Meta', 'Netflix', 'Uber', 'Airbnb', 'Stripe', 'Twitter'
  ];

  const curatedLists = [
    { id: 'blind75', name: 'Blind 75', description: 'Top FAANG interview problems', count: 75 },
    { id: 'neetcode150', name: 'NeetCode 150', description: 'Expanded curated list', count: 150 },
    { id: 'grind75', name: 'Grind 75', description: 'Optimized study plan', count: 75 }
  ];

  const problemSources = [
    { id: 'curated', name: 'Curated Lists', icon: '📋' },
    { id: 'leetcode', name: 'LeetCode', icon: '🟡' },
    { id: 'codeforces', name: 'Codeforces', icon: '🔵' },
    { id: 'hackerrank', name: 'HackerRank', icon: '🟢' }
  ];

  const toggleSource = (sourceId: string) => {
    setSelectedSources(prev => 
      prev.includes(sourceId) 
        ? prev.filter(s => s !== sourceId)
        : [...prev, sourceId]
    );
  };

  const difficultyColors = {
    Easy: 'text-green-400',
    Medium: 'text-yellow-400',
    Hard: 'text-red-400'
  };

  const difficultyBgColors = {
    Easy: 'bg-green-500/20 border-green-500/50',
    Medium: 'bg-yellow-500/20 border-yellow-500/50',
    Hard: 'bg-red-500/20 border-red-500/50'
  };

  // Language-specific code templates
  const codeTemplates: Record<string, (title: string) => string> = {
    javascript: (title) => `/**
 * ${title}
 * 
 * @param {*} input - Your input parameter
 * @return {*} - Your return value
 */
function solve(input) {
  // Write your solution here
  
}

// Test your solution
// console.log(solve(testInput));`,
    
    typescript: (title) => `/**
 * ${title}
 */
function solve(input: any): any {
  // Write your solution here
  
}

// Test your solution
// console.log(solve(testInput));`,
    
    python: (title) => `"""
${title}
"""
from typing import List, Optional

class Solution:
    def solve(self, input) -> None:
        """
        Write your solution here
        """
        pass

# Test your solution
# solution = Solution()
# print(solution.solve(test_input))`,
    
    java: (title) => `/**
 * ${title}
 */
class Solution {
    public void solve(Object input) {
        // Write your solution here
        
    }
    
    public static void main(String[] args) {
        Solution solution = new Solution();
        // Test your solution
        // solution.solve(testInput);
    }
}`,
    
    cpp: (title) => `/**
 * ${title}
 */
#include <iostream>
#include <vector>
#include <string>
using namespace std;

class Solution {
public:
    void solve() {
        // Write your solution here
        
    }
};

int main() {
    Solution solution;
    // Test your solution
    // solution.solve();
    return 0;
}`,
    
    csharp: (title) => `/**
 * ${title}
 */
using System;
using System.Collections.Generic;

public class Solution {
    public void Solve(object input) {
        // Write your solution here
        
    }
    
    public static void Main(string[] args) {
        var solution = new Solution();
        // Test your solution
        // solution.Solve(testInput);
    }
}`,
    
    go: (title) => `// ${title}
package main

import (
    "fmt"
)

func solve(input interface{}) interface{} {
    // Write your solution here
    
    return nil
}

func main() {
    // Test your solution
    // result := solve(testInput)
    // fmt.Println(result)
}`
  };

  // Get code template for current language and problem
  const getCodeTemplate = (lang: string, title: string): string => {
    const template = codeTemplates[lang];
    return template ? template(title) : `// ${title}\n// Write your solution here\n`;
  };

  // Check if code has meaningful changes (not just template)
  const hasCodeChanges = (): boolean => {
    if (!selectedProblem) return false;
    const template = getCodeTemplate(language, selectedProblem.title);
    return code.trim() !== template.trim() && code.trim().length > 20;
  };

  // Save current code to history
  const saveCodeToHistory = () => {
    if (selectedProblem && code.trim()) {
      const key = `${selectedProblem.id}-${language}`;
      setCodeHistory(prev => {
        const newMap = new Map(prev);
        newMap.set(key, {
          problemId: selectedProblem.id,
          language,
          code
        });
        return newMap;
      });
    }
  };

  // Get saved code from history
  const getSavedCode = (problemId: string, lang: string): string | null => {
    const key = `${problemId}-${lang}`;
    return codeHistory.get(key)?.code || null;
  };

  // Handle language change with confirmation
  const handleLanguageChange = (newLanguage: string) => {
    if (hasCodeChanges()) {
      setShowSwitchConfirm({ type: 'language', target: newLanguage });
    } else {
      performLanguageSwitch(newLanguage);
    }
  };

  // Actually perform the language switch
  const performLanguageSwitch = (newLanguage: string) => {
    saveCodeToHistory();
    setLanguage(newLanguage);
    if (selectedProblem) {
      // Check if we have saved code for this problem in the new language
      const savedCode = getSavedCode(selectedProblem.id, newLanguage);
      if (savedCode) {
        setCode(savedCode);
      } else {
        setCode(getCodeTemplate(newLanguage, selectedProblem.title));
      }
    }
    setShowSwitchConfirm(null);
    setHasUnsavedChanges(false);
  };

  // Generate method signature using AI
  const generateMethodSignature = async () => {
    if (!selectedProblem) return;
    
    setIsGeneratingSignature(true);
    try {
      const response = await fetch('http://localhost:5000/api/problems/signature', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          problemTitle: selectedProblem.title,
          problemDescription: selectedProblem.description,
          language
        })
      });
      
      const data = await response.json();
      if (data.signature) {
        setCode(data.signature);
        setHasUnsavedChanges(false);
      }
    } catch (error) {
      console.error('Failed to generate signature:', error);
    } finally {
      setIsGeneratingSignature(false);
    }
  };

  // Generate improved code from suggestions
  const generateImprovedCode = async () => {
    if (!selectedProblem || !evaluation || evaluation.suggestions.length === 0) return;
    
    setIsGeneratingSuggestion(true);
    try {
      const response = await fetch('http://localhost:5000/api/problems/improve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          problemTitle: selectedProblem.title,
          problemDescription: selectedProblem.description,
          currentCode: code,
          language,
          suggestions: evaluation.suggestions
        })
      });
      
      const data = await response.json();
      if (data.improvedCode) {
        setOriginalCode(code);
        setSuggestedCode(data.improvedCode);
        setShowDiffView(true);
      }
    } catch (error) {
      console.error('Failed to generate improved code:', error);
    } finally {
      setIsGeneratingSuggestion(false);
    }
  };

  // Apply suggested changes
  const applySuggestedChanges = () => {
    setCode(suggestedCode);
    setShowDiffView(false);
    setSuggestedCode('');
    setOriginalCode('');
    setHasUnsavedChanges(true);
  };

  // Revert to original code
  const revertChanges = () => {
    setShowDiffView(false);
    setSuggestedCode('');
    setOriginalCode('');
  };

  // Track code changes
  const handleCodeChange = (value: string | undefined) => {
    setCode(value || '');
    setHasUnsavedChanges(true);
  };

  // Format problem description with better styling
  const formatDescription = (description: string): React.ReactNode => {
    if (!description) return null;

    // Split by common patterns and format
    const lines = description.split('\n');
    const elements: React.ReactNode[] = [];
    let currentList: string[] = [];
    let isInExample = false;

    lines.forEach((line, index) => {
      const trimmedLine = line.trim();
      
      // Detect example sections
      if (trimmedLine.toLowerCase().startsWith('example') || trimmedLine.match(/^example\s*\d*:/i)) {
        if (currentList.length > 0) {
          elements.push(
            <ul key={`list-${index}`} className="list-disc list-inside space-y-1 my-2 text-slate-300">
              {currentList.map((item, i) => <li key={i}>{item}</li>)}
            </ul>
          );
          currentList = [];
        }
        isInExample = true;
        elements.push(
          <div key={`example-header-${index}`} className="mt-4 mb-2">
            <span className="text-cyan-400 font-semibold text-sm">{trimmedLine}</span>
          </div>
        );
        return;
      }

      // Detect Input/Output in examples
      if (trimmedLine.toLowerCase().startsWith('input:')) {
        elements.push(
          <div key={`input-${index}`} className="bg-slate-800/50 rounded px-3 py-1.5 my-1 font-mono text-xs">
            <span className="text-green-400">Input: </span>
            <span className="text-slate-200">{trimmedLine.replace(/^input:\s*/i, '')}</span>
          </div>
        );
        return;
      }

      if (trimmedLine.toLowerCase().startsWith('output:')) {
        elements.push(
          <div key={`output-${index}`} className="bg-slate-800/50 rounded px-3 py-1.5 my-1 font-mono text-xs">
            <span className="text-blue-400">Output: </span>
            <span className="text-slate-200">{trimmedLine.replace(/^output:\s*/i, '')}</span>
          </div>
        );
        return;
      }

      if (trimmedLine.toLowerCase().startsWith('explanation:')) {
        elements.push(
          <div key={`explanation-${index}`} className="text-slate-400 text-xs italic my-1 pl-2 border-l-2 border-slate-600">
            {trimmedLine.replace(/^explanation:\s*/i, '')}
          </div>
        );
        return;
      }

      // Detect constraints section
      if (trimmedLine.toLowerCase().startsWith('constraints:') || trimmedLine.toLowerCase() === 'constraints') {
        if (currentList.length > 0) {
          elements.push(
            <ul key={`list-${index}`} className="list-disc list-inside space-y-1 my-2 text-slate-300">
              {currentList.map((item, i) => <li key={i}>{item}</li>)}
            </ul>
          );
          currentList = [];
        }
        elements.push(
          <div key={`constraints-header-${index}`} className="mt-4 mb-2">
            <span className="text-amber-400 font-semibold text-sm">📋 Constraints</span>
          </div>
        );
        return;
      }

      // Detect bullet points or numbered lists
      if (trimmedLine.match(/^[-•*]\s/) || trimmedLine.match(/^\d+\.\s/)) {
        const content = trimmedLine.replace(/^[-•*]\s/, '').replace(/^\d+\.\s/, '');
        // Check if it's a constraint (contains comparison operators)
        if (content.match(/[<>≤≥=]/) || content.match(/\d+\s*(<=|>=|<|>|==)/)) {
          elements.push(
            <div key={`constraint-${index}`} className="bg-slate-800/30 rounded px-3 py-1 my-1 font-mono text-xs text-slate-300">
              {content}
            </div>
          );
        } else {
          currentList.push(content);
        }
        return;
      }

      // Regular paragraph
      if (trimmedLine.length > 0) {
        if (currentList.length > 0) {
          elements.push(
            <ul key={`list-${index}`} className="list-disc list-inside space-y-1 my-2 text-slate-300">
              {currentList.map((item, i) => <li key={i}>{item}</li>)}
            </ul>
          );
          currentList = [];
        }
        elements.push(
          <p key={`para-${index}`} className="text-slate-200 text-sm leading-relaxed mb-2">
            {trimmedLine}
          </p>
        );
      }
    });

    // Flush remaining list items
    if (currentList.length > 0) {
      elements.push(
        <ul key="list-final" className="list-disc list-inside space-y-1 my-2 text-slate-300">
          {currentList.map((item, i) => <li key={i}>{item}</li>)}
        </ul>
      );
    }

    return elements.length > 0 ? elements : (
      <p className="text-slate-200 text-sm leading-relaxed">{description}</p>
    );
  };

  const handleSearch = async () => {
    if (!searchQuery.trim() && !selectedList) return;

    try {
      setIsSearching(true);
      setProblems([]);
      setSelectedProblem(null);
      setHints([]);
      setShowHints(false);
      setEvaluation(null);

      const response = await fetch('http://localhost:5000/api/problems/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: searchQuery || 'all',
          difficulty: difficulty !== 'all' ? difficulty : undefined,
          company: company || undefined,
          source: selectedSources.length > 0 ? selectedSources : ['curated', 'leetcode'],
          list: selectedList || undefined
        })
      });

      const data = await response.json();
      if (!data.error) {
        setProblems(data.problems || []);
      }
    } catch (error: any) {
      console.error('Search failed:', error.message);
    } finally {
      setIsSearching(false);
    }
  };

  // Actually perform problem switch
  const performProblemSwitch = async (problem: CodingProblem) => {
    saveCodeToHistory();
    setSelectedProblem(problem);
    setHints([]);
    setShowHints(false);
    setEvaluation(null);
    setShowDiffView(false);
    setShowSwitchConfirm(null);
    
    // Check if we have saved code for this problem
    const savedCode = getSavedCode(problem.id, language);
    if (savedCode) {
      setCode(savedCode);
    } else {
      setCode(getCodeTemplate(language, problem.title));
    }
    setHasUnsavedChanges(false);

    // Load full description if needed
    if (problem.needsFullDescription && problem.titleSlug) {
      setIsLoadingDescription(true);
      try {
        const response = await fetch(`http://localhost:5000/api/problems/description/${problem.titleSlug}`);
        const data = await response.json();
        if (data.description) {
          // Update the problem with full description
          const updatedProblem = { ...problem, description: data.description, needsFullDescription: false };
          setSelectedProblem(updatedProblem);
          // Update in the list too
          setProblems(prev => prev.map(p => p.id === problem.id ? updatedProblem : p));
        }
      } catch (error) {
        console.error('Failed to load description:', error);
      } finally {
        setIsLoadingDescription(false);
      }
    }
  };

  const handleSelectProblem = async (problem: CodingProblem) => {
    // If same problem, do nothing
    if (selectedProblem?.id === problem.id) return;
    
    // If has unsaved changes, show confirmation
    if (hasCodeChanges()) {
      setShowSwitchConfirm({ type: 'problem', target: problem });
    } else {
      performProblemSwitch(problem);
    }
  };

  const handleSubmitCode = async () => {
    if (!selectedProblem || !code.trim()) return;

    try {
      setIsEvaluating(true);
      setEvaluation(null);
      setSaveStatus(null);

      const response = await fetch('http://localhost:5000/api/problems/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          problemTitle: selectedProblem.title,
          problemDescription: selectedProblem.description,
          code: code,
          language: language
        })
      });

      const data = await response.json();
      if (data.evaluation) {
        setEvaluation(data.evaluation);
        
        // Save to database after successful evaluation
        try {
          const saveResponse = await fetch('http://localhost:5000/api/problems/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              problemId: selectedProblem.id,
              title: selectedProblem.title,
              source: selectedProblem.source,
              difficulty: selectedProblem.difficulty,
              language: language,
              code: code,
              score: data.evaluation.score,
              topics: selectedProblem.tags || [],
              companyTags: selectedProblem.company ? [selectedProblem.company] : [],
              listTags: [],
              hints: hints.length > 0 ? 1 : 0
            })
          });
          
          const saveData = await saveResponse.json();
          if (saveData.success) {
            setSaveStatus({ type: 'success', message: 'Solution saved!' });
            // Clear status after 3 seconds
            setTimeout(() => setSaveStatus(null), 3000);
          } else {
            setSaveStatus({ type: 'warning', message: saveData.error || 'Could not save solution' });
          }
        } catch (saveError: any) {
          console.warn('Failed to save solution:', saveError.message);
          setSaveStatus({ type: 'warning', message: 'Evaluated but not saved (DB unavailable)' });
        }
      }
    } catch (error: any) {
      console.error('Failed to evaluate code:', error.message);
    } finally {
      setIsEvaluating(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-400';
    if (score >= 70) return 'text-emerald-400';
    if (score >= 50) return 'text-yellow-400';
    if (score >= 30) return 'text-orange-400';
    return 'text-red-400';
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 90) return 'bg-green-500/20 border-green-500/50';
    if (score >= 70) return 'bg-emerald-500/20 border-emerald-500/50';
    if (score >= 50) return 'bg-yellow-500/20 border-yellow-500/50';
    if (score >= 30) return 'bg-orange-500/20 border-orange-500/50';
    return 'bg-red-500/20 border-red-500/50';
  };

  const handleGenerateHints = async () => {
    if (!selectedProblem) return;

    try {
      setIsGeneratingHints(true);

      const response = await fetch('http://localhost:5000/api/problems/hints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          problemTitle: selectedProblem.title,
          problemDescription: selectedProblem.description
        })
      });

      const data = await response.json();
      if (data.hints) {
        setHints(data.hints);
        setShowHints(true);
      }
    } catch (error: any) {
      console.error('Failed to generate hints:', error.message);
    } finally {
      setIsGeneratingHints(false);
    }
  };

  const editorOptions = {
    minimap: { enabled: false },
    fontSize: 14,
    lineNumbers: 'on' as const,
    roundedSelection: false,
    scrollBeyondLastLine: false,
    automaticLayout: true,
    theme: 'vs-dark',
    wordWrap: 'on' as const
  };

  return (
    <div className="space-y-4">
      {/* Confirmation Dialog */}
      {showSwitchConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-slate-800 border border-white/20 rounded-xl p-6 max-w-md mx-4 shadow-2xl">
            <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-amber-400" />
              Unsaved Changes
            </h3>
            <p className="text-slate-300 text-sm mb-4">
              You have unsaved code changes. Do you want to save them before switching?
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowSwitchConfirm(null)}
                className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-sm transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (showSwitchConfirm.type === 'language') {
                    // Don't save, just switch
                    setLanguage(showSwitchConfirm.target);
                    if (selectedProblem) {
                      setCode(getCodeTemplate(showSwitchConfirm.target, selectedProblem.title));
                    }
                    setShowSwitchConfirm(null);
                    setHasUnsavedChanges(false);
                  } else {
                    // Don't save, just switch problem
                    performProblemSwitch(showSwitchConfirm.target);
                  }
                }}
                className="px-4 py-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-300 text-sm transition-colors"
              >
                Discard
              </button>
              <button
                onClick={() => {
                  if (showSwitchConfirm.type === 'language') {
                    performLanguageSwitch(showSwitchConfirm.target);
                  } else {
                    performProblemSwitch(showSwitchConfirm.target);
                  }
                }}
                className="px-4 py-2 rounded-lg bg-green-500/20 hover:bg-green-500/30 text-green-300 text-sm transition-colors"
              >
                Save & Switch
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="text-center mb-4">
        <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
          💻 Problem Solving Agent
        </h1>
        <p className="text-slate-300">Find coding problems and practice with an integrated IDE</p>
      </div>

      {/* Search Panel */}
      <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 border border-white/20">
        <div className="flex flex-col md:flex-row gap-3 mb-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Search problems (e.g., 'two sum', 'dynamic programming')"
              className="w-full bg-white/5 border border-white/20 rounded-lg pl-10 pr-4 py-2.5 text-white placeholder-slate-400 focus:outline-none focus:border-blue-400"
            />
          </div>
          <button
            onClick={handleSearch}
            disabled={isSearching}
            className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 px-6 py-2.5 rounded-lg transition-all disabled:opacity-50 font-semibold"
          >
            {isSearching ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
            {isSearching ? 'Searching...' : 'Search'}
          </button>
        </div>

        {/* Filters Row */}
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
              className="bg-white/5 border border-white/20 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:border-blue-400"
            >
              <option value="all">All Difficulty</option>
              <option value="Easy">Easy</option>
              <option value="Medium">Medium</option>
              <option value="Hard">Hard</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-slate-400" />
            <select
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              className="bg-white/5 border border-white/20 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:border-blue-400"
            >
              <option value="">Any Company</option>
              {topCompanies.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div className="flex-1" />

          {/* Quick suggestions */}
          <div className="flex flex-wrap gap-1">
            {suggestedQueries.slice(0, 4).map((query) => (
              <button
                key={query}
                onClick={() => { setSearchQuery(query); }}
                className="text-xs bg-white/5 hover:bg-white/10 border border-white/20 px-2 py-1 rounded-full transition-colors"
              >
                {query}
              </button>
            ))}
          </div>
        </div>

        {/* Curated Lists & Sources Row */}
        <div className="flex flex-wrap gap-3 items-center mt-3 pt-3 border-t border-white/10">
          {/* Curated Lists */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Lists:</span>
            <select
              value={selectedList}
              onChange={(e) => {
                setSelectedList(e.target.value);
                if (e.target.value) {
                  setSearchQuery('');
                }
              }}
              className="bg-white/5 border border-white/20 rounded-lg px-2 py-1 text-white text-xs focus:outline-none focus:border-blue-400"
            >
              <option value="">Custom Search</option>
              {curatedLists.map(list => (
                <option key={list.id} value={list.id}>
                  {list.name} ({list.count})
                </option>
              ))}
            </select>
          </div>

          <div className="w-px h-5 bg-white/20" />

          {/* Sources */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Sources:</span>
            <div className="flex gap-1">
              {problemSources.map(source => (
                <button
                  key={source.id}
                  onClick={() => toggleSource(source.id)}
                  className={`text-xs px-2 py-1 rounded-full transition-all ${
                    selectedSources.includes(source.id)
                      ? 'bg-blue-500/30 border border-blue-500/50 text-blue-300'
                      : 'bg-white/5 border border-white/20 text-slate-400 hover:bg-white/10'
                  }`}
                  title={source.name}
                >
                  {source.icon} {source.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - Three Column Layout */}
      {problems.length > 0 && (
        <div className="flex gap-4 h-[calc(100vh-320px)] min-h-[600px]">
          {/* Left Panel - Problem List (Collapsible) */}
          <div className={`transition-all duration-300 ${isPanelCollapsed ? 'w-12' : 'w-72'} flex-shrink-0`}>
            <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 h-full flex flex-col overflow-hidden">
              {/* Panel Header */}
              <div className="bg-white/5 px-3 py-2 flex items-center justify-between border-b border-white/10">
                {!isPanelCollapsed && (
                  <div className="flex items-center gap-2">
                    <List className="w-4 h-4 text-blue-400" />
                    <span className="text-sm font-semibold">{problems.length} Problems</span>
                  </div>
                )}
                <button
                  onClick={() => setIsPanelCollapsed(!isPanelCollapsed)}
                  className="p-1 hover:bg-white/10 rounded transition-colors"
                  title={isPanelCollapsed ? 'Expand panel' : 'Collapse panel'}
                >
                  {isPanelCollapsed ? <PanelLeft className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
                </button>
              </div>

              {/* Problem List */}
              {!isPanelCollapsed && (
                <div className="flex-1 overflow-y-auto">
                  {problems.map((problem) => (
                    <button
                      key={problem.id}
                      onClick={() => handleSelectProblem(problem)}
                      className={`w-full text-left p-3 border-b border-white/5 hover:bg-white/5 transition-colors ${
                        selectedProblem?.id === problem.id ? 'bg-blue-500/20 border-l-2 border-l-blue-400' : ''
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <ChevronRight className={`w-4 h-4 mt-0.5 flex-shrink-0 transition-transform ${
                          selectedProblem?.id === problem.id ? 'rotate-90 text-blue-400' : 'text-slate-500'
                        }`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-[10px] px-1.5 py-0.5 rounded ${difficultyBgColors[problem.difficulty]}`}>
                              {problem.difficulty[0]}
                            </span>
                            <span className="text-sm font-medium truncate">{problem.title}</span>
                          </div>
                          <div className="flex items-center gap-2 text-[10px] text-slate-500">
                            <span>{problem.source}</span>
                            {problem.acceptanceRate && <span>• {problem.acceptanceRate}%</span>}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Collapsed view - just difficulty indicators */}
              {isPanelCollapsed && (
                <div className="flex-1 overflow-y-auto py-1">
                  {problems.map((problem) => (
                    <button
                      key={problem.id}
                      onClick={() => handleSelectProblem(problem)}
                      className={`w-full p-2 transition-colors ${
                        selectedProblem?.id === problem.id ? 'bg-blue-500/30' : 'hover:bg-white/10'
                      }`}
                      title={problem.title}
                    >
                      <div className={`w-6 h-6 mx-auto rounded-full flex items-center justify-center text-[10px] font-bold ${difficultyBgColors[problem.difficulty]}`}>
                        {problem.difficulty[0]}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Middle Panel - Problem Details */}
          {selectedProblem && (
            <div className="w-96 flex-shrink-0 flex flex-col gap-4 overflow-y-auto">
              {/* Problem Header Card */}
              <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 border border-white/20">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h2 className="text-xl font-bold mb-2">{selectedProblem.title}</h2>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-xs px-2 py-1 rounded-full ${difficultyBgColors[selectedProblem.difficulty]}`}>
                        {selectedProblem.difficulty}
                      </span>
                      <span className="text-xs text-slate-400">{selectedProblem.source}</span>
                      {selectedProblem.acceptanceRate && (
                        <span className="text-xs text-slate-500">• {selectedProblem.acceptanceRate}% acceptance</span>
                      )}
                    </div>
                  </div>
                  {selectedProblem.url && (
                    <a
                      href={selectedProblem.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs bg-blue-500/20 hover:bg-blue-500/30 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      <ExternalLink className="w-3 h-3" />
                      Open
                    </a>
                  )}
                </div>

                {/* Tags */}
                {selectedProblem.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {selectedProblem.tags.map((tag, idx) => (
                      <span key={idx} className="text-[10px] bg-white/5 px-2 py-0.5 rounded-full text-slate-400">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Hints Button */}
                <button
                  onClick={handleGenerateHints}
                  disabled={isGeneratingHints}
                  className="flex items-center gap-2 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/50 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 text-sm"
                >
                  {isGeneratingHints ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Lightbulb className="w-4 h-4" />
                  )}
                  {isGeneratingHints ? 'Generating...' : 'Get Hints'}
                </button>
              </div>

              {/* Problem Description */}
              <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 border border-white/20 flex-1 overflow-y-auto">
                <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2 pb-2 border-b border-white/10">
                  <FileCode className="w-4 h-4 text-blue-400" />
                  Problem Description
                </h3>
                {isLoadingDescription ? (
                  <div className="flex items-center gap-2 text-slate-400 py-4">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Loading full description...
                  </div>
                ) : (
                  <div className="prose prose-sm prose-invert max-w-none text-left">
                    {formatDescription(selectedProblem.description)}
                  </div>
                )}
              </div>

              {/* Hints Section */}
              {showHints && hints.length > 0 && (
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
                  <h3 className="text-sm font-semibold text-amber-300 mb-2 flex items-center gap-2">
                    <Lightbulb className="w-4 h-4" />
                    Hints
                  </h3>
                  <ol className="space-y-2">
                    {hints.map((hint, idx) => (
                      <li key={idx} className="text-sm text-slate-200 flex items-start gap-2">
                        <span className="text-amber-400 font-semibold">{idx + 1}.</span>
                        <span>{hint}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </div>
          )}

          {/* Right Panel - Code Editor & Evaluation */}
          {selectedProblem && (
            <div className="flex-1 flex flex-col gap-4 min-w-0 overflow-hidden">
              {/* Code Editor */}
              <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 overflow-hidden flex-1 flex flex-col min-h-[300px]">
                <div className="bg-white/5 px-4 py-2 flex items-center justify-between border-b border-white/10 flex-shrink-0">
                  <div className="flex items-center gap-3">
                    <Code className="w-4 h-4 text-blue-400" />
                    <span className="text-sm font-semibold">Code Editor</span>
                    {hasUnsavedChanges && (
                      <span className="text-[10px] bg-amber-500/30 text-amber-300 px-1.5 py-0.5 rounded">
                        Unsaved
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={generateMethodSignature}
                      disabled={isGeneratingSignature || !selectedProblem}
                      className="flex items-center gap-1 bg-purple-500/20 hover:bg-purple-500/30 px-2 py-1 rounded text-xs transition-colors disabled:opacity-50"
                      title="Generate problem-specific method signature"
                    >
                      {isGeneratingSignature ? (
                        <RefreshCw className="w-3 h-3 animate-spin" />
                      ) : (
                        <Wand2 className="w-3 h-3" />
                      )}
                      Signature
                    </button>
                    <select
                      value={language}
                      onChange={(e) => handleLanguageChange(e.target.value)}
                      className="bg-white/5 border border-white/20 rounded px-2 py-1 text-white text-xs focus:outline-none focus:border-blue-400"
                    >
                      <option value="javascript">JavaScript</option>
                      <option value="typescript">TypeScript</option>
                      <option value="python">Python</option>
                      <option value="java">Java</option>
                      <option value="cpp">C++</option>
                      <option value="csharp">C#</option>
                      <option value="go">Go</option>
                    </select>
                    <button
                      onClick={handleSubmitCode}
                      disabled={isEvaluating || !code.trim() || showDiffView}
                      className="flex items-center gap-2 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 px-4 py-1.5 rounded-lg text-sm font-semibold transition-all disabled:opacity-50"
                    >
                      {isEvaluating ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          Evaluating...
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          Submit
                        </>
                      )}
                    </button>
                  </div>
                </div>
                <div className="flex-1 min-h-0">
                  {showDiffView ? (
                    <DiffEditor
                      height="100%"
                      language={language}
                      original={originalCode}
                      modified={suggestedCode}
                      theme="vs-dark"
                      options={{
                        readOnly: true,
                        renderSideBySide: true,
                        minimap: { enabled: false }
                      }}
                    />
                  ) : (
                    <Editor
                      height="100%"
                      language={language}
                      value={code}
                      onChange={handleCodeChange}
                      options={editorOptions}
                      theme="vs-dark"
                    />
                  )}
                </div>
                
                {/* Diff View Actions */}
                {showDiffView && (
                  <div className="bg-white/5 px-4 py-2 flex items-center justify-between border-t border-white/10">
                    <div className="flex items-center gap-2 text-sm text-slate-400">
                      <GitCompare className="w-4 h-4" />
                      <span>Reviewing suggested changes</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={revertChanges}
                        className="flex items-center gap-1 bg-red-500/20 hover:bg-red-500/30 px-3 py-1.5 rounded-lg text-sm transition-colors"
                      >
                        <X className="w-4 h-4" />
                        Reject
                      </button>
                      <button
                        onClick={applySuggestedChanges}
                        className="flex items-center gap-1 bg-green-500/20 hover:bg-green-500/30 px-3 py-1.5 rounded-lg text-sm transition-colors"
                      >
                        <Check className="w-4 h-4" />
                        Apply Changes
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Evaluation Results */}
              {evaluation && (
                <div className={`rounded-xl border p-4 ${getScoreBgColor(evaluation.score)} flex-shrink-0 max-h-[300px] overflow-y-auto`}>
                  {/* Score Header */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <Trophy className={`w-6 h-6 ${getScoreColor(evaluation.score)}`} />
                      <div>
                        <h3 className="text-lg font-bold">Evaluation Result</h3>
                        <div className="flex items-center gap-2">
                          <p className="text-xs text-slate-400">AI-powered code analysis</p>
                          {saveStatus && (
                            <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                              saveStatus.type === 'success' 
                                ? 'bg-green-500/30 text-green-300' 
                                : saveStatus.type === 'warning'
                                  ? 'bg-amber-500/30 text-amber-300'
                                  : 'bg-red-500/30 text-red-300'
                            }`}>
                              {saveStatus.message}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className={`text-4xl font-bold ${getScoreColor(evaluation.score)}`}>
                      {evaluation.score}
                      <span className="text-xl text-slate-400">/100</span>
                    </div>
                  </div>

                  {/* Score Breakdown */}
                  <div className="grid grid-cols-4 gap-2 mb-4">
                    <div className="bg-white/5 rounded-lg p-2 text-center">
                      <CheckCircle className={`w-4 h-4 mx-auto mb-1 ${getScoreColor(evaluation.correctness)}`} />
                      <div className={`text-sm font-bold ${getScoreColor(evaluation.correctness)}`}>{evaluation.correctness}%</div>
                      <div className="text-[10px] text-slate-400">Correct</div>
                    </div>
                    <div className="bg-white/5 rounded-lg p-2 text-center">
                      <Clock className={`w-4 h-4 mx-auto mb-1 ${getScoreColor(evaluation.timeComplexity.score)}`} />
                      <div className={`text-sm font-bold ${getScoreColor(evaluation.timeComplexity.score)}`}>{evaluation.timeComplexity.score}%</div>
                      <div className="text-[10px] text-slate-400">Time</div>
                    </div>
                    <div className="bg-white/5 rounded-lg p-2 text-center">
                      <Database className={`w-4 h-4 mx-auto mb-1 ${getScoreColor(evaluation.spaceComplexity.score)}`} />
                      <div className={`text-sm font-bold ${getScoreColor(evaluation.spaceComplexity.score)}`}>{evaluation.spaceComplexity.score}%</div>
                      <div className="text-[10px] text-slate-400">Space</div>
                    </div>
                    <div className="bg-white/5 rounded-lg p-2 text-center">
                      <Sparkles className={`w-4 h-4 mx-auto mb-1 ${getScoreColor(evaluation.codeQuality.score)}`} />
                      <div className={`text-sm font-bold ${getScoreColor(evaluation.codeQuality.score)}`}>{evaluation.codeQuality.score}%</div>
                      <div className="text-[10px] text-slate-400">Quality</div>
                    </div>
                  </div>

                  {/* Complexity */}
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <div className="bg-white/5 rounded-lg p-2">
                      <div className="text-[10px] text-slate-400 mb-1">Time Complexity</div>
                      <div className="text-xs font-mono text-cyan-400">{evaluation.timeComplexity.analysis}</div>
                    </div>
                    <div className="bg-white/5 rounded-lg p-2">
                      <div className="text-[10px] text-slate-400 mb-1">Space Complexity</div>
                      <div className="text-xs font-mono text-cyan-400">{evaluation.spaceComplexity.analysis}</div>
                    </div>
                  </div>

                  {/* Feedback */}
                  <div className="bg-white/5 rounded-lg p-3 mb-3">
                    <p className="text-xs text-slate-200">{evaluation.overallFeedback}</p>
                  </div>

                  {/* Suggestions */}
                  {evaluation.suggestions.length > 0 && (
                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-xs font-semibold text-amber-300 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          Suggestions
                        </h4>
                        <button
                          onClick={generateImprovedCode}
                          disabled={isGeneratingSuggestion || showDiffView}
                          className="flex items-center gap-1 bg-purple-500/30 hover:bg-purple-500/40 px-2 py-1 rounded text-[10px] font-semibold transition-colors disabled:opacity-50"
                          title="Apply suggestions and see diff"
                        >
                          {isGeneratingSuggestion ? (
                            <>
                              <RefreshCw className="w-3 h-3 animate-spin" />
                              Generating...
                            </>
                          ) : (
                            <>
                              <GitCompare className="w-3 h-3" />
                              Apply & Review
                            </>
                          )}
                        </button>
                      </div>
                      <ul className="space-y-1">
                        {evaluation.suggestions.slice(0, 3).map((suggestion, idx) => (
                          <li key={idx} className="flex items-start gap-1 text-[11px] text-slate-200">
                            <span className="text-amber-400">{idx + 1}.</span>
                            {suggestion}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Empty state when no problem selected */}
          {!selectedProblem && (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center text-slate-500">
                <Code className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg">Select a problem from the list</p>
                <p className="text-sm">to view details and start coding</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Empty State - No Search Results */}
      {problems.length === 0 && !isSearching && (
        <div className="bg-white/5 rounded-xl p-12 text-center">
          <Code className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-slate-400 mb-2">Start Solving Problems</h3>
          <p className="text-slate-500 mb-6">Search for coding problems from LeetCode, HackerRank, and more</p>
          <div className="flex flex-wrap justify-center gap-2">
            {suggestedQueries.map((query) => (
              <button
                key={query}
                onClick={() => { setSearchQuery(query); handleSearch(); }}
                className="text-sm bg-white/10 hover:bg-blue-500/20 border border-white/20 hover:border-blue-500/50 px-4 py-2 rounded-lg transition-colors"
              >
                {query}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProblemSolvingAgent;
