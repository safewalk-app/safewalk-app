/**
 * SMS Templates Helper
 * Generates dynamic SMS messages for SafeWalk alerts
 * Supports multiple variants based on available data
 */

export interface SmsTemplateParams {
  firstName?: string | null;
  deadline?: string | null;
  lat?: number | null;
  lng?: number | null;
  userPhone?: string | null;
  shareUserPhoneInAlerts?: boolean;
}

/**
 * Validates and formats phone number for SMS
 */
function formatPhoneNumber(phone: string | null | undefined): string | null {
  if (!phone || typeof phone !== 'string') return null;
  
  const cleaned = phone.trim();
  if (!cleaned || cleaned === 'undefined' || cleaned === 'null') return null;
  
  // Basic E.164 validation
  if (!/^\+\d{1,15}$/.test(cleaned)) return null;
  
  return cleaned;
}

/**
 * Generates Google Maps link from coordinates
 */
function generateMapLink(lat: number | null | undefined, lng: number | null | undefined): string | null {
  if (lat === null || lat === undefined || lng === null || lng === undefined) return null;
  if (typeof lat !== 'number' || typeof lng !== 'number') return null;
  
  return `https://maps.google.com/?q=${lat},${lng}`;
}

/**
 * Formats time difference for SMS (e.g., "2h30")
 */
function formatTimeDifference(deadline: string | null | undefined): string {
  if (!deadline) return "quelques heures";
  
  try {
    const now = new Date();
    const deadlineDate = new Date(deadline);
    const diffMs = now.getTime() - deadlineDate.getTime();
    
    if (diffMs < 0) return "quelques heures";
    
    const diffMins = Math.floor(diffMs / 60000);
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    
    if (hours === 0) return `${mins}min`;
    if (mins === 0) return `${hours}h`;
    return `${hours}h${mins}`;
  } catch {
    return "quelques heures";
  }
}

/**
 * Builds late alert SMS with dynamic variants
 * Supports: firstName, phone, position
 */
export function buildLateSms(params: SmsTemplateParams): string {
  const {
    firstName,
    deadline,
    lat,
    lng,
    userPhone,
    shareUserPhoneInAlerts = false,
  } = params;

  const hasFirstName = firstName && firstName.trim() && firstName !== 'undefined' && firstName !== 'null';
  const hasPhone = shareUserPhoneInAlerts && formatPhoneNumber(userPhone);
  const hasPosition = generateMapLink(lat, lng);
  const timeDiff = formatTimeDifference(deadline);

  const personRef = hasFirstName ? firstName.trim() : "la personne";
  const mapLink = generateMapLink(lat, lng);

  // Build the message based on available data
  let message = `SafeWalk : pas de confirmation depuis ${timeDiff}. Essayez de contacter ${personRef}`;

  // Add phone if available
  if (hasPhone) {
    message += ` immédiatement au ${hasPhone}.`;
  } else {
    message += " immédiatement.";
  }

  // Add position if available
  if (mapLink) {
    message += ` Dernière position : ${mapLink}`;
  }

  return message;
}

/**
 * Builds SOS alert SMS with dynamic variants
 * Supports: firstName, phone, position
 */
export function buildSosSms(params: SmsTemplateParams): string {
  const {
    firstName,
    lat,
    lng,
    userPhone,
    shareUserPhoneInAlerts = false,
  } = params;

  const hasFirstName = firstName && firstName.trim() && firstName !== 'undefined' && firstName !== 'null';
  const hasPhone = shareUserPhoneInAlerts && formatPhoneNumber(userPhone);
  const mapLink = generateMapLink(lat, lng);

  let message: string;

  if (hasFirstName) {
    message = `SafeWalk SOS : ${firstName.trim()} a déclenché une alerte urgente. Appelez-le/la maintenant`;
  } else {
    message = `SafeWalk SOS : une alerte urgente a été déclenchée. Appelez la personne maintenant`;
  }

  // Add phone if available
  if (hasPhone) {
    message += ` au ${hasPhone}.`;
  } else {
    message += ".";
  }

  // Add position if available
  if (mapLink) {
    message += ` Dernière position : ${mapLink}`;
  }

  return message;
}

/**
 * Builds test SMS with dynamic variants
 * Supports: firstName
 */
export function buildTestSms(params: SmsTemplateParams): string {
  const { firstName } = params;

  const hasFirstName = firstName && firstName.trim() && firstName !== 'undefined' && firstName !== 'null';

  if (hasFirstName) {
    return `SafeWalk test : tout est bien configuré. Vous recevrez un SMS comme celui-ci si ${firstName.trim()} ne confirme pas son arrivée.`;
  } else {
    return `SafeWalk test : tout est bien configuré. Vous recevrez un SMS comme celui-ci si la personne ne confirme pas son arrivée.`;
  }
}

/**
 * Validates SMS template parameters
 */
export function validateSmsParams(params: SmsTemplateParams): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Validate firstName if provided
  if (params.firstName !== null && params.firstName !== undefined) {
    if (typeof params.firstName !== 'string') {
      errors.push('firstName must be a string');
    }
  }

  // Validate deadline if provided
  if (params.deadline !== null && params.deadline !== undefined) {
    if (typeof params.deadline !== 'string') {
      errors.push('deadline must be a string');
    } else {
      try {
        new Date(params.deadline);
      } catch {
        errors.push('deadline must be a valid ISO date string');
      }
    }
  }

  // Validate coordinates
  if (params.lat !== null && params.lat !== undefined) {
    if (typeof params.lat !== 'number' || isNaN(params.lat)) {
      errors.push('lat must be a valid number');
    }
  }

  if (params.lng !== null && params.lng !== undefined) {
    if (typeof params.lng !== 'number' || isNaN(params.lng)) {
      errors.push('lng must be a valid number');
    }
  }

  // Validate userPhone if provided
  if (params.userPhone !== null && params.userPhone !== undefined) {
    if (typeof params.userPhone !== 'string') {
      errors.push('userPhone must be a string');
    }
  }

  // Validate shareUserPhoneInAlerts
  if (params.shareUserPhoneInAlerts !== undefined) {
    if (typeof params.shareUserPhoneInAlerts !== 'boolean') {
      errors.push('shareUserPhoneInAlerts must be a boolean');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
