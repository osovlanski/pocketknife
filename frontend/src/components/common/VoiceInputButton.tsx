/**
 * VoiceInputButton Component
 * 
 * A reusable button that provides voice-to-text input functionality.
 * Shows recording state with visual feedback and handles speech recognition.
 */

import React, { useEffect } from 'react';
import { Mic, MicOff, Loader2 } from 'lucide-react';
import useVoiceInput from '../../hooks/useVoiceInput';

interface VoiceInputButtonProps {
  /** Callback when voice transcription is complete */
  onTranscript: (text: string) => void;
  /** Optional callback for interim results (while speaking) */
  onInterimTranscript?: (text: string) => void;
  /** Language code for speech recognition */
  language?: string;
  /** Additional CSS classes */
  className?: string;
  /** Button size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Tooltip text */
  title?: string;
  /** Disabled state */
  disabled?: boolean;
  /** Show text label next to icon */
  showLabel?: boolean;
  /** Custom aria-label */
  ariaLabel?: string;
}

const sizeClasses = {
  sm: 'w-8 h-8',
  md: 'w-10 h-10',
  lg: 'w-12 h-12'
};

const iconSizes = {
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-6 h-6'
};

const VoiceInputButton: React.FC<VoiceInputButtonProps> = ({
  onTranscript,
  onInterimTranscript,
  language,
  className = '',
  size = 'md',
  title = 'Voice input',
  disabled = false,
  showLabel = false,
  ariaLabel = 'Toggle voice input'
}) => {
  const {
    isSupported,
    isListening,
    transcript,
    error,
    toggleListening,
    stopListening
  } = useVoiceInput({
    language,
    onResult: onTranscript,
    onInterimResult: onInterimTranscript
  });

  // Don't render if not supported
  if (!isSupported) {
    return null;
  }

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleListening();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggleListening();
    }
    if (e.key === 'Escape' && isListening) {
      stopListening();
    }
  };

  const buttonClasses = [
    'relative flex items-center justify-center gap-2',
    'rounded-lg transition-all duration-200',
    'focus:outline-none focus:ring-2 focus:ring-offset-2',
    showLabel ? 'px-3 py-2' : sizeClasses[size],
    isListening
      ? 'bg-red-500 hover:bg-red-600 text-white focus:ring-red-500 animate-pulse'
      : 'bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white focus:ring-blue-500 border border-white/20',
    disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
    className
  ].join(' ');

  return (
    <button
      type="button"
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      disabled={disabled}
      className={buttonClasses}
      title={error || title}
      aria-label={ariaLabel}
      aria-pressed={isListening}
      tabIndex={0}
    >
      {isListening ? (
        <>
          <div className="absolute inset-0 rounded-lg bg-red-500/30 animate-ping" />
          <Mic className={`${iconSizes[size]} relative z-10`} />
          {showLabel && <span className="text-sm font-medium relative z-10">Listening...</span>}
        </>
      ) : (
        <>
          <Mic className={iconSizes[size]} />
          {showLabel && <span className="text-sm font-medium">Voice</span>}
        </>
      )}
    </button>
  );
};

export default VoiceInputButton;

