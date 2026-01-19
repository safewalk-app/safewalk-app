import React, { useState } from 'react';
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

  const handleValidate = () => {
    const now = new Date();
    let finalDate = new Date(tempDate);

    // Construire la date avec l'heure sélectionnée
    if (selectedDay === 'today') {
      finalDate = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        tempDate.getHours(),
        tempDate.getMinutes()
      );

      // Si l'heure est passée, passer à demain
      if (finalDate < now) {
        finalDate.setDate(finalDate.getDate() + 1);
      }
    } else {
      // Demain
      finalDate = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() + 1,
        tempDate.getHours(),
        tempDate.getMinutes()
      );
    }

    onTimeSelected(finalDate.getTime());
    setShowPicker(false);
  };

  const timeStr = new Date(selectedTime).toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
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
