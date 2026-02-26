/**
 * Loading Context
 * 
 * Contexte global pour tracker le chargement des composants lazy loading
 * Permet d'afficher un indicateur de chargement visible à l'utilisateur
 */

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export interface LoadingItem {
  id: string;
  name: string;
  type: 'service' | 'hook' | 'component';
  startTime: number;
  progress: number; // 0-100
}

interface LoadingContextType {
  loadingItems: LoadingItem[];
  isLoading: boolean;
  totalProgress: number;
  startLoading: (id: string, name: string, type: 'service' | 'hook' | 'component') => void;
  updateProgress: (id: string, progress: number) => void;
  finishLoading: (id: string) => void;
  clearLoading: () => void;
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

export function LoadingProvider({ children }: { children: ReactNode }) {
  const [loadingItems, setLoadingItems] = useState<LoadingItem[]>([]);

  const startLoading = useCallback((id: string, name: string, type: 'service' | 'hook' | 'component') => {
    setLoadingItems(prev => {
      // Éviter les doublons
      if (prev.some(item => item.id === id)) {
        return prev;
      }
      return [...prev, {
        id,
        name,
        type,
        startTime: Date.now(),
        progress: 0,
      }];
    });
  }, []);

  const updateProgress = useCallback((id: string, progress: number) => {
    setLoadingItems(prev =>
      prev.map(item =>
        item.id === id ? { ...item, progress: Math.min(progress, 99) } : item
      )
    );
  }, []);

  const finishLoading = useCallback((id: string) => {
    setLoadingItems(prev =>
      prev.map(item =>
        item.id === id ? { ...item, progress: 100 } : item
      )
    );
    // Retirer après 300ms pour une transition fluide
    setTimeout(() => {
      setLoadingItems(prev => prev.filter(item => item.id !== id));
    }, 300);
  }, []);

  const clearLoading = useCallback(() => {
    setLoadingItems([]);
  }, []);

  const isLoading = loadingItems.length > 0;
  const totalProgress = loadingItems.length > 0
    ? Math.round(loadingItems.reduce((sum, item) => sum + item.progress, 0) / loadingItems.length)
    : 0;

  return (
    <LoadingContext.Provider
      value={{
        loadingItems,
        isLoading,
        totalProgress,
        startLoading,
        updateProgress,
        finishLoading,
        clearLoading,
      }}
    >
      {children}
    </LoadingContext.Provider>
  );
}

export function useLoading() {
  const context = useContext(LoadingContext);
  if (!context) {
    throw new Error('useLoading must be used within LoadingProvider');
  }
  return context;
}
