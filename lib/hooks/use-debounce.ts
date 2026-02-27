import { useRef, useCallback } from 'react';

interface UseDebounceOptions {
  delay?: number;
  leading?: boolean;
  trailing?: boolean;
}

/**
 * Hook pour debouncer une fonction
 * Utile pour éviter les appels API massifs lors de la saisie utilisateur
 *
 * @param callback - Fonction à debouncer
 * @param options - Options (delay, leading, trailing)
 * @returns Fonction debounced
 *
 * @example
 * const debouncedSearch = useDebounce((query: string) => {
 *   searchAPI(query);
 * }, { delay: 300 });
 *
 * <TextInput onChange={(e) => debouncedSearch(e.target.value)} />
 */
export function useDebounce<T extends (...args: any[]) => any>(
  callback: T,
  options: UseDebounceOptions = {},
): T {
  const { delay = 300, leading = false, trailing = true } = options;
  const timeoutRef = useRef<NodeJS.Timeout>();
  const leadingRef = useRef(true);

  return useCallback(
    (...args: any[]) => {
      // Exécuter immédiatement si leading est true
      if (leading && leadingRef.current) {
        callback(...args);
        leadingRef.current = false;
      }

      // Effacer le timeout précédent
      clearTimeout(timeoutRef.current);

      // Définir un nouveau timeout
      timeoutRef.current = setTimeout(() => {
        // Exécuter après le délai si trailing est true
        if (trailing) {
          callback(...args);
        }
        leadingRef.current = true;
      }, delay);
    },
    [callback, delay, leading, trailing],
  ) as T;
}
