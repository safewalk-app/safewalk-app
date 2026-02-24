// Shared Twilio helper for all Edge Functions
// Handles SMS sending with error handling and logging

export interface TwilioConfig {
  accountSid: string;
  authToken: string;
  fromNumber: string;
}

export interface SendSmsOptions {
  to: string;
  message: string;
  config: TwilioConfig;
}

export interface SendSmsResponse {
  success: boolean;
  messageSid?: string;
  error?: string;
  errorCode?: string;
}

/**
 * Send SMS via Twilio API
 * @param options SendSmsOptions with recipient, message, and Twilio config
 * @returns SendSmsResponse with messageSid or error details
 */
export async function sendSms(options: SendSmsOptions): Promise<SendSmsResponse> {
  const { to, message, config } = options;

  try {
    // Validate inputs
    if (!to || !message || !config.accountSid || !config.authToken || !config.fromNumber) {
      return {
        success: false,
        error: 'Missing required parameters',
        errorCode: 'INVALID_PARAMS',
      };
    }

    // Twilio API endpoint
    const url = `https://api.twilio.com/2010-04-01/Accounts/${config.accountSid}/Messages.json`;

    // Prepare form data
    const formData = new URLSearchParams();
    formData.append('From', config.fromNumber);
    formData.append('To', to);
    formData.append('Body', message);

    // Create Basic Auth header
    const auth = btoa(`${config.accountSid}:${config.authToken}`);

    // Send request
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });

    // Parse response
    const data = await response.json() as Record<string, unknown>;

    if (!response.ok) {
      const errorData = data as Record<string, unknown>;
      return {
        success: false,
        error: (errorData.message as string) || 'Twilio API error',
        errorCode: (errorData.code as string) || 'TWILIO_ERROR',
      };
    }

    // Success
    return {
      success: true,
      messageSid: (data.sid as string) || undefined,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      error: errorMessage,
      errorCode: 'TWILIO_EXCEPTION',
    };
  }
}

/**
 * Format phone number for Twilio (E.164 format)
 * @param phone Phone number (with or without +)
 * @returns E.164 formatted phone number
 */
export function formatPhoneNumber(phone: string): string {
  // Remove all non-digit characters
  const cleaned = phone.replace(/\D/g, '');

  // If already starts with country code (11+ digits), prepend +
  if (cleaned.length >= 11) {
    return `+${cleaned}`;
  }

  // If 10 digits (US), prepend +1
  if (cleaned.length === 10) {
    return `+1${cleaned}`;
  }

  // Otherwise assume it's already in correct format or needs manual fix
  return `+${cleaned}`;
}

/**
 * Validate phone number format
 * @param phone Phone number to validate
 * @returns true if valid E.164 format
 */
export function isValidPhoneNumber(phone: string): boolean {
  // E.164 format: +[1-9]{1}[0-9]{1,14}
  const e164Regex = /^\+[1-9]\d{1,14}$/;
  return e164Regex.test(phone);
}

/**
 * Create SMS message for overdue alert
 * @param userName User's name
 * @param deadline Deadline timestamp
 * @param shareLocation Whether location is included
 * @param latitude Last known latitude (if available)
 * @param longitude Last known longitude (if available)
 * @returns SMS message text
 */
export function createOverdueAlertMessage(
  userName: string,
  deadline: Date,
  shareLocation: boolean,
  latitude?: number,
  longitude?: number
): string {
  const timeStr = deadline.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  });

  let message = `🚨 Alerte SafeWalk: ${userName} n'a pas confirmé son retour avant ${timeStr}.`;

  if (shareLocation && latitude !== undefined && longitude !== undefined) {
    message += `\nDernière position: https://maps.google.com/?q=${latitude},${longitude}`;
  }

  message += '\n\nVérifiez son état ou contactez les autorités si nécessaire.';

  return message;
}

/**
 * Create SMS message for test alert
 * @returns SMS message text
 */
export function createTestSmsMessage(): string {
  return '✅ SafeWalk: Ceci est un SMS de test. Votre contact d\'urgence a bien été configuré.';
}

/**
 * Create SMS message for SOS alert
 * @param userName User's name
 * @param shareLocation Whether location is included
 * @param latitude Last known latitude (if available)
 * @param longitude Last known longitude (if available)
 * @returns SMS message text
 */
export function createSosAlertMessage(
  userName: string,
  shareLocation: boolean,
  latitude?: number,
  longitude?: number
): string {
  let message = `🆘 Alerte SOS SafeWalk: ${userName} a déclenché une alerte d'urgence immédiate.`;

  if (shareLocation && latitude !== undefined && longitude !== undefined) {
    message += `\nPosition: https://maps.google.com/?q=${latitude},${longitude}`;
  }

  message += '\n\nContactez immédiatement les autorités si nécessaire.';

  return message;
}
