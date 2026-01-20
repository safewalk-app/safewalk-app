import { View, Text, Pressable, Modal } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { CushionPillButton } from './cushion-pill-button';

interface CheckInModalProps {
  visible: boolean;
  onConfirmCheckIn: () => void;
  onAddTime: () => void;
  onClose: () => void;
}

export function CheckInModal({
  visible,
  onConfirmCheckIn,
  onAddTime,
  onClose,
}: CheckInModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      {/* Overlay */}
      <Pressable
        className="flex-1 bg-black/50"
        onPress={onClose}
      />

      {/* Bottom Sheet */}
      <View className="bg-background rounded-t-3xl p-6 gap-4">
        {/* Header */}
        <View className="gap-2 mb-2">
          <View className="flex-row items-center gap-2">
            <MaterialIcons name="check-circle" size={24} color="#2DE2A6" />
            <Text className="text-2xl font-bold text-foreground">
              Tout va bien ?
            </Text>
          </View>
          <Text className="text-base text-muted">
            Confirme que tu vas bien ou ajoute 15 minutes
          </Text>
        </View>

        {/* Actions */}
        <View className="gap-3">
          {/* Confirm Check-In Button */}
          <CushionPillButton
            label="Je vais bien ✅"
            onPress={onConfirmCheckIn}
            variant="success"
            size="lg"
          />

          {/* Add Time Button */}
          <CushionPillButton
            label="+ 15 min"
            onPress={onAddTime}
            variant="secondary"
            size="lg"
          />

          {/* Close Button */}
          <Pressable onPress={onClose}>
            {({ pressed }) => (
              <View
                className="py-3 items-center"
                style={{ opacity: pressed ? 0.6 : 1 }}
              >
                <Text className="text-base font-semibold text-muted">
                  Fermer
                </Text>
              </View>
            )}
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
