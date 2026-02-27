/**
 * PATCH for test-sms Edge Function
 * Adds retry logic, exponential backoff, and proper error handling
 *
 * Apply this patch to test-sms/index.ts
 */

import { ERROR_CODES } from '../_shared/error-codes.ts';

// Add this interface
interface SmsRetryConfig {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

const DEFAULT_RETRY_CONFIG: SmsRetryConfig = {
  maxRetries: 3,
  initialDelayMs: 1000, // 1 second
  maxDelayMs: 30000, // 30 seconds
  backoffMultiplier: 2,
};

// Add this function for retry logic
async function sendSmsWithRetry(
  supabase: any,
  smsLogId: string,
  phoneNumber: string,
  message: string,
  twilioConfig: any,
  retryCount: number = 0,
  config: SmsRetryConfig = DEFAULT_RETRY_CONFIG,
): Promise<{ success: boolean; messageSid?: string; error?: string }> {
  try {
    // Validate phone number format (E.164)
    if (!phoneNumber.match(/^\+[1-9]\d{1,14}$/)) {
      return {
        success: false,
        error: `Invalid phone number format: ${phoneNumber}. Must be E.164 format (+1234567890)`,
      };
    }

    // Send SMS via Twilio
    const response = await fetch(
      'https://api.twilio.com/2010-04-01/Accounts/' + twilioConfig.accountSid + '/Messages.json',
      {
        method: 'POST',
        headers: {
          Authorization: 'Basic ' + btoa(twilioConfig.accountSid + ':' + twilioConfig.authToken),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          From: twilioConfig.fromNumber,
          To: phoneNumber,
          Body: message,
        }).toString(),
      },
    );

    const data = await response.json();

    if (!response.ok) {
      const errorMessage = data.message || 'Unknown Twilio error';

      // Check if error is retryable
      const isRetryable =
        response.status >= 500 || // Server errors
        response.status === 429 || // Rate limit
        errorMessage.includes('temporarily unavailable');

      if (isRetryable && retryCount < config.maxRetries) {
        // Calculate exponential backoff delay
        const delay = Math.min(
          config.initialDelayMs * Math.pow(config.backoffMultiplier, retryCount),
          config.maxDelayMs,
        );

        // Log retry attempt
        await supabase
          .from('sms_logs')
          .update({
            retry_count: retryCount + 1,
            retry_at: new Date(Date.now() + delay).toISOString(),
            status: 'queued',
          })
          .eq('id', smsLogId);

        // Wait and retry
        await new Promise((resolve) => setTimeout(resolve, delay));
        return sendSmsWithRetry(
          supabase,
          smsLogId,
          phoneNumber,
          message,
          twilioConfig,
          retryCount + 1,
          config,
        );
      }

      // Non-retryable error or max retries exceeded
      return {
        success: false,
        error: errorMessage,
      };
    }

    // Success
    return {
      success: true,
      messageSid: data.sid,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // Retry on network errors
    if (retryCount < config.maxRetries) {
      const delay = Math.min(
        config.initialDelayMs * Math.pow(config.backoffMultiplier, retryCount),
        config.maxDelayMs,
      );

      await supabase
        .from('sms_logs')
        .update({
          retry_count: retryCount + 1,
          retry_at: new Date(Date.now() + delay).toISOString(),
          status: 'queued',
        })
        .eq('id', smsLogId);

      await new Promise((resolve) => setTimeout(resolve, delay));
      return sendSmsWithRetry(
        supabase,
        smsLogId,
        phoneNumber,
        message,
        twilioConfig,
        retryCount + 1,
        config,
      );
    }

    return {
      success: false,
      error: errorMessage,
    };
  }
}

// Add this validation function
async function validateUserCanSendTestSms(
  supabase: any,
  userId: string,
): Promise<{ allowed: boolean; error?: string; errorCode?: string }> {
  // 1. Check if user profile exists
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('phone_verified, subscription_active, free_alerts_remaining')
    .eq('id', userId)
    .single();

  if (profileError || !profile) {
    return {
      allowed: false,
      error: 'User profile not found',
      errorCode: ERROR_CODES.CONFIG_ERROR,
    };
  }

  // 2. Check if phone is verified
  if (!profile.phone_verified) {
    return {
      allowed: false,
      error: 'Téléphone non vérifié',
      errorCode: ERROR_CODES.PHONE_NOT_VERIFIED,
    };
  }

  // 3. Check if user has credits or active subscription
  if (!profile.subscription_active && profile.free_alerts_remaining <= 0) {
    return {
      allowed: false,
      error: 'Crédits insuffisants',
      errorCode: ERROR_CODES.NO_CREDITS,
    };
  }

  return { allowed: true };
}

// Usage in main handler:
/*
  // Validate user can send test SMS
  const validation = await validateUserCanSendTestSms(supabase, userId);
  if (!validation.allowed) {
    return new Response(
      JSON.stringify({
        success: false,
        error: validation.error,
        errorCode: validation.errorCode,
      }),
      {
        status: validation.errorCode === ERROR_CODES.NO_CREDITS ? 402 : 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  // Consume credit
  const { data: creditData, error: creditError } = await supabase.rpc(
    "consume_credit",
    { p_user_id: userId, p_type: "test" }
  );

  if (creditError || !creditData?.[0]?.allowed) {
    return new Response(
      JSON.stringify({
        success: false,
        error: creditData?.[0]?.reason || "Failed to consume credit",
        errorCode: creditData?.[0]?.reason || ERROR_CODES.NO_CREDITS,
      }),
      {
        status: 402,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  // Send SMS with retry logic
  const smsResult = await sendSmsWithRetry(
    supabase,
    smsLogId,
    contactPhone,
    "Test SMS from SafeWalk",
    {
      accountSid: twilioAccountSid,
      authToken: twilioAuthToken,
      fromNumber: twilioFromNumber,
    }
  );
*/

export { sendSmsWithRetry, validateUserCanSendTestSms, DEFAULT_RETRY_CONFIG };
