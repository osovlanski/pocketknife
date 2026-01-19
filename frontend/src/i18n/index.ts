/**
 * i18n (Internationalization) Module
 * 
 * Provides translation support for the Pocketknife application.
 * Currently English-only, but infrastructure is ready for future expansion.
 * 
 * Usage:
 * 1. Wrap your app with LanguageProvider (in main.tsx)
 * 2. Use the useTranslation hook to get the t() function
 * 3. Use t('key.path') to get translated strings
 * 
 * Example:
 * ```tsx
 * import { useTranslation } from '../i18n';
 * 
 * const MyComponent = () => {
 *   const { t } = useTranslation();
 *   
 *   return <h1>{t('common.welcome')}</h1>;
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
