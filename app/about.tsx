import { logger } from '@/lib/utils/logger';
import { ScrollView, Text, View, TouchableOpacity, Linking, Platform, Alert } from 'react-native';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { ScreenContainer } from '@/components/screen-container';
import { useColors } from '@/hooks/use-colors';
import { IconSymbol } from '@/components/ui/icon-symbol';
import Constants from 'expo-constants';

/**
 * Écran À propos
 * Affiche la version, liens vers Privacy Policy et Terms of Service, support
 */
export default function AboutScreen() {
  const colors = useColors();

  // Version de l'app depuis app.config.ts
  const appVersion = Constants.expoConfig?.version || '1.0.0';
  const appName = Constants.expoConfig?.name || 'SafeWalk';

  /**
   * Ouvrir un lien externe
   */
  const openLink = async (url: string) => {
    try {
      if (Platform.OS === 'web') {
        window.open(url, '_blank');
      } else {
        await WebBrowser.openBrowserAsync(url);
      }
    } catch (error) {
      logger.error('Erreur ouverture lien:', error);
    }
  };

  /**
   * Ouvrir l'email de support
   */
  const openSupportEmail = () => {
    Alert.alert(
      'Contact Support',
      'Pour nous contacter, envoyez un email à votre adresse de support.',
      [{ text: 'OK' }],
    );
  };

  return (
    <ScreenContainer className="bg-background">
      {/* Header avec bouton retour */}
      <View
        className="flex-row items-center px-6 py-4 border-b"
        style={{ borderBottomColor: colors.border }}
      >
        <TouchableOpacity onPress={() => router.back()} className="mr-4" activeOpacity={0.6}>
          <IconSymbol name="chevron.left" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text className="text-2xl font-bold text-foreground">À propos</Text>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Logo et version */}
        <View className="items-center py-8">
          <View
            className="w-24 h-24 rounded-3xl items-center justify-center mb-4"
            style={{ backgroundColor: colors.primary }}
          >
            <Text className="text-5xl">🛡️</Text>
          </View>
          <Text className="text-3xl font-bold text-foreground mb-2">{appName}</Text>
          <Text className="text-base text-muted">Version {appVersion}</Text>
          <Text className="text-sm text-muted mt-1">Reste en sécurité, partout.</Text>
        </View>

        {/* Section Légal */}
        <View className="px-6 mb-6">
          <Text className="text-lg font-semibold text-foreground mb-3">Légal</Text>

          {/* Privacy Policy */}
          <TouchableOpacity
            onPress={() =>
              Alert.alert('Privacy Policy', 'Voir le fichier PRIVACY_POLICY.md dans le projet.')
            }
            className="flex-row items-center justify-between py-4 border-b"
            style={{ borderBottomColor: colors.border }}
          >
            <View className="flex-row items-center flex-1">
              <Text className="text-2xl mr-3">🔒</Text>
              <View className="flex-1">
                <Text className="text-base font-medium text-foreground">
                  Politique de Confidentialité
                </Text>
                <Text className="text-sm text-muted mt-1">Comment nous protégeons vos données</Text>
              </View>
            </View>
            <IconSymbol name="chevron.right" size={20} color={colors.muted} />
          </TouchableOpacity>

          {/* Terms of Service */}
          <TouchableOpacity
            onPress={() =>
              Alert.alert('Terms of Service', 'Voir le fichier TERMS_OF_SERVICE.md dans le projet.')
            }
            className="flex-row items-center justify-between py-4 border-b"
            style={{ borderBottomColor: colors.border }}
          >
            <View className="flex-row items-center flex-1">
              <Text className="text-2xl mr-3">📄</Text>
              <View className="flex-1">
                <Text className="text-base font-medium text-foreground">
                  Conditions d'Utilisation
                </Text>
                <Text className="text-sm text-muted mt-1">Règles et responsabilités</Text>
              </View>
            </View>
            <IconSymbol name="chevron.right" size={20} color={colors.muted} />
          </TouchableOpacity>
        </View>

        {/* Section Support */}
        <View className="px-6 mb-6">
          <Text className="text-lg font-semibold text-foreground mb-3">Support</Text>

          {/* Email Support */}
          <TouchableOpacity
            onPress={openSupportEmail}
            className="flex-row items-center justify-between py-4 border-b"
            style={{ borderBottomColor: colors.border }}
          >
            <View className="flex-row items-center flex-1">
              <Text className="text-2xl mr-3">📧</Text>
              <View className="flex-1">
                <Text className="text-base font-medium text-foreground">Contactez-nous</Text>
                <Text className="text-sm text-muted mt-1">support@safewalk.app</Text>
              </View>
            </View>
            <IconSymbol name="chevron.right" size={20} color={colors.muted} />
          </TouchableOpacity>

          {/* Site Web */}
          <TouchableOpacity
            onPress={() => Alert.alert('Site Web', 'Site web en construction.')}
            className="flex-row items-center justify-between py-4 border-b"
            style={{ borderBottomColor: colors.border }}
          >
            <View className="flex-row items-center flex-1">
              <Text className="text-2xl mr-3">🌐</Text>
              <View className="flex-1">
                <Text className="text-base font-medium text-foreground">Site Web</Text>
                <Text className="text-sm text-muted mt-1">safewalk.app</Text>
              </View>
            </View>
            <IconSymbol name="chevron.right" size={20} color={colors.muted} />
          </TouchableOpacity>
        </View>

        {/* Section Informations */}
        <View className="px-6 mb-6">
          <Text className="text-lg font-semibold text-foreground mb-3">Informations</Text>

          <View className="rounded-2xl p-4" style={{ backgroundColor: colors.surface }}>
            <Text className="text-sm text-muted leading-relaxed">
              <Text className="font-semibold text-foreground">SafeWalk</Text> est une application de
              sécurité personnelle qui vous permet de partager votre position avec vos contacts
              d'urgence en cas de besoin.
            </Text>
            <Text className="text-sm text-muted leading-relaxed mt-3">
              🔒 Toutes vos données restent sur votre téléphone{'\n'}
              🔒 Aucune inscription requise{'\n'}
              🔒 Position GPS partagée uniquement en cas d'alerte
            </Text>
          </View>
        </View>

        {/* Avertissement */}
        <View className="px-6 mb-6">
          <View className="rounded-2xl p-4" style={{ backgroundColor: '#FFF3CD' }}>
            <Text className="text-sm font-semibold" style={{ color: '#856404' }}>
              ⚠️ Important
            </Text>
            <Text className="text-sm mt-2" style={{ color: '#856404' }}>
              SafeWalk n'est pas un service d'urgence officiel. En cas d'urgence réelle, appelez
              immédiatement les services d'urgence (112 en Europe, 911 en Amérique du Nord).
            </Text>
          </View>
        </View>

        {/* Copyright */}
        <View className="items-center py-6">
          <Text className="text-xs text-muted">© 2026 SafeWalk. Tous droits réservés.</Text>
          <Text className="text-xs text-muted mt-1">Fait avec ❤️ pour votre sécurité</Text>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
