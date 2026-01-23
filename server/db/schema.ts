import {
  pgTable,
  text,
  timestamp,
  integer,
  boolean,
  varchar,
  jsonb,
  index,
} from 'drizzle-orm/pg-core';
import { createId } from '@paralleldrive/cuid2';

/**
 * Sessions table - Représente une sortie SafeWalk
 */
export const sessions = pgTable('sessions', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  userId: text('user_id').notNull(),
  
  // Timing
  limitTime: timestamp('limit_time').notNull(), // Heure de retour prévue
  tolerance: integer('tolerance').notNull(), // Tolérance en millisecondes (ex: 15 min)
  deadline: timestamp('deadline').notNull(), // limitTime + tolerance
  
  // Status
  status: varchar('status', { length: 20 }).notNull().default('active'), // 'active' | 'grace' | 'overdue' | 'completed' | 'cancelled'
  
  // Check-in
  checkInConfirmed: boolean('check_in_confirmed').notNull().default(false),
  checkInConfirmedAt: timestamp('check_in_confirmed_at'),
  
  // Extensions
  extensionsCount: integer('extensions_count').notNull().default(0),
  maxExtensions: integer('max_extensions').notNull().default(3),
  
  // Alerte
  alertTriggeredAt: timestamp('alert_triggered_at'),
  lastLocation: jsonb('last_location'), // { latitude: number, longitude: number }
  
  // Contacts d'urgence
  emergencyContact1Name: varchar('emergency_contact_1_name', { length: 100 }),
  emergencyContact1Phone: varchar('emergency_contact_1_phone', { length: 20 }),
  emergencyContact2Name: varchar('emergency_contact_2_name', { length: 100 }),
  emergencyContact2Phone: varchar('emergency_contact_2_phone', { length: 20 }),
  
  // Métadonnées
  createdAt: timestamp('created_at').notNull().$defaultFn(() => new Date()),
  updatedAt: timestamp('updated_at').notNull().$defaultFn(() => new Date()),
}, (table) => ({
  // Index pour améliorer les performances
  userIdIdx: index('sessions_user_id_idx').on(table.userId),
  statusIdx: index('sessions_status_idx').on(table.status),
  deadlineIdx: index('sessions_deadline_idx').on(table.deadline),
  createdAtIdx: index('sessions_created_at_idx').on(table.createdAt),
  // Index composite pour les requêtes fréquentes (userId + status)
  userIdStatusIdx: index('sessions_user_id_status_idx').on(table.userId, table.status),
}));

/**
 * SMS Status table - Suivi des SMS envoyés
 */
export const smsStatus = pgTable('sms_status', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  sessionId: text('session_id').notNull(),
  
  // Twilio
  messageSid: varchar('message_sid', { length: 100 }).notNull().unique(),
  accountSid: varchar('account_sid', { length: 100 }).notNull(),
  
  // Destinataire
  phoneNumber: varchar('phone_number', { length: 20 }).notNull(),
  contactName: varchar('contact_name', { length: 100 }),
  
  // Contenu
  messageBody: text('message_body').notNull(),
  
  // Status
  status: varchar('status', { length: 20 }).notNull().default('sent'), // 'sent' | 'delivered' | 'failed' | 'undelivered'
  statusUpdatedAt: timestamp('status_updated_at').notNull().$defaultFn(() => new Date()),
  
  // Erreurs
  errorCode: varchar('error_code', { length: 10 }),
  errorMessage: text('error_message'),
  
  // Métadonnées
  createdAt: timestamp('created_at').notNull().$defaultFn(() => new Date()),
  updatedAt: timestamp('updated_at').notNull().$defaultFn(() => new Date()),
}, (table) => ({
  // Index pour améliorer les performances
  sessionIdIdx: index('sms_status_session_id_idx').on(table.sessionId),
  statusIdx: index('sms_status_status_idx').on(table.status),
  createdAtIdx: index('sms_status_created_at_idx').on(table.createdAt),
}));

/**
 * Check-in Notifications table - Suivi des notifications de check-in
 */
export const checkInNotifications = pgTable('check_in_notifications', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  sessionId: text('session_id').notNull(),
  
  // Timing
  scheduledAt: timestamp('scheduled_at').notNull(), // Quand la notif doit être envoyée
  sentAt: timestamp('sent_at'),
  
  // Status
  status: varchar('status', { length: 20 }).notNull().default('pending'), // 'pending' | 'sent' | 'confirmed' | 'expired'
  
  // Réponse
  respondedAt: timestamp('responded_at'),
  response: varchar('response', { length: 20 }), // 'confirmed' | 'extended' | 'none'
  
  // Métadonnées
  createdAt: timestamp('created_at').notNull().$defaultFn(() => new Date()),
  updatedAt: timestamp('updated_at').notNull().$defaultFn(() => new Date()),
}, (table) => ({
  // Index pour améliorer les performances
  sessionIdIdx: index('check_in_notifications_session_id_idx').on(table.sessionId),
  statusIdx: index('check_in_notifications_status_idx').on(table.status),
  scheduledAtIdx: index('check_in_notifications_scheduled_at_idx').on(table.scheduledAt),
}));

/**
 * Alerts table - Historique des alertes
 */
export const alerts = pgTable('alerts', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  sessionId: text('session_id').notNull(),
  
  // Timing
  triggeredAt: timestamp('triggered_at').notNull(),
  
  // Raison
  reason: varchar('reason', { length: 50 }).notNull(), // 'deadline_exceeded' | 'manual_trigger'
  
  // Location
  latitude: varchar('latitude', { length: 20 }),
  longitude: varchar('longitude', { length: 20 }),
  
  // Contacts notifiés
  contactsNotified: jsonb('contacts_notified'), // [{ name, phone, messageSid, status }]
  
  // Status
  status: varchar('status', { length: 20 }).notNull().default('active'), // 'active' | 'acknowledged' | 'cancelled'
  
  // Métadonnées
  createdAt: timestamp('created_at').notNull().$defaultFn(() => new Date()),
  updatedAt: timestamp('updated_at').notNull().$defaultFn(() => new Date()),
}, (table) => ({
  // Index pour améliorer les performances
  sessionIdIdx: index('alerts_session_id_idx').on(table.sessionId),
  statusIdx: index('alerts_status_idx').on(table.status),
  triggeredAtIdx: index('alerts_triggered_at_idx').on(table.triggeredAt),
}));

export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;

export type SmsStatus = typeof smsStatus.$inferSelect;
export type NewSmsStatus = typeof smsStatus.$inferInsert;

export type CheckInNotification = typeof checkInNotifications.$inferSelect;
export type NewCheckInNotification = typeof checkInNotifications.$inferInsert;

export type Alert = typeof alerts.$inferSelect;
export type NewAlert = typeof alerts.$inferInsert;
