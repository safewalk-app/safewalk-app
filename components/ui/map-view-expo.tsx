import { logger } from '@/lib/utils/logger';
import React from 'react';
import { View, Text, Pressable, Linking, Share } from 'react-native';
import { useColors } from '@/hooks/use-colors';
import { cn } from '@/lib/utils';
import * as Clipboard from 'expo-clipboard';

export interface MapViewProps {
  latitude: string;
  longitude: string;
  accuracy?: string;
  className?: string;
}

/**
 * Composant MapView compatible Expo Go
 * Affiche la position avec un lien Google Maps au lieu d'une vraie carte
 * (react-native-maps nécessite compilation native, non disponible dans Expo Go)
 */
export function MapViewComponent({ latitude, longitude, accuracy, className }: MapViewProps) {
  const colors = useColors();

  const googleMapsUrl = `https://maps.google.com/?q=${latitude},${longitude}`;
  const googleMapsDeepLink = `comgooglemaps://?q=${latitude},${longitude}`;
  const appleMapsDeepLink = `maps://?q=${latitude},${longitude}`;

  const handleOpenGoogleMaps = async () => {
    try {
      // Essayer d'ouvrir Google Maps app d'abord
      await Linking.openURL(googleMapsDeepLink);
    } catch (error) {
      // Fallback sur le web
      try {
        await Linking.openURL(googleMapsUrl);
      } catch (err) {
        logger.error("Impossible d'ouvrir Google Maps:", err);
      }
    }
  };

  const handleOpenAppleMaps = async () => {
    try {
      await Linking.openURL(appleMapsDeepLink);
    } catch (error) {
      // Fallback sur Google Maps web
      try {
        await Linking.openURL(googleMapsUrl);
      } catch (err) {
        logger.error("Impossible d'ouvrir Apple Maps:", err);
      }
    }
  };

  const handleCopyCoordinates = async () => {
    const coordinates = `${latitude}, ${longitude}`;
    await Clipboard.setStringAsync(coordinates);
    logger.debug('✅ Coordonnées copiées:', coordinates);
  };

  const handleShareLocation = async () => {
    try {
      await Share.share({
        message: `Ma position: ${latitude}, ${longitude}\n${googleMapsUrl}`,
        title: 'Partager ma position',
        url: googleMapsUrl,
      });
    } catch (error) {
      logger.error('Erreur lors du partage:', error);
    }
  };

  const accuracyValue = accuracy ? parseFloat(accuracy).toFixed(1) : 'N/A';

  return (
    <View className={cn('gap-4', className)}>
      {/* Carte simplifiée - affiche les coordonnées */}
      <View
        className="w-full h-48 rounded-2xl border-2 p-4 items-center justify-center"
        style={{ borderColor: colors.border, backgroundColor: colors.surface }}
      >
        <Text className="text-sm text-muted mb-2">📍 Position GPS</Text>
        <Text className="text-lg font-bold text-foreground text-center">
          {latitude}, {longitude}
        </Text>
        <Text className="text-xs text-muted mt-2">Précision: ±{accuracyValue}m</Text>
      </View>

      {/* Boutons d'action */}
      <View className="gap-3">
        {/* Ouvrir Google Maps */}
        <Pressable
          onPress={handleOpenGoogleMaps}
          className="flex-row items-center justify-center gap-2 bg-blue-500 px-4 py-3 rounded-xl active:opacity-80"
        >
          <Text className="text-white font-semibold">🗺️ Ouvrir Google Maps</Text>
        </Pressable>

        {/* Ouvrir Apple Maps */}
        <Pressable
          onPress={handleOpenAppleMaps}
          className="flex-row items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 active:opacity-80"
          style={{ borderColor: colors.border }}
        >
          <Text className="text-foreground font-semibold">🗺️ Ouvrir Apple Maps</Text>
        </Pressable>

        {/* Copier coordonnées */}
        <Pressable
          onPress={handleCopyCoordinates}
          className="flex-row items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 active:opacity-80"
          style={{ borderColor: colors.border }}
        >
          <Text className="text-foreground font-semibold">📋 Copier coordonnées</Text>
        </Pressable>

        {/* Partager position */}
        <Pressable
          onPress={handleShareLocation}
          className="flex-row items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 active:opacity-80"
          style={{ borderColor: colors.border }}
        >
          <Text className="text-foreground font-semibold">📤 Partager position</Text>
        </Pressable>
      </View>

      {/* Info */}
      <Text className="text-xs text-muted text-center">
        💡 Appuyez sur "Ouvrir Google Maps" pour voir la position sur une vraie carte
      </Text>
    </View>
  );
}
