import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  Pressable,
  Modal,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { MaterialIcons } from '@expo/vector-icons';
import { useColors } from '@/hooks/use-colors';
import { CushionPillButton } from './cushion-pill-button';

interface TimeLimitPickerProps {
  selectedTime: number; // timestamp
  onTimeSelected: (timestamp: number) => void;
}

export function TimeLimitPicker({
  selectedTime,
  onTimeSelected,
}: TimeLimitPickerProps) {
  const colors = useColors();
  const [showPicker, setShowPicker] = useState(false);
  const [tempDate, setTempDate] = useState(new Date(selectedTime));
  const [selectedDay, setSelectedDay] = useState<'today' | 'tomorrow'>('today');

  const handleDateChange = (event: any, selectedDate?: Date) => {
    if (selectedDate) {
      setTempDate(selectedDate);
    }
  };

  // Calculer la date finale avec clarté
  const finalDatePreview = useMemo(() => {
    const now = new Date();
    let previewDate = new Date(tempDate);

    if (selectedDay === 'today') {
      previewDate = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        tempDate.getHours(),
        tempDate.getMinutes()
      );

      // Vérifier si l'heure est passée
      if (previewDate < now) {
        previewDate.setDate(previewDate.getDate() + 1);
      }
    } else {
      // Demain
      previewDate = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() + 1,
        tempDate.getHours(),
        tempDate.getMinutes()
      );
    }

    return previewDate;
  }, [selectedDay, tempDate]);

  // Déterminer si le jour a changé automatiquement
  const dayChanged = useMemo(() => {
    const now = new Date();
    const selectedDateOnly = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      tempDate.getHours(),
      tempDate.getMinutes()
    );
    return selectedDay === 'today' && selectedDateOnly < now;
  }, [selectedDay, tempDate]);

  const handleValidate = () => {
    onTimeSelected(finalDatePreview.getTime());
    setShowPicker(false);
  };

  const timeStr = new Date(selectedTime).toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  });

  // Formater la date affichée
  const displayDateStr = finalDatePreview.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  return (
    <>
      {/* Card affichage */}
      <Pressable
        onPress={() => setShowPicker(true)}
        style={({ pressed }) => [
          {
            backgroundColor: colors.surface,
            borderRadius: 28,
            padding: 16,
            opacity: pressed ? 0.8 : 1,
          },
        ]}
      >
        <View className="flex-row items-center justify-between">
          <View className="flex-1">
            <Text
              style={{ color: colors.muted }}
              className="text-sm font-medium mb-2"
            >
              Heure limite
            </Text>
            <Text
              style={{ color: colors.foreground }}
              className="text-4xl font-bold"
            >
              {timeStr}
            </Text>
            <Text
              style={{ color: colors.muted }}
              className="text-xs font-medium mt-2"
            >
              {displayDateStr}
            </Text>
          </View>
          <MaterialIcons name="edit" size={24} color={colors.primary} />
        </View>
      </Pressable>

      {/* BottomSheet Modal */}
      <Modal
        visible={showPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPicker(false)}
      >
        <SafeAreaView
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }}
        >
          <Pressable
            style={{ flex: 1 }}
            onPress={() => setShowPicker(false)}
          />

          <View
            style={{
              backgroundColor: colors.background,
              borderTopLeftRadius: 32,
              borderTopRightRadius: 32,
              paddingHorizontal: 16,
              paddingTop: 20,
              paddingBottom: 24,
            }}
          >
            {/* Titre */}
            <Text
              style={{ color: colors.foreground }}
              className="text-2xl font-bold mb-6 text-center"
            >
              Choisir l'heure limite
            </Text>

            {/* Pills Aujourd'hui / Demain */}
            <View className="flex-row gap-3 mb-6">
              <Pressable
                onPress={() => setSelectedDay('today')}
                style={({ pressed }) => [
                  {
                    flex: 1,
                    paddingVertical: 10,
                    paddingHorizontal: 16,
                    borderRadius: 20,
                    backgroundColor:
                      selectedDay === 'today' ? colors.primary : colors.surface,
                    opacity: pressed ? 0.8 : 1,
                  },
                ]}
              >
                <Text
                  style={{
                    color:
                      selectedDay === 'today'
                        ? '#ffffff'
                        : colors.foreground,
                  }}
                  className="text-center font-semibold"
                >
                  Aujourd'hui
                </Text>
              </Pressable>

              <Pressable
                onPress={() => setSelectedDay('tomorrow')}
                style={({ pressed }) => [
                  {
                    flex: 1,
                    paddingVertical: 10,
                    paddingHorizontal: 16,
                    borderRadius: 20,
                    backgroundColor:
                      selectedDay === 'tomorrow' ? colors.primary : colors.surface,
                    opacity: pressed ? 0.8 : 1,
                  },
                ]}
              >
                <Text
                  style={{
                    color:
                      selectedDay === 'tomorrow'
                        ? '#ffffff'
                        : colors.foreground,
                  }}
                  className="text-center font-semibold"
                >
                  Demain
                </Text>
              </Pressable>
            </View>

            {/* DateTimePicker */}
            <View className="mb-6">
              <DateTimePicker
                value={tempDate}
                mode="time"
                display="spinner"
                onChange={handleDateChange}
                minuteInterval={5}
                textColor={colors.foreground}
              />
            </View>

            {/* Avertissement si le jour a changé */}
            {dayChanged && (
              <View
                style={{
                  backgroundColor: 'rgba(255, 193, 7, 0.1)',
                  borderLeftColor: '#FFC107',
                  borderLeftWidth: 4,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  borderRadius: 8,
                  marginBottom: 16,
                }}
              >
                <Text
                  style={{ color: '#F59E0B' }}
                  className="text-sm font-semibold"
                >
                  ⚠️ Cette heure est passée, le jour a changé à demain
                </Text>
              </View>
            )}

            {/* Prévisualisation de la date/heure finale */}
            <View
              style={{
                backgroundColor: colors.surface,
                paddingHorizontal: 12,
                paddingVertical: 10,
                borderRadius: 8,
                marginBottom: 16,
              }}
            >
              <Text
                style={{ color: colors.muted }}
                className="text-xs font-medium mb-1"
              >
                Vous rentrerez à :
              </Text>
              <Text
                style={{ color: colors.foreground }}
                className="text-lg font-bold"
              >
                {finalDatePreview.toLocaleTimeString('fr-FR', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}{' '}
                {finalDatePreview.toLocaleDateString('fr-FR', {
                  weekday: 'short',
                  day: 'numeric',
                  month: 'short',
                })}
              </Text>
            </View>

            {/* Bouton Valider */}
            <CushionPillButton
              label="Valider"
              onPress={handleValidate}
              variant="primary"
              size="lg"
            />
          </View>
        </SafeAreaView>
      </Modal>
    </>
  );
}
