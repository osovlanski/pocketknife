/**
 * useSettings Hook
 * 
 * Manages user preferences and settings state.
 */

import { useState, useCallback } from 'react';
import * as authApi from '../services/authApi';
import type { UserPreferences } from '../services/authApi';

export interface UseSettingsReturn {
  preferences: Partial<UserPreferences>;
  isSaving: boolean;
  saveSuccess: boolean;
  
  setPreferences: React.Dispatch<React.SetStateAction<Partial<UserPreferences>>>;
  updatePreference: <K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) => void;
  savePreferences: () => Promise<boolean>;
  loadPreferences: (prefs: Partial<UserPreferences>) => void;
}

export const useSettings = (onSaveSuccess?: () => void): UseSettingsReturn => {
  const [preferences, setPreferences] = useState<Partial<UserPreferences>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const updatePreference = useCallback(<K extends keyof UserPreferences>(
    key: K,
    value: UserPreferences[K]
  ) => {
    setPreferences(prev => ({ ...prev, [key]: value }));
  }, []);

  const loadPreferences = useCallback((prefs: Partial<UserPreferences>) => {
    setPreferences(prefs);
  }, []);

  const savePreferences = useCallback(async (): Promise<boolean> => {
    try {
      setIsSaving(true);
      const result = await authApi.updatePreferences(preferences);
      
      if (result.success) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2000);
        onSaveSuccess?.();
        return true;
      }
      
      console.error('Failed to save preferences:', result.error);
      return false;
    } catch (error) {
      console.error('Failed to save preferences:', error);
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [preferences, onSaveSuccess]);

  return {
    preferences,
    isSaving,
    saveSuccess,
    setPreferences,
    updatePreference,
    savePreferences,
    loadPreferences
  };
};

export default useSettings;

