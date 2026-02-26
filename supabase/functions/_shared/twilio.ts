// Shared Twilio helper for all Edge Functions
// Handles SMS sending with error handling, logging, and retry logic

export interface TwilioConfig {
  accountSid: string;
  authToken: string;
  fromNumber: string;
}

export interface SendSmsOptions {
  to: string;
  message: string;
  config: TwilioConfig;
  maxRetries?: number; // Default: 3
  initialDelayMs?: number; // Default: 1000ms
}

export interface SendSmsResponse {
  success: boolean;
  messageSid?: string;
  error?: string;
  errorCode?: string;
  retryCount?: number;
  lastAttemptTime?: number;
}

/**
 * Exponential backoff delay calculator
 * @param attempt Attempt number (0-based)
 * @param initialDelayMs Initial delay in milliseconds
 * @returns Delay in milliseconds with jitter
 */
export function calculateBackoffDelay(attempt: number, initialDelayMs: number = 1000): number {
  // Exponential: 1s, 2s, 4s, 8s, etc.
  const exponentialDelay = initialDelayMs * Math.pow(2, attempt);
  
  // Add jitter (±10%) to prevent thundering herd
  const jitter = exponentialDelay * 0.1 * (Math.random() * 2 - 1);
  
  return Math.max(100, exponentialDelay + jitter);
}

/**
 * Sleep utility for delays
 * @param ms Milliseconds to sleep
 */
export async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Check if error is retryable
 * @param statusCode HTTP status code
 * @param errorCode Twilio error code
 * @returns true if error is temporary and should be retried
 */
export function isRetryableError(statusCode: number, errorCode?: string): boolean {
  // Retry on network/server errors
  if (statusCode >= 500) return true; // 5xx server errors
  if (statusCode === 429) return true; // Rate limited
  if (statusCode === 408) return true; // Request timeout
  if (statusCode === 503) return true; // Service unavailable
  
  // Don't retry on client errors (4xx) except those above
  if (statusCode >= 400 && statusCode < 500) return false;
  
  // Retry on specific Twilio error codes
  const retryableErrorCodes = [
    'TWILIO_EXCEPTION', // Network error
    'CONNECTION_ERROR',
    'TIMEOUT',
  ];
  
  return retryableErrorCodes.includes(errorCode || '');
}

/**
 * Send SMS via Twilio API with retry logic
 * @param options SendSmsOptions with recipient, message, and Twilio config
 * @returns SendSmsResponse with messageSid or error details
 */
export async function sendSms(options: SendSmsOptions): Promise<SendSmsResponse> {
  const { to, message, config, maxRetries = 3, initialDelayMs = 1000 } = options;
  
  let lastError: SendSmsResponse = {
    success: false,
    error: 'Unknown error',
    errorCode: 'UNKNOWN',
  };

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Validate inputs
      if (!to || !message || !config.accountSid || !config.authToken || !config.fromNumber) {
        return {
          success: false,
          error: 'Missing required parameters',
          errorCode: 'INVALID_PARAMS',
          retryCount: attempt,
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
        const errorCode = (errorData.code as string) || 'TWILIO_ERROR';
        
        lastError = {
          success: false,
          error: (errorData.message as string) || 'Twilio API error',
          errorCode,
          retryCount: attempt,
          lastAttemptTime: Date.now(),
        };

        // Check if error is retryable
        if (isRetryableError(response.status, errorCode) && attempt < maxRetries) {
          const delayMs = calculateBackoffDelay(attempt, initialDelayMs);
          console.warn(`[Twilio] Attempt ${attempt + 1}/${maxRetries + 1} failed (${response.status}), retrying in ${delayMs}ms...`);
          await sleep(delayMs);
          continue;
        }

        // Non-retryable error or max retries reached
        return lastError;
      }

      // Success
      return {
        success: true,
        messageSid: (data.sid as string) || undefined,
        retryCount: attempt,
        lastAttemptTime: Date.now(),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      lastError = {
        success: false,
        error: errorMessage,
        errorCode: 'TWILIO_EXCEPTION',
        retryCount: attempt,
        lastAttemptTime: Date.now(),
      };

      // Retry on network errors
      if (attempt < maxRetries) {
        const delayMs = calculateBackoffDelay(attempt, initialDelayMs);
        console.warn(`[Twilio] Attempt ${attempt + 1}/${maxRetries + 1} failed (network error), retrying in ${delayMs}ms...`);
        await sleep(delayMs);
        continue;
      }

      return lastError;
    }
  }

  return lastError;
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
