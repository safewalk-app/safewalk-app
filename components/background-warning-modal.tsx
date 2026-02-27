import { useState, useEffect } from 'react';
import { Modal, View, Text, Pressable, ScrollView, Linking, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColors } from '@/hooks/use-colors';

interface BackgroundWarningModalProps {
  visible: boolean;
  onClose: () => void;
}

const STORAGE_KEY = 'safewalk_hide_background_warning';

export function BackgroundWarningModal({ visible, onClose }: BackgroundWarningModalProps) {
  const colors = useColors();
  const [dontShowAgain, setDontShowAgain] = useState(false);

  const handleClose = async () => {
    if (dontShowAgain) {
      await AsyncStorage.setItem(STORAGE_KEY, 'true');
    }
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <View
        style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.5)',
          justifyContent: 'center',
          alignItems: 'center',
          padding: 20,
        }}
      >
        <View
          style={{
            backgroundColor: colors.background,
            borderRadius: 16,
            padding: 24,
            maxWidth: 400,
            width: '100%',
          }}
        >
          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Titre */}
            <Text
              style={{
                fontSize: 24,
                fontWeight: 'bold',
                color: colors.foreground,
                marginBottom: 16,
                textAlign: 'center',
              }}
            >
              ⚠️ Important pour votre sécurité
            </Text>

            {/* Message principal */}
            <Text
              style={{
                fontSize: 16,
                color: colors.foreground,
                marginBottom: 20,
                lineHeight: 24,
              }}
            >
              Pour que les alertes fonctionnent correctement, vous devez :
            </Text>

            {/* Liste des instructions */}
            <View style={{ marginBottom: 24 }}>
              <InstructionItem
                icon="📱"
                title="Garder l'app en arrière-plan"
                description="Ne fermez pas complètement l'app (ne pas swiper vers le haut dans le gestionnaire d'apps)"
                colors={colors}
              />
              <InstructionItem
                icon="🔔"
                title="Activer les notifications"
                description="Les notifications doivent être autorisées pour recevoir les alertes"
                colors={colors}
              />
              <InstructionItem
                icon="🔋"
                title="Désactiver l'économie d'énergie"
                description="Le mode économie d'énergie peut bloquer les notifications"
                colors={colors}
              />
            </View>

            {/* Note */}
            <View
              style={{
                backgroundColor: colors.surface,
                padding: 12,
                borderRadius: 8,
                marginBottom: 20,
              }}
            >
              <Text
                style={{
                  fontSize: 14,
                  color: colors.muted,
                  lineHeight: 20,
                }}
              >
                💡 <Text style={{ fontWeight: '600' }}>Astuce :</Text> Laissez l'écran allumé
                pendant votre sortie pour une fiabilité maximale.
              </Text>
            </View>

            {/* Checkbox "Ne plus afficher" */}
            <Pressable
              onPress={() => setDontShowAgain(!dontShowAgain)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                marginBottom: 20,
              }}
            >
              <View
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 4,
                  borderWidth: 2,
                  borderColor: colors.primary,
                  backgroundColor: dontShowAgain ? colors.primary : 'transparent',
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginRight: 12,
                }}
              >
                {dontShowAgain && (
                  <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>✓</Text>
                )}
              </View>
              <Text style={{ fontSize: 14, color: colors.foreground }}>
                Ne plus afficher ce message
              </Text>
            </Pressable>

            {/* Boutons */}
            <View style={{ gap: 12 }}>
              {/* Bouton "Ouvrir les paramètres" */}
              <Pressable
                onPress={() => {
                  if (Platform.OS === 'ios') {
                    Linking.openURL('app-settings:');
                  } else {
                    Linking.openSettings();
                  }
                }}
                style={({ pressed }) => ({
                  backgroundColor: colors.surface,
                  paddingVertical: 16,
                  borderRadius: 12,
                  borderWidth: 2,
                  borderColor: colors.primary,
                  opacity: pressed ? 0.8 : 1,
                })}
              >
                <Text
                  style={{
                    color: colors.primary,
                    fontSize: 16,
                    fontWeight: '600',
                    textAlign: 'center',
                  }}
                >
                  ⚙️ Ouvrir les paramètres
                </Text>
              </Pressable>

              {/* Bouton "J'ai compris" */}
              <Pressable
                onPress={handleClose}
                style={({ pressed }) => ({
                  backgroundColor: colors.primary,
                  paddingVertical: 16,
                  borderRadius: 12,
                  opacity: pressed ? 0.8 : 1,
                })}
              >
                <Text
                  style={{
                    color: '#fff',
                    fontSize: 16,
                    fontWeight: '600',
                    textAlign: 'center',
                  }}
                >
                  J'ai compris
                </Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

interface InstructionItemProps {
  icon: string;
  title: string;
  description: string;
  colors: any;
}

function InstructionItem({ icon, title, description, colors }: InstructionItemProps) {
  return (
    <View
      style={{
        flexDirection: 'row',
        marginBottom: 16,
      }}
    >
      <Text style={{ fontSize: 24, marginRight: 12 }}>{icon}</Text>
      <View style={{ flex: 1 }}>
        <Text
          style={{
            fontSize: 16,
            fontWeight: '600',
            color: colors.foreground,
            marginBottom: 4,
          }}
        >
          {title}
        </Text>
        <Text
          style={{
            fontSize: 14,
            color: colors.muted,
            lineHeight: 20,
          }}
        >
          {description}
        </Text>
      </View>
    </View>
  );
}

// Hook pour vérifier si le modal doit être affiché
export async function shouldShowBackgroundWarning(): Promise<boolean> {
  try {
    const hideWarning = await AsyncStorage.getItem(STORAGE_KEY);
    return hideWarning !== 'true';
  } catch {
    return true;
  }
}
