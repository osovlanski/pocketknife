/**
 * LanguageContext
 * 
 * Provides language context for i18n (internationalization) support.
 * Currently English-only, but infrastructure ready for future expansion.
 */

import React, { createContext, useContext, useCallback, ReactNode } from 'react';

// Import translation files
import en from './translations/en.json';

// =============================================================================
// TYPES
// =============================================================================

export type SupportedLanguage = 'en';

export interface LanguageInfo {
  code: SupportedLanguage;
  name: string;
  nativeName: string;
  direction: 'ltr' | 'rtl';
  flag: string;
}

export interface LanguageContextType {
  /** Current language code */
  language: SupportedLanguage;
  /** Language information including name and direction */
  languageInfo: LanguageInfo;
  /** List of all supported languages */
  supportedLanguages: LanguageInfo[];
  /** Change the current language (no-op for now, single language) */
  setLanguage: (lang: SupportedLanguage) => void;
  /** Translate a key with optional interpolation */
  t: (key: string, params?: Record<string, string | number>) => string;
  /** Check if current language is RTL */
  isRTL: boolean;
}

// =============================================================================
// CONSTANTS
// =============================================================================

export const SUPPORTED_LANGUAGES: LanguageInfo[] = [
  { code: 'en', name: 'English', nativeName: 'English', direction: 'ltr', flag: '🇬🇧' },
];

const TRANSLATIONS: Record<SupportedLanguage, Record<string, any>> = {
  en,
};

const DEFAULT_LANGUAGE: SupportedLanguage = 'en';

// =============================================================================
// CONTEXT
// =============================================================================

const LanguageContext = createContext<LanguageContextType | null>(null);

// =============================================================================
// PROVIDER
// =============================================================================

interface LanguageProviderProps {
  children: ReactNode;
}

export const LanguageProvider: React.FC<LanguageProviderProps> = ({ children }) => {
  // Fixed to English only
  const language: SupportedLanguage = DEFAULT_LANGUAGE;
  const languageInfo = SUPPORTED_LANGUAGES[0];
  const isRTL = false;

  // No-op for now since we only support English
  const setLanguage = useCallback((_lang: SupportedLanguage) => {
    // Future: implement language switching
  }, []);

  // Translation function with nested key support and interpolation
  const t = useCallback((key: string, params?: Record<string, string | number>): string => {
    const translations = TRANSLATIONS[language];
    
    // Navigate nested keys (e.g., 'common.search' -> translations.common.search)
    const keys = key.split('.');
    let value: any = translations;
    
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        // Key not found - return the key itself
        return key;
      }
    }

    // If value is not a string, return the key
    if (typeof value !== 'string') {
      return key;
    }

    // Interpolate parameters (e.g., 'Hello {name}' with { name: 'John' } -> 'Hello John')
    if (params) {
      return value.replace(/\{(\w+)\}/g, (_, paramKey) => {
        return params[paramKey]?.toString() || `{${paramKey}}`;
      });
    }

    return value;
  }, [language]);

  const contextValue: LanguageContextType = {
    language,
    languageInfo,
    supportedLanguages: SUPPORTED_LANGUAGES,
    setLanguage,
    t,
    isRTL,
  };

  return (
    <LanguageContext.Provider value={contextValue}>
      {children}
    </LanguageContext.Provider>
  );
};

// =============================================================================
// HOOK
// =============================================================================

export const useTranslation = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  
  if (!context) {
    throw new Error('useTranslation must be used within a LanguageProvider');
  }
  
  return context;
};

// Alias for convenience
export const useLanguage = useTranslation;

export default LanguageContext;
