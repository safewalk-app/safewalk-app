/**
 * Loading Indicator Component
 *
 * Affiche un indicateur de chargement avec barre de progression
 * pour les composants lazy loading
 */

import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, Animated } from 'react-native';
import { useLoading } from '@/lib/context/loading-context';
import { useColors } from '@/hooks/use-colors';

interface LoadingIndicatorProps {
  /**
   * Position de l'indicateur
   */
  position?: 'top' | 'center' | 'bottom';
  /**
   * Afficher les détails de chargement
   */
  showDetails?: boolean;
}

/**
 * Composant pour afficher les indicateurs de chargement
 * Doit être placé dans le layout principal pour être visible globalement
 */
export function LoadingIndicator({ position = 'top', showDetails = false }: LoadingIndicatorProps) {
  const { loadingItems, isLoading, totalProgress } = useLoading();
  const colors = useColors();
  const [displayProgress, setDisplayProgress] = useState(0);

  // Animer la progression
  useEffect(() => {
    const interval = setInterval(() => {
      setDisplayProgress((prev) => {
        const diff = totalProgress - prev;
        if (diff > 0) {
          return prev + Math.ceil(diff / 5);
        }
        return prev;
      });
    }, 50);

    return () => clearInterval(interval);
  }, [totalProgress]);

  if (!isLoading) {
    return null;
  }

  const progressWidth = `${Math.min(displayProgress, 100)}%`;
  const positionStyle =
    position === 'top'
      ? { top: 0 }
      : position === 'bottom'
        ? { bottom: 0 }
        : { justifyContent: 'center' };

  return (
    <View
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        ...positionStyle,
        zIndex: 9999,
      }}
    >
      {/* Barre de progression */}
      <View
        style={{
          height: 3,
          backgroundColor: `${colors.primary}20`,
          overflow: 'hidden',
        }}
      >
        <Animated.View
          style={{
            height: '100%',
            width: progressWidth,
            backgroundColor: colors.primary,
          }}
        />
      </View>

      {/* Détails de chargement (optionnel) */}
      {showDetails && loadingItems.length > 0 && (
        <View
          style={{
            backgroundColor: colors.background,
            borderBottomColor: colors.border,
            borderBottomWidth: 1,
            paddingHorizontal: 16,
            paddingVertical: 12,
          }}
        >
          {loadingItems.map((item, index) => (
            <View
              key={item.id}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                marginBottom: index < loadingItems.length - 1 ? 8 : 0,
              }}
            >
              <ActivityIndicator size="small" color={colors.primary} style={{ marginRight: 8 }} />
              <Text
                style={{
                  flex: 1,
                  fontSize: 12,
                  color: colors.foreground,
                  fontWeight: '500',
                }}
              >
                {item.name}
              </Text>
              <Text
                style={{
                  fontSize: 11,
                  color: colors.muted,
                  marginLeft: 8,
                }}
              >
                {item.progress}%
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

/**
 * Composant LoadingOverlay - Affiche un overlay semi-transparent pendant le chargement
 */
export function LoadingOverlay({
  showText = true,
  message = 'Chargement...',
}: {
  showText?: boolean;
  message?: string;
}) {
  const { isLoading, totalProgress } = useLoading();
  const colors = useColors();

  if (!isLoading) {
    return null;
  }

  return (
    <View
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: `${colors.background}80`,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 9998,
      }}
    >
      <View
        style={{
          alignItems: 'center',
          gap: 12,
        }}
      >
        <ActivityIndicator size="large" color={colors.primary} />
        {showText && (
          <Text
            style={{
              fontSize: 14,
              color: colors.foreground,
              fontWeight: '500',
            }}
          >
            {message}
          </Text>
        )}
        <Text
          style={{
            fontSize: 12,
            color: colors.muted,
          }}
        >
          {totalProgress}%
        </Text>
      </View>
    </View>
  );
}

/**
 * Composant LoadingBar - Barre de progression simple en haut de l'écran
 */
export function LoadingBar() {
  return <LoadingIndicator position="top" showDetails={false} />;
}

/**
 * Composant LoadingBadge - Badge de chargement avec nombre d'items en cours
 */
export function LoadingBadge() {
  const { loadingItems, isLoading } = useLoading();
  const colors = useColors();

  if (!isLoading || loadingItems.length === 0) {
    return null;
  }

  return (
    <View
      style={{
        position: 'absolute',
        top: 16,
        right: 16,
        backgroundColor: colors.primary,
        borderRadius: 20,
        paddingHorizontal: 12,
        paddingVertical: 6,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        zIndex: 9999,
      }}
    >
      <ActivityIndicator size="small" color={colors.background} />
      <Text
        style={{
          color: colors.background,
          fontSize: 12,
          fontWeight: '600',
        }}
      >
        {loadingItems.length} en cours
      </Text>
    </View>
  );
}
