import { useLocalStorage } from './useLocalStorage';

/**
 * Custom hook to manage view mode with localStorage persistence
 * @param {string} key - Unique key to identify this view mode in localStorage
 * @param {string} defaultMode - Default view mode if none exists in localStorage ('card' or 'list')
 * @returns {[string, Function]} - Current view mode and setter function
 */
export function useViewMode(key, defaultMode = 'card') {
  return useLocalStorage(`viewMode_${key}`, defaultMode);
} 