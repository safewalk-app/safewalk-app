import React from 'react';
import { View } from 'react-native';

/**
 * BubbleBackground - Cercles flous décoratives pour le design "pop bubble"
 * Affiche 3-5 bulles avec opacity 0.04-0.08 sur le fond
 */
export function BubbleBackground() {
  return (
    <View className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Bulle 1 - Haut gauche */}
      <View
        className="absolute rounded-full bg-primary"
        style={{
          width: 200,
          height: 200,
          left: -50,
          top: -50,
          opacity: 0.06,
        }}
      />

      {/* Bulle 2 - Haut droit */}
      <View
        className="absolute rounded-full bg-secondary"
        style={{
          width: 150,
          height: 150,
          right: -30,
          top: 100,
          opacity: 0.05,
        }}
      />

      {/* Bulle 3 - Bas gauche */}
      <View
        className="absolute rounded-full bg-mint"
        style={{
          width: 180,
          height: 180,
          left: 20,
          bottom: -60,
          opacity: 0.04,
        }}
      />

      {/* Bulle 4 - Bas droit */}
      <View
        className="absolute rounded-full bg-primary"
        style={{
          width: 120,
          height: 120,
          right: 40,
          bottom: 100,
          opacity: 0.07,
        }}
      />

      {/* Bulle 5 - Centre */}
      <View
        className="absolute rounded-full bg-secondary"
        style={{
          width: 100,
          height: 100,
          left: '50%',
          top: '50%',
          marginLeft: -50,
          marginTop: -50,
          opacity: 0.03,
        }}
      />
    </View>
  );
}
