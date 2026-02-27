/**
 * Application Constants
 * Centralized constants to avoid duplication across the app
 */

// ===== Timing Constants =====
export const TIMING = {
  // Session timers
  SESSION_DEADLINE_MIN: 15, // minutes
  SESSION_DEADLINE_MAX: 480, // 8 hours in minutes
  SESSION_DEADLINE_DEFAULT: 120, // 2 hours in minutes

  // OTP
  OTP_EXPIRATION: 600, // 10 minutes in seconds
  OTP_MAX_ATTEMPTS: 3,
  OTP_LENGTH: 6,

  // Notifications
  NOTIFICATION_DEBOUNCE: 1000, // 1 second
  NOTIFICATION_THROTTLE: 5000, // 5 seconds

  // Cooldown
  COOLDOWN_DURATION: 30000, // 30 seconds in milliseconds

  // Loading indicators
  LOADING_MIN_DURATION: 300, // 300ms minimum display time
  LOADING_PROGRESS_UPDATE: 100, // Update progress every 100ms
} as const;

// ===== API Constants =====
export const API = {
  BASE_URL: process.env.EXPO_PUBLIC_API_URL || 'http://127.0.0.1:3000',
  TIMEOUT: 30000, // 30 seconds
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000, // 1 second
} as const;

// ===== Supabase Constants =====
export const SUPABASE = {
  URL: 'https://kycuteffcbqizyqlhczc.supabase.co',
  ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '',
} as const;

// ===== Location Constants =====
export const LOCATION = {
  ACCURACY: 10, // meters
  UPDATE_INTERVAL: 5000, // 5 seconds in milliseconds
  TIMEOUT: 10000, // 10 seconds in milliseconds
  ENABLE_HIGH_ACCURACY: true,
} as const;

// ===== Notification Constants =====
export const NOTIFICATIONS = {
  CHANNEL_ID: 'safewalk_alerts',
  CHANNEL_NAME: 'SafeWalk Alerts',
  PRIORITY: 'high' as const,
  SOUND: 'default' as const,
} as const;

// ===== Error Messages =====
export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Erreur réseau. Vérifiez votre connexion.',
  TIMEOUT_ERROR: 'La requête a expiré. Réessayez.',
  INVALID_PHONE: 'Numéro de téléphone invalide.',
  INVALID_OTP: 'Code OTP invalide.',
  OTP_EXPIRED: 'Le code a expiré. Demandez un nouveau code.',
  OTP_MAX_ATTEMPTS: 'Trop de tentatives. Réessayez plus tard.',
  LOCATION_PERMISSION_DENIED: 'Permission de localisation refusée.',
  LOCATION_UNAVAILABLE: 'Localisation indisponible.',
  NOTIFICATION_PERMISSION_DENIED: 'Permission de notification refusée.',
  SESSION_NOT_FOUND: 'Session non trouvée.',
  INVALID_SESSION_STATE: 'État de session invalide.',
  CONTACT_NOT_FOUND: 'Contact non trouvé.',
  INSUFFICIENT_CREDITS: 'Crédits insuffisants.',
} as const;

// ===== Success Messages =====
export const SUCCESS_MESSAGES = {
  OTP_SENT: 'Code envoyé par SMS.',
  OTP_VERIFIED: 'Numéro vérifié avec succès.',
  SESSION_STARTED: 'Sortie démarrée.',
  SESSION_COMPLETED: 'Sortie terminée.',
  SESSION_EXTENDED: 'Sortie prolongée.',
  CONTACT_ADDED: 'Contact ajouté.',
  CONTACT_REMOVED: 'Contact supprimé.',
  SETTINGS_SAVED: 'Paramètres enregistrés.',
} as const;

// ===== Validation Constants =====
export const VALIDATION = {
  PHONE_REGEX: /^\+?[1-9]\d{1,14}$/, // E.164 format
  OTP_REGEX: /^\d{6}$/, // 6 digits
  EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, // Basic email validation
  MIN_PASSWORD_LENGTH: 8,
  MAX_PHONE_LENGTH: 15,
} as const;

// ===== UI Constants =====
export const UI = {
  ANIMATION_DURATION: 300, // milliseconds
  TRANSITION_DURATION: 200, // milliseconds
  BORDER_RADIUS: 12, // pixels
  SPACING_UNIT: 8, // pixels (base unit for spacing)
} as const;

// ===== Storage Keys =====
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'auth_token',
  REFRESH_TOKEN: 'refresh_token',
  USER_ID: 'user_id',
  PHONE_NUMBER: 'phone_number',
  OTP_STATE: 'otp_state',
  SESSION_STATE: 'session_state',
  SETTINGS: 'app_settings',
  CONTACTS: 'emergency_contacts',
  DEVICE_ID: 'device_id',
  LAST_LOCATION: 'last_location',
} as const;

// ===== Feature Flags =====
export const FEATURE_FLAGS = {
  ENABLE_OTP: true,
  ENABLE_BIOMETRIC_AUTH: true,
  ENABLE_DEVICE_BINDING: true,
  ENABLE_TOKEN_ROTATION: true,
  ENABLE_CERTIFICATE_PINNING: true,
  ENABLE_ANALYTICS: false, // Set to true when analytics is ready
  ENABLE_CRASH_REPORTING: false, // Set to true when crash reporting is ready
} as const;

// ===== Deep Links =====
export const DEEP_LINKS = {
  SCHEME: 'manus20250119065400',
  HOME: 'safewalk://home',
  SESSION: 'safewalk://session',
  SETTINGS: 'safewalk://settings',
  ALERT: 'safewalk://alert',
} as const;

// ===== Permissions =====
export const PERMISSIONS = {
  LOCATION: 'location',
  NOTIFICATIONS: 'notifications',
  CAMERA: 'camera',
  CONTACTS: 'contacts',
} as const;

// ===== Rate Limits =====
export const RATE_LIMITS = {
  OTP_SEND_PER_HOUR: 5,
  OTP_VERIFY_PER_HOUR: 15,
  API_CALLS_PER_MINUTE: 60,
} as const;
