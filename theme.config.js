/** @type {const} */
const themeColors = {
  // Pop Bubble Design System
  primary: { light: '#6C63FF', dark: '#6C63FF' }, // Primary Purple
  secondary: { light: '#3A86FF', dark: '#3A86FF' }, // Primary Blue
  mint: { light: '#2DE2A6', dark: '#2DE2A6' }, // Mint (Success)
  danger: { light: '#DC2626', dark: '#DC2626' }, // Danger Red (plus foncé pour contraste)

  // Text
  foreground: { light: '#0B1220', dark: '#0B1220' }, // Text Dark
  muted: { light: '#6B7280', dark: '#6B7280' }, // Secondary Text

  // Background & Surface
  background: { light: '#F6F7FF', dark: '#F6F7FF' }, // Background with bubbles
  surface: { light: '#FFFFFF', dark: '#FFFFFF' }, // Card surface (translucent)

  // UI Elements
  border: { light: '#E5E7EB', dark: '#E5E7EB' },
  success: { light: '#2DE2A6', dark: '#2DE2A6' },
  warning: { light: '#D97706', dark: '#D97706' }, // Warning (plus foncé pour contraste)
  error: { light: '#DC2626', dark: '#DC2626' }, // Error (plus foncé pour contraste)
};

module.exports = { themeColors };
