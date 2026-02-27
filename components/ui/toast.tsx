import React, { useEffect } from 'react';
import { View, Text, Pressable, Animated, StyleSheet } from 'react-native';
import { useColors } from '@/hooks/use-colors';
import { cn } from '@/lib/utils';
import { Toast as ToastType } from '@/lib/services/toast-service';
import * as Haptics from 'expo-haptics';

interface ToastProps {
  toast: ToastType;
  onDismiss: () => void;
}

/**
 * Composant Toast - Notification temporaire
 * Affiche un message avec icône, titre, et message
 */
export function Toast({ toast, onDismiss }: ToastProps) {
  const colors = useColors();
  const slideAnim = React.useRef(new Animated.Value(100)).current;

  // Animation d'entrée
  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [slideAnim]);

  // Auto-dismiss si duration est définie
  useEffect(() => {
    if (toast.duration && toast.duration > 0) {
      const timer = setTimeout(() => {
        // Animation de sortie
        Animated.timing(slideAnim, {
          toValue: 100,
          duration: 300,
          useNativeDriver: true,
        }).start(() => onDismiss());
      }, toast.duration);

      return () => clearTimeout(timer);
    }
  }, [toast.duration, slideAnim, onDismiss]);

  // Haptic feedback selon le type
  useEffect(() => {
    if (toast.type === 'error') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } else if (toast.type === 'success') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else if (toast.type === 'warning') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  }, [toast.type]);

  // Déterminer les couleurs selon le type
  const getToastStyle = () => {
    switch (toast.type) {
      case 'success':
        return {
          backgroundColor: colors.success,
          borderColor: colors.success,
          textColor: '#ffffff',
        };
      case 'error':
        return {
          backgroundColor: colors.error,
          borderColor: colors.error,
          textColor: '#ffffff',
        };
      case 'warning':
        return {
          backgroundColor: colors.warning,
          borderColor: colors.warning,
          textColor: '#000000',
        };
      case 'info':
      default:
        return {
          backgroundColor: colors.primary,
          borderColor: colors.primary,
          textColor: '#ffffff',
        };
    }
  };

  const toastStyle = getToastStyle();

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <Pressable
        onPress={onDismiss}
        style={[
          styles.toast,
          {
            backgroundColor: toastStyle.backgroundColor,
            borderColor: toastStyle.borderColor,
          },
        ]}
      >
        <View style={styles.content}>
          <Text style={[styles.title, { color: toastStyle.textColor }]} numberOfLines={1}>
            {toast.title}
          </Text>
          {toast.message && (
            <Text
              style={[styles.message, { color: toastStyle.textColor, opacity: 0.9 }]}
              numberOfLines={2}
            >
              {toast.message}
            </Text>
          )}
        </View>

        {toast.action && (
          <Pressable
            onPress={() => {
              toast.action?.onPress();
              onDismiss();
            }}
            style={({ pressed }) => [styles.actionButton, pressed && { opacity: 0.7 }]}
          >
            <Text style={[styles.actionText, { color: toastStyle.textColor }]}>
              {toast.action.label}
            </Text>
          </Pressable>
        )}

        <Pressable
          onPress={onDismiss}
          style={({ pressed }) => [styles.closeButton, pressed && { opacity: 0.6 }]}
        >
          <Text style={[styles.closeIcon, { color: toastStyle.textColor }]}>✕</Text>
        </Pressable>
      </Pressable>
    </Animated.View>
  );
}

/**
 * Conteneur pour afficher plusieurs toasts
 */
interface ToastContainerProps {
  toasts: ToastType[];
  onDismiss: (id: string) => void;
}

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  return (
    <View style={styles.toastContainer} pointerEvents="box-none">
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} onDismiss={() => onDismiss(toast.id)} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    overflow: 'hidden',
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderLeftWidth: 4,
    minHeight: 60,
  },
  content: {
    flex: 1,
    marginRight: 12,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  message: {
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 16,
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
  },
  actionText: {
    fontSize: 12,
    fontWeight: '600',
  },
  closeButton: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeIcon: {
    fontSize: 16,
    fontWeight: '600',
  },
  toastContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    pointerEvents: 'box-none',
  },
});
