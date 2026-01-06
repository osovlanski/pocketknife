/**
 * useProblems Hook
 * 
 * Custom hook for managing Problem Solving agent state and logic.
 * Separates business logic from presentation.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

export interface Problem {
  id: string;
  title: string;
  description: string;
  difficulty: 'easy' | 'medium' | 'hard';
  category: string;
  tags: string[];
  solution?: string;
  hints?: string[];
  examples?: { input: string; output: string }[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
}

export interface UseProblemsReturn {
  // State
  problems: Problem[];
  selectedProblem: Problem | null;
  chatMessages: ChatMessage[];
  userInput: string;
  isLoading: boolean;
  isStreaming: boolean;
  selectedCategory: string;
  selectedDifficulty: string;
  showHints: boolean;
  showSolution: boolean;
  currentHintIndex: number;
  searchQuery: string;
  
  // Setters
  setUserInput: (input: string) => void;
  setSelectedCategory: (category: string) => void;
  setSelectedDifficulty: (difficulty: string) => void;
  setShowHints: (show: boolean) => void;
  setShowSolution: (show: boolean) => void;
  setSearchQuery: (query: string) => void;
  
  // Actions
  selectProblem: (problem: Problem) => void;
  clearSelectedProblem: () => void;
  sendMessage: () => Promise<void>;
  stopStreaming: () => void;
  showNextHint: () => void;
  resetHints: () => void;
  loadProblems: (category?: string, difficulty?: string) => Promise<void>;
  searchProblems: (query: string) => Promise<void>;
  
  // Computed
  filteredProblems: Problem[];
  categories: string[];
  difficulties: string[];
}

const API_BASE = 'http://localhost:5000/api';

export const useProblems = (): UseProblemsReturn => {
  const [problems, setProblems] = useState<Problem[]>([]);
  const [selectedProblem, setSelectedProblem] = useState<Problem | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [userInput, setUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState('all');
  const [showHints, setShowHints] = useState(false);
  const [showSolution, setShowSolution] = useState(false);
  const [currentHintIndex, setCurrentHintIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  
  const socketRef = useRef<Socket | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const categories = ['all', 'arrays', 'strings', 'linked-lists', 'trees', 'graphs', 'dynamic-programming', 'backtracking', 'sorting', 'searching'];
  const difficulties = ['all', 'easy', 'medium', 'hard'];

  // Socket connection for streaming
  useEffect(() => {
    socketRef.current = io('http://localhost:5000');
    
    socketRef.current.on('problem-stream', (data: { content: string; done: boolean }) => {
      if (data.done) {
        setIsStreaming(false);
        setChatMessages(prev => {
          const updated = [...prev];
          const lastIndex = updated.length - 1;
          if (lastIndex >= 0 && updated[lastIndex].isStreaming) {
            updated[lastIndex] = { ...updated[lastIndex], isStreaming: false };
          }
          return updated;
        });
      } else {
        setChatMessages(prev => {
          const updated = [...prev];
          const lastIndex = updated.length - 1;
          if (lastIndex >= 0 && updated[lastIndex].role === 'assistant') {
            updated[lastIndex] = {
              ...updated[lastIndex],
              content: updated[lastIndex].content + data.content
            };
          }
          return updated;
        });
      }
    });

    return () => {
      socketRef.current?.disconnect();
    };
  }, []);

  // Load problems on mount
  useEffect(() => {
    loadProblems();
  }, []);

  const loadProblems = useCallback(async (category?: string, difficulty?: string) => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (category && category !== 'all') params.set('category', category);
      if (difficulty && difficulty !== 'all') params.set('difficulty', difficulty);
      
      const response = await fetch(`${API_BASE}/problems?${params.toString()}`);
      const data = await response.json();
      setProblems(data.problems || []);
    } catch (error) {
      console.error('Failed to load problems:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const searchProblems = useCallback(async (query: string) => {
    if (!query.trim()) {
      loadProblems(selectedCategory, selectedDifficulty);
      return;
    }
    
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE}/problems/search?q=${encodeURIComponent(query)}`);
      const data = await response.json();
      setProblems(data.problems || []);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setIsLoading(false);
    }
  }, [selectedCategory, selectedDifficulty, loadProblems]);

  const selectProblem = useCallback((problem: Problem) => {
    setSelectedProblem(problem);
    setChatMessages([]);
    setCurrentHintIndex(0);
    setShowHints(false);
    setShowSolution(false);
    
    // Add initial assistant message
    setChatMessages([{
      id: Date.now().toString(),
      role: 'assistant',
      content: `I'm ready to help you solve "${problem.title}"! You can ask me questions about the approach, request hints, or discuss your solution. What would you like to know?`,
      timestamp: new Date()
    }]);
  }, []);

  const clearSelectedProblem = useCallback(() => {
    setSelectedProblem(null);
    setChatMessages([]);
    setCurrentHintIndex(0);
    setShowHints(false);
    setShowSolution(false);
  }, []);

  const sendMessage = useCallback(async () => {
    if (!userInput.trim() || !selectedProblem || isStreaming) return;
    
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: userInput,
      timestamp: new Date()
    };
    
    setChatMessages(prev => [...prev, userMessage]);
    setUserInput('');
    setIsStreaming(true);
    
    // Add placeholder for assistant response
    const assistantMessage: ChatMessage = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isStreaming: true
    };
    setChatMessages(prev => [...prev, assistantMessage]);
    
    try {
      abortControllerRef.current = new AbortController();
      
      const response = await fetch(`${API_BASE}/problems/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          problemId: selectedProblem.id,
          message: userInput,
          history: chatMessages.map(m => ({ role: m.role, content: m.content }))
        }),
        signal: abortControllerRef.current.signal
      });
      
      if (!response.ok) throw new Error('Chat failed');
      
      const data = await response.json();
      
      setChatMessages(prev => {
        const updated = [...prev];
        const lastIndex = updated.length - 1;
        if (lastIndex >= 0) {
          updated[lastIndex] = {
            ...updated[lastIndex],
            content: data.response,
            isStreaming: false
          };
        }
        return updated;
      });
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error('Chat error:', error);
        setChatMessages(prev => {
          const updated = [...prev];
          const lastIndex = updated.length - 1;
          if (lastIndex >= 0) {
            updated[lastIndex] = {
              ...updated[lastIndex],
              content: 'Sorry, I encountered an error. Please try again.',
              isStreaming: false
            };
          }
          return updated;
        });
      }
    } finally {
      setIsStreaming(false);
    }
  }, [userInput, selectedProblem, chatMessages, isStreaming]);

  const stopStreaming = useCallback(() => {
    abortControllerRef.current?.abort();
    setIsStreaming(false);
  }, []);

  const showNextHint = useCallback(() => {
    if (selectedProblem?.hints && currentHintIndex < selectedProblem.hints.length - 1) {
      setCurrentHintIndex(prev => prev + 1);
    }
  }, [selectedProblem, currentHintIndex]);

  const resetHints = useCallback(() => {
    setCurrentHintIndex(0);
    setShowHints(false);
  }, []);

  // Computed
  const filteredProblems = problems.filter(problem => {
    const matchesCategory = selectedCategory === 'all' || problem.category === selectedCategory;
    const matchesDifficulty = selectedDifficulty === 'all' || problem.difficulty === selectedDifficulty;
    const matchesSearch = !searchQuery || 
      problem.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      problem.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesDifficulty && matchesSearch;
  });

  return {
    problems,
    selectedProblem,
    chatMessages,
    userInput,
    isLoading,
    isStreaming,
    selectedCategory,
    selectedDifficulty,
    showHints,
    showSolution,
    currentHintIndex,
    searchQuery,
    setUserInput,
    setSelectedCategory,
    setSelectedDifficulty,
    setShowHints,
    setShowSolution,
    setSearchQuery,
    selectProblem,
    clearSelectedProblem,
    sendMessage,
    stopStreaming,
    showNextHint,
    resetHints,
    loadProblems,
    searchProblems,
    filteredProblems,
    categories,
    difficulties
  };
};

export default useProblems;



