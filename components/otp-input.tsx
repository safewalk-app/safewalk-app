import React, { useRef, useState } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  Pressable,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { cn } from '@/lib/utils';

interface OtpInputProps {
  length?: number;
  value: string;
  onChangeText: (text: string) => void;
  onComplete?: (code: string) => void;
  disabled?: boolean;
  className?: string;
}

/**
 * OTP Input Component
 * Displays 6 input fields for OTP code entry
 * Auto-focuses next field on digit entry
 */
export function OtpInput({
  length = 6,
  value,
  onChangeText,
  onComplete,
  disabled = false,
  className,
}: OtpInputProps) {
  const inputRefs = useRef<(TextInput | null)[]>([]);
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);

  const handleChangeText = (text: string, index: number) => {
    // Only allow digits
    const digit = text.replace(/[^0-9]/g, '');

    if (digit.length > 1) {
      // Handle paste
      const pastedCode = digit.slice(0, length);
      onChangeText(pastedCode);

      // Auto-focus last field
      if (pastedCode.length === length) {
        inputRefs.current[length - 1]?.focus();
        onComplete?.(pastedCode);
      }
      return;
    }

    // Build new code
    const codeArray = value.split('');
    codeArray[index] = digit;
    const newCode = codeArray.join('');

    onChangeText(newCode);

    // Auto-focus next field
    if (digit && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    // Trigger onComplete when all digits entered
    if (newCode.length === length && digit) {
      onComplete?.(newCode);
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !value[index] && index > 0) {
      // Move to previous field on backspace
      inputRefs.current[index - 1]?.focus();
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className={cn('w-full', className)}
    >
      <View className="flex-row justify-center gap-3">
        {Array.from({ length }).map((_, index) => (
          <Pressable
            key={index}
            onPress={() => inputRefs.current[index]?.focus()}
            disabled={disabled}
            className={cn(
              'w-14 h-16 rounded-2xl border-2 items-center justify-center',
              'bg-surface border-border',
              focusedIndex === index && 'border-primary bg-primary/5',
              disabled && 'opacity-50',
            )}
          >
            <TextInput
              ref={(ref) => {
                inputRefs.current[index] = ref;
              }}
              style={styles.input}
              maxLength={1}
              keyboardType="number-pad"
              value={value[index] || ''}
              onChangeText={(text) => handleChangeText(text, index)}
              onKeyPress={(e) => handleKeyPress(e, index)}
              onFocus={() => setFocusedIndex(index)}
              onBlur={() => setFocusedIndex(null)}
              editable={!disabled}
              selectTextOnFocus
              className="text-2xl font-bold text-foreground text-center"
            />
          </Pressable>
        ))}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  input: {
    padding: 0,
    textAlign: 'center',
  },
});
