import React from 'react';
import { View, Text, TouchableOpacity, Pressable } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useColors } from '@/hooks/use-colors';
import { cn } from '@/lib/utils';
import type { OtpErrorType } from '@/lib/types/otp-errors';

interface ErrorAlertProps {
  title: string;
  message: string;
  type?: OtpErrorType;
  icon?: 'alert-circle' | 'alert-triangle' | 'info' | 'none';
  action?: {
    label: string;
    onPress: () => void;
    loading?: boolean;
  };
  onDismiss?: () => void;
  dismissible?: boolean;
}

/**
 * Composant d'alerte d'erreur réutilisable
 *
 * Affiche une alerte avec titre, message, icône et action optionnelle
 *
 * Usage:
 * ```tsx
 * <ErrorAlert
 *   title="Code incorrect"
 *   message="Vous avez 2 tentative(s) restante(s)"
 *   type="error"
 *   icon="alert-circle"
 *   action={{
 *     label: "Réessayer",
 *     onPress: handleRetry
 *   }}
 *   onDismiss={handleDismiss}
 *   dismissible
 * />
 * ```
 */
export function ErrorAlert({
  title,
  message,
  type = 'error',
  icon = 'alert-circle',
  action,
  onDismiss,
  dismissible = true,
}: ErrorAlertProps) {
  const colors = useColors();

  // Déterminer les couleurs selon le type
  const getColors = () => {
    switch (type) {
      case 'error':
        return {
          bg: '#FEE2E2', // red-100
          border: '#FECACA', // red-200
          text: '#991B1B', // red-900
          icon: '#DC2626', // red-600
        };
      case 'warning':
        return {
          bg: '#FEF3C7', // amber-100
          border: '#FCD34D', // amber-300
          text: '#92400E', // amber-900
          icon: '#D97706', // amber-500
        };
      case 'info':
        return {
          bg: '#DBEAFE', // blue-100
          border: '#BFDBFE', // blue-200
          text: '#1E40AF', // blue-900
          icon: '#2563EB', // blue-600
        };
      default:
        return {
          bg: '#FEE2E2',
          border: '#FECACA',
          text: '#991B1B',
          icon: '#DC2626',
        };
    }
  };

  const typeColors = getColors();

  // Sélectionner l'icône
  const renderIcon = () => {
    const iconProps = {
      size: 24,
      color: typeColors.icon,
    };

    switch (icon) {
      case 'alert-circle':
        return <MaterialIcons name="error" {...iconProps} />;
      case 'alert-triangle':
        return <MaterialIcons name="warning" {...iconProps} />;
      case 'info':
        return <MaterialIcons name="info" {...iconProps} />;
      case 'none':
        return null;
      default:
        return <MaterialIcons name="error" {...iconProps} />;
    }
  };

  return (
    <View
      className="rounded-lg border p-4 mb-4"
      style={{
        backgroundColor: typeColors.bg,
        borderColor: typeColors.border,
        borderWidth: 1,
      }}
    >
      {/* Header avec icône et titre */}
      <View className="flex-row items-center justify-between mb-2">
        <View className="flex-row items-center flex-1">
          {icon !== 'none' && <View className="mr-3">{renderIcon()}</View>}
          <Text
            className="text-base font-semibold flex-1"
            style={{ color: typeColors.text }}
            numberOfLines={1}
          >
            {title}
          </Text>
        </View>

        {/* Bouton fermer */}
        {dismissible && onDismiss && (
          <Pressable
            onPress={onDismiss}
            className="ml-2 p-1"
            style={({ pressed }) => ({
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <MaterialIcons name="close" size={20} color={typeColors.text} />
          </Pressable>
        )}
      </View>

      {/* Message */}
      <Text className="text-sm mb-3" style={{ color: typeColors.text }} numberOfLines={3}>
        {message}
      </Text>

      {/* Action */}
      {action && (
        <TouchableOpacity
          onPress={action.onPress}
          disabled={action.loading}
          className="bg-white rounded-lg px-4 py-2 border"
          style={{
            borderColor: typeColors.icon,
            opacity: action.loading ? 0.6 : 1,
          }}
        >
          <Text className="text-center font-semibold text-sm" style={{ color: typeColors.icon }}>
            {action.loading ? 'Chargement...' : action.label}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

/**
 * Composant de message d'erreur simple (sans alerte)
 */
export function ErrorMessage({ text, type = 'error' }: { text: string; type?: OtpErrorType }) {
  const getColor = () => {
    switch (type) {
      case 'error':
        return '#DC2626'; // red-600
      case 'warning':
        return '#D97706'; // amber-500
      case 'info':
        return '#2563EB'; // blue-600
      default:
        return '#DC2626';
    }
  };

  return (
    <Text className="text-sm mb-2" style={{ color: getColor() }} numberOfLines={2}>
      {text}
    </Text>
  );
}

/**
 * Composant d'état d'erreur avec action
 */
export function ErrorState({
  title,
  description,
  action,
  retryCount,
}: {
  title: string;
  description: string;
  action?: {
    label: string;
    onPress: () => void;
    loading?: boolean;
  };
  retryCount?: number;
}) {
  return (
    <View className="flex-1 items-center justify-center px-6">
      {/* Icône d'erreur */}
      <View className="mb-6">
        <MaterialIcons name="warning" size={64} color="#DC2626" />
      </View>

      {/* Titre */}
      <Text className="text-2xl font-bold text-foreground mb-2 text-center">{title}</Text>

      {/* Description */}
      <Text className="text-base text-muted text-center mb-6">{description}</Text>

      {/* Compteur de tentatives */}
      {retryCount !== undefined && (
        <Text className="text-sm text-muted mb-6">Tentative {retryCount + 1}</Text>
      )}

      {/* Action */}
      {action && (
        <TouchableOpacity
          onPress={action.onPress}
          disabled={action.loading}
          className="w-full bg-primary rounded-full py-3"
          style={{ opacity: action.loading ? 0.6 : 1 }}
        >
          <Text className="text-center font-semibold text-white">
            {action.loading ? 'Chargement...' : action.label}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
