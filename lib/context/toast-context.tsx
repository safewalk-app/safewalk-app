import React, { createContext, useContext, useState, useCallback } from 'react';
import { Toast, ToastContextType, initToastStore } from '../services/toast-service';
import { logger } from '../logger';

const ToastContext = createContext<ToastContextType | undefined>(undefined);

/**
 * Provider pour les toasts
 */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = `${Date.now()}-${Math.random()}`;
    const newToast: Toast = {
      ...toast,
      id,
      duration: toast.duration ?? 3000,
    };

    logger.debug(`📢 Toast shown: ${newToast.type} - ${newToast.title}`);
    setToasts((prev) => [...prev, newToast]);

    // Auto-remove si duration n'est pas 0
    if (newToast.duration && newToast.duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, newToast.duration);
    }
  }, []);

  const removeToast = useCallback((id: string) => {
    logger.debug(`🗑️ Toast removed: ${id}`);
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const clearAllToasts = useCallback(() => {
    logger.debug('🗑️ All toasts cleared');
    setToasts([]);
  }, []);

  const value: ToastContextType = {
    toasts,
    showToast,
    removeToast,
    clearAllToasts,
  };

  // Initialiser le store global pour accès depuis les services
  React.useEffect(() => {
    initToastStore(value);
  }, [value]);

  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>;
}

/**
 * Hook pour accéder au contexte Toast
 */
export function useToast(): ToastContextType {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
}
