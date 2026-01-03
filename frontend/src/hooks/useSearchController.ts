import { useState, useRef, useCallback, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';

type AgentType = 'email' | 'jobs' | 'travel' | 'learning' | 'problems';

export interface SearchControllerState {
  isSearching: boolean;
  isStopping: boolean;
}

export interface SearchController {
  state: SearchControllerState;
  start: () => AbortController;
  stop: () => void;
  reset: () => void;
  getSignal: () => AbortSignal | undefined;
}

// Shared socket instance for all controllers
let sharedSocket: Socket | null = null;

const getSocket = (): Socket => {
  if (!sharedSocket) {
    sharedSocket = io('http://localhost:5000');
    
    // Listen for process status updates from backend
    sharedSocket.on('process-status', (data: { agent: AgentType; status: string }) => {
      console.log(`📡 Process status: ${data.agent} -> ${data.status}`);
    });
  }
  return sharedSocket;
};

/**
 * Global hook for managing search/processing operations with stop functionality.
 * Sends stop signals to the backend via Socket.io to actually halt processing.
 * Use this across all agents that have search or processing logic.
 * 
 * @param agentType - The type of agent (email, jobs, travel, learning, problems)
 * 
 * @example
 * const searchController = useSearchController('jobs');
 * 
 * const handleSearch = async () => {
 *   const controller = searchController.start();
 *   try {
 *     await fetch('/api/search', { signal: controller.signal });
 *   } catch (error) {
 *     if (error.name === 'AbortError') {
 *       console.log('Search was stopped');
 *     }
 *   } finally {
 *     searchController.reset();
 *   }
 * };
 */
export const useSearchController = (agentType: AgentType = 'jobs'): SearchController => {
  const [state, setState] = useState<SearchControllerState>({
    isSearching: false,
    isStopping: false
  });
  
  const abortControllerRef = useRef<AbortController | null>(null);
  const socketRef = useRef<Socket | null>(null);

  // Initialize socket connection
  useEffect(() => {
    socketRef.current = getSocket();
    
    // Listen for process completion from this agent
    const handleStatus = (data: { agent: AgentType; status: string }) => {
      if (data.agent === agentType) {
        if (data.status === 'stopped' || data.status === 'completed') {
          setState({
            isSearching: false,
            isStopping: false
          });
          abortControllerRef.current = null;
        }
      }
    };
    
    socketRef.current.on('process-status', handleStatus);
    
    return () => {
      socketRef.current?.off('process-status', handleStatus);
    };
  }, [agentType]);

  const start = useCallback((): AbortController => {
    // Create new abort controller
    const controller = new AbortController();
    abortControllerRef.current = controller;
    
    setState({
      isSearching: true,
      isStopping: false
    });
    
    // Notify backend that we're starting
    socketRef.current?.emit('start-process', { agent: agentType });
    
    return controller;
  }, [agentType]);

  const stop = useCallback(() => {
    if (!state.isStopping && state.isSearching) {
      setState(prev => ({ ...prev, isStopping: true }));
      
      // Send stop signal to backend via Socket.io
      socketRef.current?.emit('stop-process', { agent: agentType });
      console.log(`🛑 Stop signal sent for ${agentType} agent`);
      
      // Also abort the fetch request on frontend side
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      
      // Auto-reset after timeout if backend doesn't respond
      setTimeout(() => {
        setState(prev => {
          // Only reset if still in stopping state
          if (prev.isStopping) {
            return {
              isSearching: false,
              isStopping: false
            };
          }
          return prev;
        });
        abortControllerRef.current = null;
      }, 3000); // 3 second timeout
    }
  }, [agentType, state.isStopping, state.isSearching]);

  const reset = useCallback(() => {
    setState({
      isSearching: false,
      isStopping: false
    });
    abortControllerRef.current = null;
  }, []);

  const getSignal = useCallback((): AbortSignal | undefined => {
    return abortControllerRef.current?.signal;
  }, []);

  return {
    state,
    start,
    stop,
    reset,
    getSignal
  };
};

export default useSearchController;

