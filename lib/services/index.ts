/**
 * Services Index with Lazy Loading
 * 
 * Services légers: importés directement
 * Services lourds: importés à la demande via async functions
 */

// Services légers (toujours importés)
export { apiCall, setAuthToken, getAuthToken, clearAuthToken } from './api-client';
export { validatePhoneNumber } from './phone-validation-service';
export { notify, notifyBlocked, notifyError } from './notification.service';
export { useToast } from '@/lib/context/toast-context';

// Services lourds (lazy loaded)
export async function getTripService() {
  const module = await import('./trip-service');
  return module;
}

export async function getSmsService() {
  const module = await import('./sms-service');
  return module;
}

export async function getErrorMonitoringService() {
  const module = await import('./error-monitoring.service');
  return module;
}

export async function getCacheService() {
  const module = await import('./cache-service');
  return module;
}

export async function getOtpService() {
  const module = await import('./otp-service');
  return module;
}

export async function getStripeService() {
  const module = await import('./stripe-service');
  return module;
}

export async function getPushNotificationService() {
  const module = await import('./push-notification-service');
  return module;
}

export async function getPrivacyService() {
  const module = await import('./privacy-service');
  return module;
}

export async function getQuotaService() {
  const module = await import('./quota-service');
  return module;
}

export async function getSecureTokenService() {
  const module = await import('./secure-token.service');
  return module;
}
