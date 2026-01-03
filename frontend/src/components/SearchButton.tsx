import React from 'react';
import { Search, StopCircle, Play, Square } from 'lucide-react';

interface SearchButtonProps {
  isSearching: boolean;
  isStopping: boolean;
  onStart: () => void;
  onStop: () => void;
  disabled?: boolean;
  searchLabel?: string;
  searchingLabel?: string;
  stopLabel?: string;
  stoppingLabel?: string;
  variant?: 'search' | 'process';
  className?: string;
}

/**
 * Reusable search/process button with stop functionality.
 * Use across all agents that have search or processing logic.
 */
const SearchButton: React.FC<SearchButtonProps> = ({
  isSearching,
  isStopping,
  onStart,
  onStop,
  disabled = false,
  searchLabel = 'Search',
  searchingLabel = 'Searching...',
  stopLabel = 'Stop',
  stoppingLabel = 'Stopping...',
  variant = 'search',
  className = ''
}) => {
  const isProcess = variant === 'process';
  const StartIcon = isProcess ? Play : Search;
  const StopIcon = isProcess ? Square : StopCircle;

  const baseGradient = isProcess
    ? 'from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600'
    : 'from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600';

  return (
    <div className={`flex gap-2 ${className}`}>
      <button
        onClick={onStart}
        disabled={disabled || isSearching}
        className={`flex-1 flex items-center justify-center gap-2 bg-gradient-to-r ${baseGradient} px-6 py-3 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed font-semibold`}
      >
        {isSearching ? (
          <>
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            {searchingLabel}
          </>
        ) : (
          <>
            <StartIcon className="w-5 h-5" />
            {searchLabel}
          </>
        )}
      </button>

      {isSearching && (
        <button
          onClick={onStop}
          disabled={isStopping}
          className="flex items-center justify-center gap-2 bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600 px-6 py-3 rounded-lg transition-all font-semibold disabled:opacity-50"
          title={stopLabel}
        >
          {isStopping ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              {stoppingLabel}
            </>
          ) : (
            <>
              <StopIcon className="w-5 h-5" />
              {stopLabel}
            </>
          )}
        </button>
      )}
    </div>
  );
};

export default SearchButton;


