/**
 * SafeWalk Library Exports
 * 
 * This file enables tree-shaking by explicitly exporting only used modules.
 * All imports should be named imports, not default imports.
 */

// Core utilities
export { cn } from './utils';

// Services
export { apiCall, setAuthToken, getAuthToken } from './services/api-client';
export { validatePhoneNumber } from './services/phone-validation-service';
export { startTrip, checkin, extendTrip } from './services/trip-service';
export { sendEmergencySMS, sendFriendlyAlertSMS, sendFollowUpAlertSMS } from './services/sms-service';
export { notify, notifyError, notifySuccess, notifyBlocked } from './services/notification.service';
export { logError, captureException, setUser } from './services/error-monitoring.service';
export { getCached, setCached, invalidateCache } from './services/cache-service';

// Auth
export { saveSessionToken, getSessionToken, clearSessionToken } from './_core/auth';

// Types
export type { Trip, Session, User, Notification } from './types';
