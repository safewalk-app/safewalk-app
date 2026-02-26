/**
 * Hooks Index with Lazy Loading
 * 
 * Hooks légers: importés directement
 * Hooks lourds: importés à la demande via async functions
 */

// Hooks légers (toujours importés)
export { useAuth } from './use-auth';
export { useColors } from './use-colors';
export { useColorScheme } from './use-color-scheme';
export { useCooldownTimer } from './use-cooldown-timer';

// Hooks lourds (lazy loaded)
export async function getUseDeadlineTimer() {
  const module = await import('./use-deadline-timer');
  return module;
}

export async function getUseReduceMotion() {
  const module = await import('./use-reduce-motion');
  return module;
}

export async function getUsePushNotifications() {
  const module = await import('./use-push-notifications');
  return module;
}

export async function getUseLocationTracking() {
  const module = await import('./use-location-tracking');
  return module;
}

export async function getUseRealTimeLocation() {
  const module = await import('./use-real-time-location');
  return module;
}

export async function getUseNetworkStatus() {
  const module = await import('./use-network-status');
  return module;
}

export async function getUseOtpVerification() {
  const module = await import('./use-otp-verification');
  return module;
}

export async function getUseProfileData() {
  const module = await import('./use-profile-data');
  return module;
}

export async function getUseSos() {
  const module = await import('./use-sos');
  return module;
}

export async function getUseStateAnimation() {
  const module = await import('./use-state-animation');
  return module;
}

export async function getUseNotifications() {
  const module = await import('./use-notifications');
  return module;
}

export async function getUseCheckInNotifications() {
  const module = await import('./use-check-in-notifications');
  return module;
}

export async function getUseLocationPermission() {
  const module = await import('./use-location-permission');
  return module;
}
