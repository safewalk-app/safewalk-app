/**
 * Hook: useLoadingIndicator
 * 
 * Hook pour afficher un indicateur de chargement lors du chargement
 * des services et hooks lazy loading
 */

import { useLoading } from '@/lib/context/loading-context';
import { useCallback, useRef, useEffect } from 'react';

interface LoadingIndicatorOptions {
  /**
   * Nom du service/hook en cours de chargement
   */
  name: string;
  /**
   * Type de chargement
   */
  type?: 'service' | 'hook' | 'component';
  /**
   * Durée minimale d'affichage en ms (pour éviter les flashs)
   */
  minDuration?: number;
}

/**
 * Hook pour tracker et afficher le chargement d'un service/hook
 * 
 * @example
 * ```tsx
 * const { startLoading, finishLoading } = useLoadingIndicator({
 *   name: 'Trip Service',
 *   type: 'service',
 * });
 * 
 * useEffect(() => {
 *   startLoading();
 *   // ... do async work
 *   finishLoading();
 * }, []);
 * ```
 */
export function useLoadingIndicator(options: LoadingIndicatorOptions) {
  const { name, type = 'service', minDuration = 300 } = options;
  const { startLoading, updateProgress, finishLoading } = useLoading();
  const idRef = useRef(`${type}-${name}-${Date.now()}-${Math.random()}`);
  const startTimeRef = useRef<number | null>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const start = useCallback(() => {
    const id = idRef.current;
    startTimeRef.current = Date.now();
    startLoading(id, name, type);

    // Simuler une progression progressive (0-90%)
    progressIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - (startTimeRef.current || Date.now());
      const progress = Math.min(90, Math.floor((elapsed / 2000) * 90));
      updateProgress(id, progress);
    }, 100);
  }, [startLoading, name, type, updateProgress]);

  const finish = useCallback(() => {
    const id = idRef.current;

    // Arrêter la progression
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }

    // Attendre la durée minimale avant de terminer
    const elapsed = Date.now() - (startTimeRef.current || Date.now());
    const delay = Math.max(0, minDuration - elapsed);

    setTimeout(() => {
      updateProgress(id, 100);
      finishLoading(id);
    }, delay);
  }, [finishLoading, minDuration, updateProgress]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, []);

  return { start, finish };
}

/**
 * Hook pour créer une fonction async wrapper qui affiche le chargement
 * 
 * @example
 * ```tsx
 * const withLoading = useLoadingWrapper({
 *   name: 'Trip Service',
 * });
 * 
 * const result = await withLoading(async () => {
 *   return await getTripService();
 * });
 * ```
 */
export function useLoadingWrapper(options: LoadingIndicatorOptions) {
  const { start, finish } = useLoadingIndicator(options);

  return useCallback(
    async <T,>(fn: () => Promise<T>): Promise<T> => {
      start();
      try {
        const result = await fn();
        return result;
      } finally {
        finish();
      }
    },
    [start, finish]
  );
}
