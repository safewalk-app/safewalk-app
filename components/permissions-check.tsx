import { logger } from '@/lib/utils/logger';
import { useEffect, useState } from 'react';
import { Alert, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PERMISSIONS_KEY = 'safewalk_permissions_requested';

/**
 * Composant invisible qui vérifie et demande les permissions notifications au premier lancement
 */
export function PermissionsCheck() {
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    checkAndRequestPermissions();
  }, []);

  const checkAndRequestPermissions = async () => {
    try {
      // Vérifier si on a déjà demandé les permissions
      const alreadyRequested = await AsyncStorage.getItem(PERMISSIONS_KEY);

      if (alreadyRequested) {
        setChecked(true);
        return;
      }

      // Vérifier le statut actuel des permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();

      if (existingStatus === 'granted') {
        logger.debug('✅ Permissions notifications déjà accordées');
        await AsyncStorage.setItem(PERMISSIONS_KEY, 'true');
        setChecked(true);
        return;
      }

      // Sur web, ne pas demander de permissions
      if (Platform.OS === 'web') {
        setChecked(true);
        return;
      }

      // Demander les permissions
      const { status } = await Notifications.requestPermissionsAsync();

      if (status === 'granted') {
        logger.debug('✅ Permissions notifications accordées');
        await AsyncStorage.setItem(PERMISSIONS_KEY, 'true');
      } else {
        logger.warn('⚠️ Permissions notifications refusées');

        // Afficher une alerte pour expliquer l'importance
        Alert.alert(
          '🔔 Notifications importantes',
          "SafeWalk a besoin des notifications pour t'alerter en cas de danger. Sans notifications, l'app ne pourra pas te prévenir si tu ne confirmes pas ton retour.",
          [
            {
              text: 'Paramètres',
              onPress: () => {
                // Sur iOS, on peut ouvrir les paramètres
                if (Platform.OS === 'ios') {
                  Notifications.requestPermissionsAsync();
                }
              },
            },
            {
              text: 'Plus tard',
              style: 'cancel',
            },
          ],
        );

        await AsyncStorage.setItem(PERMISSIONS_KEY, 'denied');
      }

      setChecked(true);
    } catch (error) {
      logger.error('❌ Erreur vérification permissions:', error);
      setChecked(true);
    }
  };

  // Composant invisible
  return null;
}
