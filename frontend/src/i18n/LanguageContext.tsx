/**
 * LanguageContext
 * 
 * Provides language context for i18n (internationalization) support.
 * Stores the current language and provides translation functions.
 */

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

// Import translation files
import en from './translations/en.json';
import he from './translations/he.json';
import es from './translations/es.json';
import fr from './translations/fr.json';
import de from './translations/de.json';

// =============================================================================
// TYPES
// =============================================================================

export type SupportedLanguage = 'en' | 'he' | 'es' | 'fr' | 'de';

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
  /** Change the current language */
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
  { code: 'he', name: 'Hebrew', nativeName: 'עברית', direction: 'rtl', flag: '🇮🇱' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', direction: 'ltr', flag: '🇪🇸' },
  { code: 'fr', name: 'French', nativeName: 'Français', direction: 'ltr', flag: '🇫🇷' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', direction: 'ltr', flag: '🇩🇪' },
];

const TRANSLATIONS: Record<SupportedLanguage, Record<string, any>> = {
  en,
  he,
  es,
  fr,
  de,
};

const STORAGE_KEY = 'pocketknife-language';
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
  // Initialize language from localStorage or browser preference
  const [language, setLanguageState] = useState<SupportedLanguage>(() => {
    // Check localStorage first
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && SUPPORTED_LANGUAGES.some(l => l.code === stored)) {
      return stored as SupportedLanguage;
    }
    
    // Check browser language
    const browserLang = navigator.language.split('-')[0];
    if (SUPPORTED_LANGUAGES.some(l => l.code === browserLang)) {
      return browserLang as SupportedLanguage;
    }
    
    return DEFAULT_LANGUAGE;
  });

  const languageInfo = SUPPORTED_LANGUAGES.find(l => l.code === language) || SUPPORTED_LANGUAGES[0];
  const isRTL = languageInfo.direction === 'rtl';

  // Update document direction and lang attribute when language changes
  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
    
    // Add/remove RTL class for styling
    if (isRTL) {
      document.body.classList.add('rtl');
    } else {
      document.body.classList.remove('rtl');
    }
  }, [language, isRTL]);

  // Change language and persist to localStorage
  const setLanguage = useCallback((lang: SupportedLanguage) => {
    if (SUPPORTED_LANGUAGES.some(l => l.code === lang)) {
      setLanguageState(lang);
      localStorage.setItem(STORAGE_KEY, lang);
    }
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
        // Key not found - try English fallback
        value = TRANSLATIONS.en;
        for (const fallbackKey of keys) {
          if (value && typeof value === 'object' && fallbackKey in value) {
            value = value[fallbackKey];
          } else {
            // Return the key itself if not found
            return key;
          }
        }
        break;
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

