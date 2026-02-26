import React, { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import { useRealTimeLocation } from '@/hooks/use-real-time-location';
import { useColors } from '@/hooks/use-colors';

interface GPSStatusIndicatorProps {
  /**
   * Si la localisation est activée
   */
  enabled: boolean;
  /**
   * Classe Tailwind personnalisée
   */
  className?: string;
}

/**
 * Composant pour afficher le statut GPS en temps réel
 * Affiche un indicateur 🟢/🔴/⚪ avec timestamp de la dernière mise à jour
 *
 * Exemple:
 * ```tsx
 * <GPSStatusIndicator enabled={settings.locationEnabled} />
 * ```
 */
export function GPSStatusIndicator({ enabled, className = '' }: GPSStatusIndicatorProps) {
  const colors = useColors();
  const { location, lastUpdate } = useRealTimeLocation({ enabled });
  const [displayTime, setDisplayTime] = useState<string>('');
  const [isActive, setIsActive] = useState(false);

  // Mettre à jour l'affichage du timestamp
  useEffect(() => {
    const updateDisplayTime = () => {
      if (!lastUpdate) {
        setDisplayTime('En attente...');
        setIsActive(false);
        return;
      }

      const now = Date.now();
      const diff = now - lastUpdate;

      // Si la dernière mise à jour est récente (< 30 secondes), c'est actif
      setIsActive(diff < 30000);

      if (diff < 5000) {
        setDisplayTime('À l\'instant');
      } else if (diff < 60000) {
        setDisplayTime(`Il y a ${Math.floor(diff / 1000)}s`);
      } else if (diff < 3600000) {
        setDisplayTime(`Il y a ${Math.floor(diff / 60000)}m`);
      } else {
        setDisplayTime(`Il y a ${Math.floor(diff / 3600000)}h`);
      }
    };

    updateDisplayTime();
    const interval = setInterval(updateDisplayTime, 1000);
    return () => clearInterval(interval);
  }, [lastUpdate]);

  // Déterminer le statut et la couleur
  const getStatus = () => {
    if (!enabled) {
      return {
        indicator: '⚪',
        label: 'Localisation désactivée',
        color: colors.muted,
        bgColor: `${colors.muted}15`,
      };
    }

    if (!location) {
      return {
        indicator: '🔴',
        label: 'Localisation en attente',
        color: colors.warning,
        bgColor: `${colors.warning}15`,
      };
    }

    if (isActive) {
      return {
        indicator: '🟢',
        label: 'Localisation active',
        color: colors.success,
        bgColor: `${colors.success}15`,
      };
    }

    return {
      indicator: '🟡',
      label: 'Localisation inactive',
      color: colors.warning,
      bgColor: `${colors.warning}15`,
    };
  };

  const status = getStatus();

  return (
    <View
      className={`flex-row items-center gap-3 p-3 rounded-lg ${className}`}
      style={{ backgroundColor: status.bgColor }}
    >
      {/* Indicateur */}
      <Text className="text-lg">{status.indicator}</Text>

      {/* Texte */}
      <View className="flex-1">
        <Text className="text-sm font-semibold text-foreground">
          {status.label}
        </Text>
        <Text className="text-xs text-muted mt-0.5">
          Dernière mise à jour: {displayTime}
        </Text>
      </View>

      {/* Pulse animation pour actif */}
      {isActive && (
        <View
          style={{
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: colors.success,
          }}
        />
      )}
    </View>
  );
}

/**
 * Composant pour afficher le statut GPS avec plus de détails
 */
export function GPSStatusCard({ enabled }: { enabled: boolean }) {
  const colors = useColors();
  const { location } = useRealTimeLocation({ enabled });

  return (
    <View
      className="p-4 rounded-lg gap-2"
      style={{ backgroundColor: `${colors.primary}10` }}
    >
      <View className="flex-row items-center gap-2 mb-2">
        <Text className="text-lg">📍</Text>
        <Text className="text-sm font-semibold text-foreground">
          Statut de localisation
        </Text>
      </View>

      <GPSStatusIndicator enabled={enabled} />

      {location && (
        <View className="gap-1 mt-2 pt-2 border-t" style={{ borderTopColor: colors.border }}>
          <View className="flex-row justify-between">
            <Text className="text-xs text-muted">Latitude:</Text>
            <Text className="text-xs font-mono text-foreground">
              {location.latitude.toFixed(6)}
            </Text>
          </View>
          <View className="flex-row justify-between">
            <Text className="text-xs text-muted">Longitude:</Text>
            <Text className="text-xs font-mono text-foreground">
              {location.longitude.toFixed(6)}
            </Text>
          </View>
          <View className="flex-row justify-between">
            <Text className="text-xs text-muted">Précision:</Text>
            <Text className="text-xs font-mono text-foreground">
              ±{Math.round(location.accuracy || 0)}m
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}
