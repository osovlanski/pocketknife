import { useState, useCallback, useEffect, useRef } from 'react';

interface AutocompleteSuggestion {
  text: string;
  isHistory: boolean;
}

interface UseAutocompleteOptions {
  agent: string;
  debounceMs?: number;
  minChars?: number;
  maxSuggestions?: number;
}

interface UseAutocompleteResult {
  suggestions: AutocompleteSuggestion[];
  isLoading: boolean;
  showSuggestions: boolean;
  setShowSuggestions: (show: boolean) => void;
  fetchSuggestions: (query: string) => void;
  recordSearch: (query: string) => void;
  selectSuggestion: (suggestion: AutocompleteSuggestion) => string;
}

const API_BASE = 'http://localhost:5000/api';

export const useAutocomplete = (options: UseAutocompleteOptions): UseAutocompleteResult => {
  const { 
    agent, 
    debounceMs = 200, 
    minChars = 2, 
    maxSuggestions = 8 
  } = options;

  const [suggestions, setSuggestions] = useState<AutocompleteSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchSuggestions = useCallback((query: string) => {
    // Clear previous debounce
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Don't fetch for short queries
    if (query.length < minChars) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      try {
        setIsLoading(true);
        abortControllerRef.current = new AbortController();

        const response = await fetch(
          `${API_BASE}/autocomplete?q=${encodeURIComponent(query)}&agent=${agent}&limit=${maxSuggestions}`,
          { signal: abortControllerRef.current.signal }
        );

        if (response.ok) {
          const data = await response.json();
          setSuggestions(data.suggestions || []);
          setShowSuggestions(data.suggestions?.length > 0);
        }
      } catch (error: any) {
        if (error.name !== 'AbortError') {
          console.warn('Autocomplete fetch failed:', error);
        }
      } finally {
        setIsLoading(false);
      }
    }, debounceMs);
  }, [agent, debounceMs, minChars, maxSuggestions]);

  const recordSearch = useCallback(async (query: string) => {
    if (!query.trim()) return;

    try {
      await fetch(`${API_BASE}/autocomplete/record`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, agent })
      });
    } catch (error) {
      console.warn('Failed to record search:', error);
    }
  }, [agent]);

  const selectSuggestion = useCallback((suggestion: AutocompleteSuggestion): string => {
    setShowSuggestions(false);
    setSuggestions([]);
    return suggestion.text;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    suggestions,
    isLoading,
    showSuggestions,
    setShowSuggestions,
    fetchSuggestions,
    recordSearch,
    selectSuggestion
  };
};

export default useAutocomplete;




