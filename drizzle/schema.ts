import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, decimal } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// SafeWalk Tables

/**
 * Sessions table - Enregistre chaque sortie de l'utilisateur
 */
export const sessions = mysqlTable('sessions', {
  id: varchar('id', { length: 64 }).primaryKey(),
  userId: int('userId').notNull(),
  startTime: timestamp('startTime').defaultNow().notNull(),
  limitTime: timestamp('limitTime').notNull(),
  deadline: timestamp('deadline').notNull(),
  status: mysqlEnum('status', ['active', 'grace', 'overdue', 'returned', 'cancelled']).default('active').notNull(),
  note: text('note'),
  endTime: timestamp('endTime'),
  extensionsCount: int('extensionsCount').default(0).notNull(),
  checkInConfirmed: int('checkInConfirmed').default(0).notNull(),
  checkInConfirmedAt: timestamp('checkInConfirmedAt'),
  alertTriggeredAt: timestamp('alertTriggeredAt'),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
  updatedAt: timestamp('updatedAt').defaultNow().onUpdateNow().notNull(),
});

export type Session = typeof sessions.$inferSelect;
export type InsertSession = typeof sessions.$inferInsert;

/**
 * Positions table - Enregistre les positions GPS capturées
 */
export const positions = mysqlTable('positions', {
  id: varchar('id', { length: 64 }).primaryKey(),
  sessionId: varchar('sessionId', { length: 64 }).notNull(),
  latitude: varchar('latitude', { length: 20 }).notNull(),
  longitude: varchar('longitude', { length: 20 }).notNull(),
  accuracy: varchar('accuracy', { length: 20 }),
  timestamp: timestamp('timestamp').defaultNow().notNull(),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
});

export type Position = typeof positions.$inferSelect;
export type InsertPosition = typeof positions.$inferInsert;

/**
 * SMS Logs table - Enregistre tous les SMS envoyés
 */
export const smsLogs = mysqlTable('smsLogs', {
  id: varchar('id', { length: 64 }).primaryKey(),
  sessionId: varchar('sessionId', { length: 64 }).notNull(),
  phoneNumber: varchar('phoneNumber', { length: 20 }).notNull(),
  message: text('message').notNull(),
  status: mysqlEnum('status', ['pending', 'sent', 'delivered', 'failed']).default('pending').notNull(),
  messageSid: varchar('messageSid', { length: 64 }),
  sentAt: timestamp('sentAt'),
  deliveredAt: timestamp('deliveredAt'),
  failureReason: text('failureReason'),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
  updatedAt: timestamp('updatedAt').defaultNow().onUpdateNow().notNull(),
});

export type SmsLog = typeof smsLogs.$inferSelect;
export type InsertSmsLog = typeof smsLogs.$inferInsert;

/**
 * User Preferences table - Enregistre les préférences de l'utilisateur
 */
export const userPreferences = mysqlTable('userPreferences', {
  id: int('id').autoincrement().primaryKey(),
  userId: int('userId').notNull().unique(),
  firstName: varchar('firstName', { length: 100 }),
  emergencyContact1Name: varchar('emergencyContact1Name', { length: 100 }),
  emergencyContact1Phone: varchar('emergencyContact1Phone', { length: 20 }),
  emergencyContact2Name: varchar('emergencyContact2Name', { length: 100 }),
  emergencyContact2Phone: varchar('emergencyContact2Phone', { length: 20 }),
  locationEnabled: int('locationEnabled').default(0).notNull(),
  notificationsEnabled: int('notificationsEnabled').default(1).notNull(),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
  updatedAt: timestamp('updatedAt').defaultNow().onUpdateNow().notNull(),
});

export type UserPreferences = typeof userPreferences.$inferSelect;
export type InsertUserPreferences = typeof userPreferences.$inferInsert;
