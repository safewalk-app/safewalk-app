import React from 'react';
import { View, TextInput, Text } from 'react-native';
import { GlassCard } from './glass-card';
import { cn } from '@/lib/utils';

export interface PopTextFieldProps {
  label?: string;
  placeholder?: string;
  value?: string;
  onChangeText?: (text: string) => void;
  editable?: boolean;
  multiline?: boolean;
  numberOfLines?: number;
  keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad';
  helperText?: string;
  error?: boolean;
}

/**
 * PopTextField - Champ texte stylisé avec GlassCard
 * Utilisé pour prénom, contact, localisation, etc.
 */
export function PopTextField({
  label,
  placeholder,
  value,
  onChangeText,
  editable = true,
  multiline = false,
  numberOfLines = 1,
  keyboardType = 'default',
  helperText,
  error = false,
}: PopTextFieldProps) {
  return (
    <View className="gap-2">
      {label && <Text className="text-sm font-semibold text-foreground">{label}</Text>}

      <GlassCard className="p-3">
        <TextInput
          placeholder={placeholder}
          placeholderTextColor="#9CA3AF"
          value={value}
          onChangeText={onChangeText}
          editable={editable}
          multiline={multiline}
          numberOfLines={numberOfLines}
          keyboardType={keyboardType}
          className={cn('text-base text-foreground', !editable && 'opacity-60')}
          style={{
            color: '#0B1220',
            fontSize: 16,
            fontFamily: 'System',
          }}
        />
      </GlassCard>

      {helperText && (
        <Text className={cn('text-xs', error ? 'text-danger' : 'text-muted')}>{helperText}</Text>
      )}
    </View>
  );
}
