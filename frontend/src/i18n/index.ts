/**
 * i18n (Internationalization) Module
 * 
 * Provides multi-language support for the Pocketknife application.
 * 
 * Usage:
 * 1. Wrap your app with LanguageProvider
 * 2. Use the useTranslation hook to get the t() function
 * 3. Use t('key.path') to get translated strings
 * 
 * Example:
 * ```tsx
 * import { useTranslation } from '../i18n';
 * 
 * const MyComponent = () => {
 *   const { t, language, setLanguage } = useTranslation();
 *   
 *   return (
 *     <div>
 *       <h1>{t('common.welcome')}</h1>
 *       <button onClick={() => setLanguage('he')}>עברית</button>
 *     </div>
 *   );
 * };
 * ```
 */

export {
  LanguageProvider,
  useTranslation,
  useLanguage,
  SUPPORTED_LANGUAGES,
  type SupportedLanguage,
  type LanguageInfo,
  type LanguageContextType,
} from './LanguageContext';

// Export translations for direct access if needed
export { default as enTranslations } from './translations/en.json';
export { default as heTranslations } from './translations/he.json';
export { default as esTranslations } from './translations/es.json';
export { default as frTranslations } from './translations/fr.json';
export { default as deTranslations } from './translations/de.json';

